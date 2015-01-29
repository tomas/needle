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
    stream      = require('stream'),
    stringify   = require('./querystring').build,
    multipart   = require('./multipart'),
    auth        = require('./auth'),
    parsers     = require('./parsers'),
    decoder     = require('./decoder');

//////////////////////////////////////////
// variabilia
//////////////////////////////////////////

var version     = JSON.parse(fs.readFileSync(__dirname + '/../package.json').toString()).version,
    debugging   = !!process.env.DEBUG,
    debug       = debugging ? console.log : function() { /* noop */ };

var user_agent  = 'Needle/' + version;
user_agent     += ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

var node_tls_opts = 'agent pfx key passphrase cert ca ciphers rejectUnauthorized secureProtocol';

//////////////////////////////////////////
// decompressors for gzip/deflate bodies
//////////////////////////////////////////

var decompressors = {};

try {

  var zlib = require('zlib')

  decompressors['x-deflate'] = zlib.Inflate;
  decompressors['deflate']   = zlib.Inflate;
  decompressors['x-gzip']    = zlib.Gunzip;
  decompressors['gzip']      = zlib.Gunzip;

} catch(e) { /* zlib not available */ }

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
  compressed      : false,
  timeout         : 10000,
  encoding        : 'utf8',
  boundary        : '--------------------NODENEEDLEHTTPCLIENT'
}

//////////////////////////////////////////
// the main act
//////////////////////////////////////////

