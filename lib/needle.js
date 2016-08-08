//////////////////////////////////////////
// Needle -- Node.js HTTP Client
// Written by Tomás Pollak <tomas@forkhq.com>
// (c) 2012-2015 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var fs          = require('fs'),
    http        = require('http'),
    https       = require('https'),
    url         = require('url'),
    stream      = require('stream'),
    debug       = require('debug')('needle'),
    stringify   = require('./querystring').build,
    multipart   = require('./multipart'),
    auth        = require('./auth'),
    cookies     = require('./cookies'),
    parsers     = require('./parsers'),
    decoder     = require('./decoder');

//////////////////////////////////////////
// variabilia

var version     = require('../package.json').version;

var user_agent  = 'Needle/' + version;
user_agent     += ' (Node.js ' + process.version + '; ' + process.platform + ' ' + process.arch + ')';

var tls_options = 'agent pfx key passphrase cert ca ciphers rejectUnauthorized secureProtocol checkServerIdentity';

// older versions of node (< 0.11.4) prevent the runtime from exiting
// because of connections in keep-alive state. so if this is the case
// we'll default new requests to set a Connection: close header.
var close_by_default = !http.Agent || http.Agent.defaultMaxSockets != Infinity;

//////////////////////////////////////////
// decompressors for gzip/deflate bodies

var decompressors = {};

try {

  var zlib = require('zlib')

  decompressors['x-deflate'] = zlib.Inflate;
  decompressors['deflate']   = zlib.Inflate;
  decompressors['x-gzip']    = zlib.Gunzip;
  decompressors['gzip']      = zlib.Gunzip;

} catch(e) { /* zlib not available */ }

//////////////////////////////////////////
// options and aliases

var defaults = {
  // data
  boundary                : '--------------------NODENEEDLEHTTPCLIENT',
  encoding                : 'utf8',
  parse_response          : 'all', // same as true. valid options: 'json', 'xml' or false/null

  // headers
  accept                  : '*/*',
  user_agent              : user_agent,

  // numbers
  open_timeout            : 10000,
  read_timeout            : 0,
  follow_max              : 0,

  // booleans
  decode_response         : true,
  parse_cookies           : true,
  follow_set_cookies      : false,
  follow_set_referer      : false,
  follow_keep_method      : false,
  follow_if_same_host     : false,
  follow_if_same_protocol : false
}

var aliased = {
  options: {
    decode  : 'decode_response',
    parse   : 'parse_response',
    timeout : 'open_timeout',
    follow  : 'follow_max'
  },
  inverted: {}
}

// only once, invert aliased keys so we can get passed options.
Object.keys(aliased.options).map(function(k) {
  var value = aliased.options[k];
  aliased.inverted[value] = k;
});

//////////////////////////////////////////
// helpers

function keys_by_type(type) {
  return Object.keys(defaults).map(function(el) {
    if (defaults[el].constructor == type)
      return el;
  }).filter(function(el) { return el })
}

function parse_content_type(header) {
  if (!header || header === '') return {};

  var charset = 'iso-8859-1', arr = header.split(';');
  try { charset = arr[1].match(/charset=(.+)/)[1] } catch (e) { /* not found */ }

  return { type: arr[0], charset: charset };
}

function is_stream(obj) {
  return typeof obj.pipe === 'function';
}

//////////////////////////////////////////
// the main act

function Needle(method, uri, data, options, callback) {
  if (typeof uri !== 'string')
    throw new TypeError('URL must be a string, not ' + uri);

  this.method   = method;
  this.uri      = uri;
  this.data     = data;

  if (typeof options == 'function') {
    this.callback = options;
    this.options  = {};
  } else {
    this.callback = callback;
    this.options  = options;
  }
}

