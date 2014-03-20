//////////////////////////////////////////
// Needle -- Node.js HTTP Client
// Written by Tomás Pollak <tomas@forkhq.com>
// (c) 2012-2013 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var fs          = require('fs'),
    http        = require('http'),
    https       = require('https'),
    url         = require('url'),
    Stream      = require('stream'),
    stringify   = require('qs').stringify,
    multipart   = require('./multipart'),
    auth        = require('./auth'),
    assert      = require('assert');

//////////////////////////////////////////
// variabilia
//////////////////////////////////////////

var version     = JSON.parse(fs.readFileSync(__dirname + '/../package.json').toString()).version,
    debugging   = !!process.env.DEBUG;

var user_agent = 'Needle/' + version;
user_agent    += ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

var node_tls_opts = 'agent pfx key passphrase cert ca ciphers rejectUnauthorized secureProtocol';

var debug = function(str, obj) {
  if (debugging)
    if (obj)
      console.log(str, obj);
    else
      console.log(str);
}

//////////////////////////////////////////
// decompressors mappings for content-encoding
//////////////////////////////////////////
var decompressors = {};
try {
  var zlib = require('zlib') 

  decompressors['deflate'] = zlib.Inflate;
  decompressors['gzip']    = zlib.Gunzip;

} catch(e) { /* zlib not available */ }


//////////////////////////////////////////
// buffering stream class for our parsers
//////////////////////////////////////////

function parserFactory (fn) {
  return function () {
      var chunks = []
      var stream = new Stream.Transform({objectMode: true});
    
      // Buffer all our data
      stream._transform = function (chunk, encoding, done) {
          assert.ok(Buffer.isBuffer(chunk))
          chunks.push(chunk)
          done()
      },
      
      // And flush our tree..
      stream._flush = function (done) {
          var self = this;
          var data = Buffer.concat(chunks)
          
          try {
              fn(data,function(err, result) {
                  if (err) throw err
                  
                  self.push(result);
              });
              
          } catch (err) {
              // If we were unable to parse, instead of bailing out, just pass the
              // original unparsed data.
              debug('Error while parsing: ', err)
              self.push(data);
          } finally {
              done();
          }
      }
      
      return stream;
  }
}

//////////////////////////////////////////
// content type parsers
//////////////////////////////////////////

var parsers = {};

parsers['application/json'] = parserFactory(function (buffer, callback) {
  var err, data;

  try {
    data = JSON.parse(buffer)
  } catch (e) {
    err = e;
  }

  callback(err, data);
});

parsers['text/javascript'] = parsers['application/json'];

try {
  var xml2js = require('xml2js');

  // xml2js.Parser.parseString() has the exact same function signature as our ParseStream
  // expects, so we can reuse this.
  parsers['application/xml'] = 
        parserFactory(new xml2js.Parser({ 
          explicitRoot: true, 
          explicitArray: false 
        }).parseString);

  parsers['text/xml'] = parsers['application/xml'];
  parsers['application/rss+xml'] = parsers['application/xml'];
} catch(e) { /* xml2js not found */ }

//////////////////////////////////////////
// defaults
//////////////////////////////////////////

var defaults = {
  accept          : '*/*',
  connection      : 'close',
  user_agent      : user_agent,
  follow          : 0,
  decode_response : true,
  parse_response  : true,
  timeout         : 10000,
  encoding        : 'utf8',
  boundary        : '--------------------NODENEEDLEHTTPCLIENT'
}

//////////////////////////////////////////
// the main act
//////////////////////////////////////////