var Needle = {

  request: function(method, uri, data, options, callback) {

    var self     = this,
        out      = new stream.PassThrough({ objectMode: false }),
        callback = (typeof options == 'function') ? options : callback,
        options  = options || {};

    // uri checks and parsing
    if (typeof uri !== 'string')
      throw new TypeError('URL must be a string, not ' + uri);

    // if no 'http' is found on URL, prepend it.
    if (uri.indexOf('http') === -1)
      uri = 'http://' + uri;

    // if url contains user:pass@host, parse it.
    if (uri.indexOf('@') !== -1) {
      var parts = (url.parse(uri).auth || '').split(':');
      options.username = parts[0];
      options.password = parts[1];
    }

    var config = {
      base_opts       : {},
      proxy           : options.proxy,
      output          : options.output,
      encoding        : options.encoding || (options.multipart ? 'binary' : defaults.encoding),
      decode_response : options.decode === false ? false : defaults.decode_response,
      parse_response  : options.parse  === false ? false : defaults.parse_response,
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

    if ((options.compressed || defaults.compressed) && typeof zlib != 'undefined')
      config.headers['Accept-Encoding'] = 'gzip,deflate';

    for (var h in options.headers)
      config.headers[h] = options.headers[h];

    if (options.username) {
      if (options.auth && (options.auth == 'auto' || options.auth == 'digest')) {
        config.credentials = [options.username, options.password];
      } else {
        var auth_header = options.proxy ? 'Proxy-Authorization' : 'Authorization';
        config.headers[auth_header] = auth.basic(options.username, options.password);
      }
    }

    if (data) {
      if (method.toUpperCase() == 'GET') { // build query string and append to URI

        uri  = uri.replace(/\?.*|$/, '?' + stringify(data));
        post_data = null;

      } else if (options.multipart) { // build multipart body for request

        var boundary = options.boundary || defaults.boundary;

        multipart.build(data, boundary, function(err, body) {
          if (err) throw(err);

          config.headers['Content-Type']   = 'multipart/form-data; boundary=' + boundary;
          config.headers['Content-Length'] = body.length;
          self.send_request(1, method, uri, config, body, out, callback);
        });

        return out; // stream

      } else if (this.is_stream(data) || Buffer.isBuffer(data)) {

        post_data = data;

      } else { // string or object data, no multipart.

        // format data according to content type
        var post_data = (typeof(data) === 'string') ? data :
            options.json ? JSON.stringify(data) : stringify(data);

        // if no content-type was passed, determine if json or not. 
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = options.json
          ? 'application/json'
          : 'application/x-www-form-urlencoded';
        }

        post_data = new Buffer(post_data, config.encoding);
        config.headers['Content-Length'] = post_data.length;

        // unless a specific accept header was passed, assume json wants json back.
        if (options.json && config.headers['Accept'] === defaults.accept)
          config.headers['Accept'] = 'application/json';
      }
    }

    return this.send_request(1, method, uri, config, post_data, out, callback);
  },

  get_request_opts: function(method, uri, config) {
    var opts      = config.base_opts,
        proxy     = config.proxy,
        remote    = proxy ? url.parse(proxy) : url.parse(uri);

    opts.protocol = remote.protocol;
    opts.host     = remote.hostname;
    opts.port     = remote.port || (remote.protocol == 'https:' ? 443 : 80);
    opts.path     = proxy ? uri : remote.pathname + (remote.search || '');
    opts.method   = method;
    opts.headers  = config.headers;

    if (!opts.headers['Host']) {
      // if using proxy, make sure the host header shows the final destination
      var target = proxy ? url.parse(uri) : remote;
      opts.headers['Host'] = target.hostname;

      // and if a non standard port was passed, append it to the port header
      if (target.port && [80, 443].indexOf(target.port) === -1) {
        opts.headers['Host'] += ':' + target.port;
      }
    }

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

  send_request: function(count, method, uri, config, post_data, out, callback) {

    var timer,
        returned     = 0,
        self         = this,
        request_opts = this.get_request_opts(method, uri, config),
        protocol     = request_opts.protocol == 'https:' ? https : http;

    var done = function(err, resp, body) {
      if (returned++ > 0) return;

      if (callback)
        callback(err, resp, body);
      else
        out.emit('end', err, resp, body);
    }

    debug('Making request #' + count, request_opts);
    var request = protocol.request(request_opts, function(resp) {

      var headers = resp.headers;
      debug('Got response', headers);
      if (timer) clearTimeout(timer);

      // if redirect code is found, send a GET request to that location if enabled via 'follow' option
      if ([301, 302, 303].indexOf(resp.statusCode) != -1 && headers.location) {
        if (count <= config.follow) {
          out.emit('redirect', headers.location);
          delete config.headers['Content-Length']; // in case the original was a multipart POST request.
          return self.send_request(++count, 'GET', url.resolve(uri, headers.location), config, null, out, callback);
        } else if (config.follow > 0) {
          return done(new Error('Max redirects reached. Possible loop in: ' + headers.location));
        }
      }

      // if authentication is requested and credentials were not passed, resend request if we have user/pass
      if (resp.statusCode == 401 && headers['www-authenticate'] && config.credentials) {
        if (!config.headers['Authorization']) { // only if authentication hasn't been sent
          var auth_header = self.get_auth_header(headers['www-authenticate'], config.credentials, request_opts);

          if (auth_header) {
            config.headers['Authorization'] = auth_header;
            return self.send_request(count, method, uri, config, post_data, out, callback);
          }
        }
      }

      // ok so we got a valid (non-redirect & authorized) response. notify the stream guys.
      out.emit('headers', headers);

      var pipeline      = [],
          parsed        = false,
          mime          = self.parse_content_type(headers['content-type']),
          text_response = mime.type && mime.type.indexOf('text/') != -1;

      // To start, if our body is compressed and we're able to inflate it, do it.
      if (headers['content-encoding'] && decompressors[headers['content-encoding']]) {
        pipeline.push(decompressors[headers['content-encoding']]());
      }

      // If parse is enabled and we have a parser for it, then go for it.
      if (config.parse_response && parsers[mime.type]) {
        parsed = true;
        pipeline.push(parsers[mime.type]());

        // set objectMode on out stream to improve performance
        out._writableState.objectMode = true;
        out._readableState.objectMode = true;

      // If we're not parsing, and unless decoding was disabled, we'll try
      // decoding non UTF-8 bodies to UTF-8, using the iconv-lite library.
      } else if (text_response && config.decode_response
        && mime.charset && !mime.charset.match(/utf-?8$/i)) {
          pipeline.push(decoder(mime.charset));
      }

      // And `out` is the stream we finally push the decoded/parsed output to.
      pipeline.push(out);

      // Now release the kraken!
      var tmp = resp;
      while (pipeline.length) {
        tmp = tmp.pipe(pipeline.shift());
      }

      // If the user has requested and output file, pipe the output stream to it.
      // In stream mode, we will still get the response stream to play with.
      if (config.output && resp.statusCode == 200) {
        resp.pipe(fs.createWriteStream(config.output))
      }

      // Only aggregate the full body if a callback was requested.
      if (callback) {
        resp.raw   = [];
        resp.body  = [];
        resp.bytes = 0;

        // Count the amount of (raw) bytes passed using a PassThrough stream.
        var clean_pipe = new stream.PassThrough();
        resp.pipe(clean_pipe);

        clean_pipe.on('readable', function() {
          var chunk;
          while (chunk = this.read()) {
            resp.bytes += chunk.length;
            resp.raw.push(chunk);
          }
        })

        // Listen on the 'readable' event to aggregate the chunks.
        out.on('readable', function() {
          var chunk;
          while ((chunk = this.read()) !== null) {
            // We're either pushing buffers or objects, never strings.
            if (typeof chunk == 'string') chunk = new Buffer(chunk);

            // Push all chunks to resp.body. We'll bind them in resp.end().
            resp.body.push(chunk);
          }
        })

        // And set the .body property once all data is in.
        out.on('end', function() {

          // we may want access to the raw data, so keep a reference.
          resp.raw = Buffer.concat(resp.raw);

          // if parse was successful, we should have an array with one object
          if (resp.body[0] !== undefined && !Buffer.isBuffer(resp.body[0])) {
            resp.body = resp.body[0];
          } else { // we got one or several buffers. string or binary.
            resp.body = Buffer.concat(resp.body);

            // if we're here and parsed is true, it means we tried to but it didn't work.
            // so given that we got a text response, let's stringify it.
            if (text_response || parsed) {
              resp.body = resp.body.toString();
            }
          }

          // time to call back, junior.
          done(null, resp, resp.body);
        });

      }

    }); // end request call

    // unless timeout was disabled, set a timeout to abort the request
    if (config.timeout > 0) {
      timer = setTimeout(function() {
        request.abort();
      }, config.timeout)
    }

    request.on('error', function(err) {
      debug('Request error', err);
      if (timer) clearTimeout(timer);

      done(err || new Error('Unknown error when making request.'));
    });

    if (post_data) {
      if (this.is_stream(post_data)) {
        post_data.pipe(request);
      } else {
        request.write(post_data, config.encoding);
        request.end();
      }
    } else {
      request.end();
    }

    out.request = request;
    return out;
  },

  parse_content_type: function(header) {
    if (!header || header == '') return {};

    var charset = 'iso-8859-1', arr = header.split(';');
    try { charset = arr[1].match(/charset=(.+)/)[1] } catch (e) { /* not found */ }

    return { type: arr[0], charset: charset };
  },

  is_stream: function(obj) {
    return typeof obj.pipe === 'function';
  }
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
  return Needle.request(method, uri, data, opts, callback);
};