Needle.prototype.setup = function(uri, options) {
  function get_option(key, fallback) {
    // if original is in options, return that value
    if (typeof options[key] != 'undefined') return options[key];

    // otherwise, return value from alias or fallback/undefined
    return typeof options[aliased.inverted[key]] != 'undefined'
                ? options[aliased.inverted[key]] : fallback;
  }

  function check_value(expected, key) {
    var value = get_option(key),
        type  = typeof value;

    if (type != 'undefined' && type != expected)
      throw new TypeError(type + ' received for ' + key + ', but expected a ' + expected);

    return (type == expected) ? value : defaults[key];
  }

  //////////////////////////////////////////////////
  // the basics

  var config = {
    http_opts : {}, // passed later to http.request() directly
    proxy     : options.proxy,
    output    : options.output,
    parser    : get_option('parse_response', defaults.parse_response),
    encoding  : options.encoding || (options.multipart ? 'binary' : defaults.encoding)
  }

  keys_by_type(Boolean).forEach(function(key) {
    config[key] = check_value('boolean', key);
  })

  keys_by_type(Number).forEach(function(key) {
    config[key] = check_value('number', key);
  })

  // populate http_opts with given TLS options
  tls_options.split(' ').forEach(function(key) {
    if (typeof options[key] != 'undefined') {
      config.http_opts[key] = options[key];
      if (typeof options.agent == 'undefined')
        config.http_opts.agent = false; // otherwise tls options are skipped
    }
  });

  //////////////////////////////////////////////////
  // headers, cookies

  config.headers = {
    'accept'     : options.accept     || defaults.accept,
    'user-agent' : options.user_agent || defaults.user_agent
  }

  // set connection header if opts.connection was passed, or if node < 0.11.4 (close)
  if (options.connection || close_by_default)
    config.headers['connection'] = options.connection || 'close';

  if ((options.compressed || defaults.compressed) && typeof zlib != 'undefined')
    config.headers['accept-encoding'] = 'gzip,deflate';

  if (options.cookies)
    config.headers['cookie'] = cookies.write(options.cookies);

  //////////////////////////////////////////////////
  // basic/digest auth

  if (uri.indexOf('@') !== -1) { // url contains user:pass@host, so parse it.
    var parts = (url.parse(uri).auth || '').split(':');
    options.username = parts[0];
    options.password = parts[1];
  }

  if (options.username) {
    if (options.auth && (options.auth == 'auto' || options.auth == 'digest')) {
      config.credentials = [options.username, options.password];
    } else {
      config.headers['authorization'] = auth.basic(options.username, options.password);
    }
  }

  // if proxy is present, set auth header from either url or proxy_user option.
  if (config.proxy) {
    if (config.proxy.indexOf('http') === -1)
      config.proxy = 'http://' + config.proxy;

    if (config.proxy.indexOf('@') !== -1) {
      var proxy = (url.parse(config.proxy).auth || '').split(':');
      options.proxy_user = proxy[0];
      options.proxy_pass = proxy[1];
    }

    if (options.proxy_user)
      config.headers['proxy-authorization'] = auth.basic(options.proxy_user, options.proxy_pass);
  }

  // now that all our headers are set, overwrite them if instructed.
  for (var h in options.headers)
    config.headers[h.toLowerCase()] = options.headers[h];

  return config;
}

Needle.prototype.start = function() {

  var out      = new stream.PassThrough({ objectMode: false }),
      uri      = encodeURI(this.uri),
      data     = this.data,
      method   = this.method,
      callback = (typeof this.options == 'function') ? this.options : this.callback,
      options  = this.options || {};

  // if no 'http' is found on URL, prepend it.
  if (uri.indexOf('http') === -1)
    uri = uri.replace(/^(\/\/)?/, 'http://');

  var body, config = this.setup(uri, options);

  if (data) {

    if (options.multipart) { // boss says we do multipart. so we do it.

      var self = this, boundary = options.boundary || defaults.boundary;

      multipart.build(data, boundary, function(err, parts) {
        if (err) throw(err);

        config.headers['content-type']   = 'multipart/form-data; boundary=' + boundary;
        config.headers['content-length'] = parts.length;
        self.send_request(1, method, uri, config, parts, out, callback);
      });

      return out; // stream

    } else if (is_stream(data) || Buffer.isBuffer(data)) {

      if (is_stream(data) && method.toUpperCase() == 'GET')
        throw new Error('Refusing to pipe() a stream via GET. Did you mean .post?');

      body = data; // use the raw buffer or stream as request body.

    } else if (method.toUpperCase() == 'GET' && !options.json) {

      // append the data to the URI as a querystring.
      uri = uri.replace(/\?.*|$/, '?' + stringify(data));

    } else { // string or object data, no multipart.

      // if string, leave it as it is, otherwise, stringify.
      body = (typeof(data) === 'string') ? data
             : options.json ? JSON.stringify(data) : stringify(data);

      // ensure we have a buffer so bytecount is correct.
      body = new Buffer(body, config.encoding);
    }

  }

  if (body) {
    // unless we have a stream or set a querystring, set the content length.
    if (body.length) config.headers['content-length'] = body.length;

    // if no content-type was passed, determine if json or not.
    if (!config.headers['content-type']) {
      config.headers['content-type'] = options.json
      ? 'application/json; charset=utf-8'
      : 'application/x-www-form-urlencoded'; // no charset says W3 spec.
    }

    // unless a specific accept header was passed, assume json wants json back.
    if (options.json && config.headers['accept'] === defaults.accept)
      config.headers['accept'] = 'application/json';
  }

  return this.send_request(1, method, uri, config, body, out, callback);
}