var Needle = {

  request: function(method, uri, data, options, callback) {

    var self     = this;
    var callback = (typeof options == 'function') ? options : callback;
    var options  = options || {};

    // if no 'http' is found on URL, prepend it
    if (uri.indexOf('http') == -1) uri = 'http://' + uri;

    var config = {
      base_opts       : {},
      proxy           : options.proxy,
      output          : options.output,
      encoding        : options.encoding || (options.multipart ? 'binary' : defaults.encoding),
      decode_response : options.decode === false ? false : defaults.decode_response,
      parse_response  : options.parse === false ? false : defaults.parse_response,
      follow          : options.follow === true ? 10 : typeof options.follow == 'number' ? options.follow : defaults.follow,
      timeout         : (typeof options.timeout == 'number') ? options.timeout : defaults.timeout
    }

    // if any of node's TLS options are passed, let them be passed to https.request()
    node_tls_opts.split(' ').forEach(function(key) {
      if (typeof options[key] != 'undefined') {
        config.base_opts[key] = options[key];
        if (typeof options.agent == 'undefined')
          config.base_opts.agent = false; // otherwise tls options are skipped
      }
    });

    config.headers = {
      'Accept'     : options.accept     || defaults.accept,
      'Connection' : options.connection || defaults.connection,
      'User-Agent' : options.user_agent || defaults.user_agent
    }

    if (options.compressed && typeof unzip != 'undefined')
      config.headers['Accept-Encoding'] = 'gzip,deflate';

    for (var h in options.headers)
      config.headers[h] = options.headers[h];

    if (options.username && options.password) {
      if (options.auth && (options.auth == 'auto' || options.auth == 'digest')) {
        config.credentials = [options.username, options.password];
      } else {
        var auth_header = options.proxy ? 'Proxy-Authorization' : 'Authorization';
        config.headers[auth_header] = auth.basic(options.username, options.password);
      }
    }

    if (data) {
      if (options.multipart) {
        var boundary = options.boundary || defaults.boundary;
        return multipart.build(data, boundary, function(err, body) {
          if (err) throw(err);
          config.headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
          config.headers['Content-Length'] = body.length;
          self.send_request(1, method, uri, config, body, callback);
        });

      } else {
        var post_data = (typeof(data) === 'string') ? data :
            options.json ? JSON.stringify(data) : stringify(data);

        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = options.json
          ? 'application/json'
          : 'application/x-www-form-urlencoded';
        }

        post_data = new Buffer(post_data, config.encoding)
        config.headers['Content-Length'] = post_data.length;
      }
    }

    return this.send_request(1, method, uri, config, post_data, callback);
  },

  get_request_opts: function(method, uri, config) {
    var opts      = config.base_opts, proxy = config.proxy;
    var remote    = proxy ? url.parse(proxy) : url.parse(uri);

    opts.protocol = remote.protocol;
    opts.host     = remote.hostname;
    opts.port     = remote.port || (remote.protocol == 'https:' ? 443 : 80);
    opts.path     = proxy ? uri : remote.pathname + (remote.search || '');
    opts.method   = method;
    opts.headers  = config.headers;
    opts.headers['Host'] = proxy ? url.parse(uri).hostname : remote.hostname;
    if (opts.port != 80 && opts.port != 443) opts.headers['Host'] += ':' + opts.port;

    return opts;
  },

  get_auth_header: function(header, credentials, request_opts) {
    var type = header.split(' ')[0],
        user = credentials[0],
        pass = credentials[1];

    if (type == 'Digest') {
      return auth.digest(header, user, pass, request_opts.method, request_opts.path);
    } else if (type == 'Basic') {
      return auth.basic(user, pass);
    }
  },

  send_request: function(count, method, uri, config, post_data, callback) {

    var timer,
        self = this,
        request_opts = this.get_request_opts(method, uri, config),
        protocol = request_opts.protocol == 'https:' ? https : http,
        i_am_stream = (callback ? false : true);

    // config.out is where all our body is streamed twards
    //
    // FIXME: set objectMode: true only when we're using a parser that emits
    // objects -- buffer/strings are far more performant that way.
    config.out = config.out || new Stream.PassThrough({objectMode: true, allowHalfOpen: false})

    debug('Making request #' + count, request_opts);
    var request = protocol.request(request_opts, function(resp) {

      var headers = resp.headers;
      debug('Got response', headers);
      if (timer) clearTimeout(timer);

      // if redirect code is found, send a GET request to that location if enabled via 'follow' option
      if ([301, 302].indexOf(resp.statusCode) != -1 && headers.location) {
        if (count <= config.follow)
          return self.send_request(++count, 'GET', url.resolve(uri, headers.location), config, null, callback);
        else if (config.follow > 0)
          return callback(new Error('Max redirects reached. Possible loop in: ' + headers.location));
      }

      // if authentication is requested and credentials were not passed, resend request if we have user/pass
      if (resp.statusCode == 401 && headers['www-authenticate'] && config.credentials) {
        if (!config.headers['Authorization']) { // only if authentication hasn't been sent
          var auth_header = self.get_auth_header(headers['www-authenticate'], config.credentials, request_opts);

          if (auth_header) {
            config.headers['Authorization'] = auth_header;
            return self.send_request(count, method, uri, config, post_data, callback);
          }
        }
      }

      var length = 0,
          mime = self.parse_content_type(headers['content-type']);

      var response_opts = {
        output       : config.output,
        parse        : config.parse_response, // parse XML or JSON
        content_type : mime.type,
        text         : mime.type && mime.type.indexOf('text/') != -1,
        charset      : mime.charset
      }

      if (response_opts.text)
        response_opts.decode = config.decode_response; // only allow iconv decoding on text bodies

      // `resp` at this point is our stream with raw body data coming over
      // the write. Let's initialize our streams pipiline to have the eventual
      // destination `config.out`.
      var pipeline = [];

      // First of all, if our body is compressed and we are able to decompress it,
      // decompress it.
      if (headers['content-encoding'] && decompressors[headers['content-encoding']]) {
        pipeline.push(decompressors[headers['content-encoding']]());
      }
      
      // Parsing the 'content-type' (xml, json, whatever) is one of the last
      // things we should do.
      if (response_opts.parse && parsers[response_opts.content_type]) {
        pipeline.push(parsers[response_opts.content_type]())

      } else {
        // If charset is not UTF-8 and the users wants to decode, decode. Note
        // that this is mutually exclusive with parsing JSON/XML/etc.
        if (response_opts.decode && opts.charset && !response_opts.charset.match(/utf-?8$/i)) {
          // TODO: in case of error, this emits 'error' on the stream -- is this
          // what we want?
          try {
            pipeline.push(require('iconv').Iconv('UTF-8', response_opts.charset))
          } catch (err) {
            // iconv library wasn't installed, do not do any decoding
            debug('iconv not installed!')
          }
        }
      }

      // And config.out is the stream we eventually push our sanitized body data to.
      pipeline.push(config.out)

      while (pipeline.length) {
        resp = resp.pipe(pipeline.shift())
      }

      // If the user has requested that we should write the data to a file, pipe the
      // output stream to this file stream.
      //
      // Note: since we do not make this part of the `pipeline` above, the user will still
      // receive all the response data, we just sniff on the stream and write the file.   
      //
      // :FIXME: does this belong here anyway? Isn't it sufficient to let the end-user
      // do a needle.get(url).pipe(fs.createWriteStream()) ?
      if (response_opts.output && resp.statusCode == 200) {
        resp.pipe(fs.createWriteStream(response_opts.output))
      }

      // Since we do not know whether our underlying streams all behave properly,
      // let's fix it no matter what. This also has the added advantage that we will
      // not expose a witable stream to the end user.
      config.out = new Stream.Readable().wrap(config.out);

      resp.body = []


      // We do not want to aggregate the body contents if we are a stream, for performance
      // and scalability reasons.
      if (i_am_stream == false) {

        // Ah, but a callback has been requested, with all our data. Let's first aggregate
        // incoming data from the stream...
        config.out.on('readable', function () {
          while (chunk = this.read()) {
            // We're either pushing buffers or objects, never strings.
            if (typeof chunk == 'String') chunk = new Buffer(chunk)

            // What we will do here is simply make resp.body a mapping of all
            // our chunks. Later, in resp.end(), we reduce this to a single buffer.
            resp.body.push(chunk);
          }
        })

        // And set the .body property once all data is in.
        config.out.on('end', function () {
          // If our body is a string (Buffer), we need to merge those into one big buffer.
          if (resp.body.length != 0 && Buffer.isBuffer(resp.body[0])) {
            resp.body = Buffer.concat(resp.body);
          } else if (resp.body.length == 1) {
            assert(Buffer.isBuffer(resp.body[0]) == false, 'Internal error: body should be an array of objects, is a buffer?')
            // Do not treat body as an array when we have only one object
            resp.body = resp.body[0]
          }

          // :TODO: This doesn't make sense if resp.body is an array of objects.  
          resp.bytes = resp.body.length;
        });

      };
    });

    // unless timeout was disabled, set a timeout to abort the request
    if (config.timeout > 0) {
      timer = setTimeout(function() {
        request.abort();
      }, config.timeout)
    }

    request.on('error', function(err) {
      debug('Request error', err);
      if (timer) clearTimeout(timer);
      if (callback) callback(err || new Error('Unknown error when making request.'));
    });

    if (post_data) request.write(post_data, config.encoding);
    request.end();

    return (i_am_stream ? config.out : request);
    
  },

  parse_content_type: function(header) {
    if (!header || header == '') return {};

    var charset = 'iso-8859-1', arr = header.split(';');
    try { charset = arr[1].match(/charset=(.+)/)[1] } catch (e) { /* not found */ }

    return { type: arr[0], charset: charset };
  },
}

exports.version = version;

exports.defaults = function(obj) {
  for (var key in obj) {
    if (defaults[key] && typeof obj[key] != 'undefined')
      defaults[key] = obj[key];
  }
  return defaults;
}

'head get'.split(' ').forEach(function(method) {
  exports[method] = function(uri, options, callback) {
    return Needle.request(method, uri, null, options, callback);
  }
})

'post put delete'.split(' ').forEach(function(method) {
  exports[method] = function(uri, data, options, callback) {
    return Needle.request(method, uri, data, options, callback);
  }
})

exports.request = function(method, uri, data, opts, callback) {
  return Needle.request(method.toUpperCase(), uri, data, opts, callback);
};