Needle.prototype.get_request_opts = function(method, uri, config) {
  var opts      = config.http_opts,
      proxy     = config.proxy,
      remote    = proxy ? url.parse(proxy) : url.parse(uri);

  opts.protocol = remote.protocol;
  opts.host     = remote.hostname;
  opts.port     = remote.port || (remote.protocol == 'https:' ? 443 : 80);
  opts.path     = proxy ? uri : remote.pathname + (remote.search || '');
  opts.method   = method;
  opts.headers  = config.headers;

  if (!opts.headers['host']) {
    // if using proxy, make sure the host header shows the final destination
    var target = proxy ? url.parse(uri) : remote;
    opts.headers['host'] = target.hostname;

    // and if a non standard port was passed, append it to the port header
    if (target.port && [80, 443].indexOf(target.port) === -1) {
      opts.headers['host'] += ':' + target.port;
    }
  }

  return opts;
}

Needle.prototype.should_follow = function(location, config, original) {
  if (!location) return false;

  // returns true if location contains matching property (host or protocol)
  function matches(property) {
    var property = original[property];
    return location.indexOf(property) !== -1;
  }

  // first, check whether the requested location is actually different from the original
  if (location === original)
    return false;

  if (config.follow_if_same_host && !matches('host'))
    return false; // host does not match, so not following

  if (config.follow_if_same_protocol && !matches('protocol'))
    return false; // procotol does not match, so not following

  return true;
}

Needle.prototype.send_request = function(count, method, uri, config, post_data, out, callback) {

  var timer,
      returned     = 0,
      self         = this,
      request_opts = this.get_request_opts(method, uri, config),
      protocol     = request_opts.protocol == 'https:' ? https : http;

  function done(err, resp, body) {
    if (returned++ > 0)
      return debug('Already finished, stopping here.');

    if (timer) clearTimeout(timer);
    request.removeListener('error', had_error);

    if (callback)
      return callback(err, resp, body);

    out.emit('end', err, resp, body);
  }

  function had_error(err) {
    debug('Request error', err);
    done(err || new Error('Unknown error when making request.'));
  }

  function set_timeout(milisecs) {
    if (milisecs <= 0) return;
    timer = setTimeout(function() { request.abort() }, milisecs);
  }

  // handle errors on the underlying socket, that may be closed while writing
  // for an example case, see test/long_string_spec.js. we make sure this
  // scenario ocurred by verifying the socket's writable & destroyed states.
  function on_socket_end() {
    if (!this.writable && this.destroyed === false) {
      this.destroy();
      had_error(new Error('Remote end closed socket abruptly.'))
    }
  }

  debug('Making request #' + count, request_opts);
  var request = protocol.request(request_opts, function(resp) {

    var headers = resp.headers;
    debug('Got response', resp.statusCode, headers);

    // clear open timeout, and set a read timeout.
    if (timer) clearTimeout(timer);
    set_timeout(config.read_timeout);

    if (headers['set-cookie'] && config.parse_cookies) {
      resp.cookies = cookies.read(headers['set-cookie']);
      debug('Got cookies', resp.cookies);
    }

    // if redirect code is found, send a GET request to that location if enabled via 'follow' option
    if ([301, 302, 303].indexOf(resp.statusCode) !== -1 && self.should_follow(headers.location, config, uri)) {

      if (count <= config.follow_max) {
        out.emit('redirect', headers.location);

        // unless follow_keep_method was set to true, rewrite the request to GET before continuing
        if (!config.follow_keep_method) {
          method    = 'GET';
          post_data = null;
          delete config.headers['content-length']; // in case the original was a multipart POST request.
        }

        if (config.follow_set_cookies && resp.cookies)
          config.headers['cookie'] = cookies.write(resp.cookies);

        if (config.follow_set_referer)
          config.headers['referer'] = uri; // the original, not the destination URL.

        config.headers['host'] = null; // clear previous Host header to avoid conflicts.

        debug('Redirecting to ' + url.resolve(uri, headers.location));
        return self.send_request(++count, method, url.resolve(uri, headers.location), config, post_data, out, callback);
      } else if (config.follow_max > 0) {
        return done(new Error('Max redirects reached. Possible loop in: ' + headers.location));
      }
    }

    // if auth is requested and credentials were not passed, resend request, provided we have user/pass.
    if (resp.statusCode == 401 && headers['www-authenticate'] && config.credentials) {
      if (!config.headers['authorization']) { // only if authentication hasn't been sent
        var auth_header = auth.header(headers['www-authenticate'], config.credentials, request_opts);

        if (auth_header) {
          config.headers['authorization'] = auth_header;
          return self.send_request(count, method, uri, config, post_data, out, callback);
        }
      }
    }

    // ok, so we got a valid (non-redirect & authorized) response. let's notify the stream guys.
    out.emit('header', resp.statusCode, headers);
    out.emit('headers', headers);

    var pipeline      = [],
        mime          = parse_content_type(headers['content-type']),
        text_response = mime.type && mime.type.indexOf('text/') != -1;

    // To start, if our body is compressed and we're able to inflate it, do it.
    if (headers['content-encoding'] && decompressors[headers['content-encoding']]) {

      var decompressor = decompressors[headers['content-encoding']]();

      // make sure we catch errors triggered by the decompressor.
      decompressor.on('error', had_error);
      pipeline.push(decompressor);
    }

    // If parse is enabled and we have a parser for it, then go for it.
    if (config.parser && parsers[mime.type]) {

      // If a specific parser was requested, make sure we don't parse other types.
      var parser_name = config.parser.toString().toLowerCase();
      if (['xml', 'json'].indexOf(parser_name) == -1 || parsers[mime.type].name == parser_name) {

        // OK, so either we're parsing all content types or the one requested matches.
        out.parser = parsers[mime.type].name;
        pipeline.push(parsers[mime.type].fn());

        // Set objectMode on out stream to improve performance.
        out._writableState.objectMode = true;
        out._readableState.objectMode = true;
      }

    // If we're not parsing, and unless decoding was disabled, we'll try
    // decoding non UTF-8 bodies to UTF-8, using the iconv-lite library.
    } else if (text_response && config.decode_response
      && mime.charset && !mime.charset.match(/utf-?8$/i)) {
        pipeline.push(decoder(mime.charset));
    }

    // And `out` is the stream we finally push the decoded/parsed output to.
    pipeline.push(out);

    // Now, release the kraken!
    var tmp = resp;
    while (pipeline.length) {
      tmp = tmp.pipe(pipeline.shift());
    }

    // If the user has requested and output file, pipe the output stream to it.
    // In stream mode, we will still get the response stream to play with.
    if (config.output && resp.statusCode == 200) {

      // for some reason, simply piping resp to the writable streams doesn't
      // work all the time (stream gets cut in the middle with no warning).
      // so we'll manually need to do the readable/write(chunk) trick.
      var file = fs.createWriteStream(config.output);
      file.on('error', had_error);

      out.on('end', function() {
        if (file.writable) file.end();
      });

      out.on('readable', function() {
        var chunk;
        while (chunk = this.read()) {
          if (file.writable) file.write(chunk);
        }
      })

    }

    // Only aggregate the full body if a callback was requested.
    if (callback) {
      resp.raw   = [];
      resp.body  = [];
      resp.bytes = 0;

      // Gather and count the amount of (raw) bytes using a PassThrough stream.
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
        // we want to be able to access to the raw data later, so keep a reference.
        resp.raw = Buffer.concat(resp.raw);

        // if parse was successful, we should have an array with one object
        if (resp.body[0] !== undefined && !Buffer.isBuffer(resp.body[0])) {

          // that's our body right there.
          resp.body = resp.body[0];

          // set the parser property on our response. we may want to check.
          if (out.parser) resp.parser = out.parser;

        } else { // we got one or several buffers. string or binary.
          resp.body = Buffer.concat(resp.body);

          // if we're here and parsed is true, it means we tried to but it didn't work.
          // so given that we got a text response, let's stringify it.
          if (text_response || out.parser) {
            resp.body = resp.body.toString();
          }
        }

        // time to call back, junior.
        done(null, resp, resp.body);
      });

    }

  }); // end request call

  // unless open_timeout was disabled, set a timeout to abort the request.
  set_timeout(config.open_timeout);

  // handle errors on the request object. things might get bumpy.
  request.on('error', had_error);

  // handle socket 'end' event to ensure we don't get delayed EPIPE errors.
  request.once('socket', function(socket) {
    if (!socket.on_socket_end) {
      socket.on_socket_end = on_socket_end;
      socket.on('end', socket.on_socket_end);
    }
  })

  if (post_data) {
    if (is_stream(post_data)) {
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
}

//////////////////////////////////////////
// exports

exports.version = version;

exports.defaults = function(obj) {
  for (var key in obj) {
    var target_key = aliased.options[key] || key;

    if (defaults.hasOwnProperty(target_key) && typeof obj[key] != 'undefined') {
      var valid_type = defaults[target_key].constructor.name;

      // ensure type matches the original, except for parse_response that can be bool or string
      if (target_key != 'parse_response' && obj[key].constructor.name != valid_type)
        throw new TypeError('Invalid type for ' + key + ', should be ' + valid_type);

      defaults[target_key] = obj[key];
    }
  }

  return defaults;
}

'head get'.split(' ').forEach(function(method) {
  exports[method] = function(uri, options, callback) {
    return new Needle(method, uri, null, options, callback).start();
  }
})

'post put patch delete'.split(' ').forEach(function(method) {
  exports[method] = function(uri, data, options, callback) {
    return new Needle(method, uri, data, options, callback).start();
  }
})

exports.request = function(method, uri, data, opts, callback) {
  return new Needle(method, uri, data, opts, callback).start();
};
