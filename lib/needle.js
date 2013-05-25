//////////////////////////////////////////
// Needle -- Node.js HTTP Client
// Written by Tomás Pollak <tomas@forkhq.com>
// (c) 2012 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var fs        = require('fs'),
    http      = require('http'),
    https     = require('https'),
    url       = require('url'),
    stringify = require('qs').stringify,
    multipart = require('./multipart'),
    auth      = require('./auth');

var version = JSON.parse(fs.readFileSync(__dirname + '/../package.json').toString()).version,
    debug = !!process.env.DEBUG;

exports.version = version;
try { var unzip = require('zlib').unzip } catch(e) { /* zlib not supported */ }

var default_user_agent = "Needle/" + version;
default_user_agent += " (Node.js " + process.version + "; " + process.platform + " " + process.arch + ")";

var node_tls_opts = 'agent pfx key passphrase cert ca ciphers rejectUnauthorized';

var parsers = {
  'application/json': function(data, callback){
    try {
      callback(null, data && JSON.parse(data));
    } catch(e) {
      callback(e, data);
    }
  }
};

try {
  var xml2js = require('xml2js');
  parsers['application/xml'] = function(data, callback){
    var xml_parser = new xml2js.Parser({ explicitRoot: true, explicitArray: false });
    xml_parser.parseString(data, function(err, result){
      callback(err, err ? data : result); // return original if err failed
    });
  };
  parsers['text/xml'] = parsers['application/xml'];
} catch(e) { /* xml2js not found */ }

var Needle = {

  default_boundary: '--------------------NODENEEDLEHTTPCLIENT',
  default_user_agent: default_user_agent,

  request: function(uri, method, data, options, callback){

    var self = this, post_data = null;
    var callback = (typeof options == 'function') ? options : callback;
    var options = options || {};
    if (uri.indexOf('http') == -1) uri = 'http://' + uri;

    var config = {
      base_opts: {},
      proxy: options.proxy,
      output: options.output,
      encoding: options.encoding || (options.multipart ? 'binary' : 'utf8'),
      decode_response: options.decode === false ? false : true,
      parse_response: options.parse === false ? false : true,
      follow: options.follow === true ? 10 : typeof options.follow == 'number' ? options.follow : 0,
      timeout: (typeof options.timeout == 'number') ? options.timeout : 10000
    }

    node_tls_opts.split(' ').forEach(function(key){
      if (typeof options[key] != 'undefined'){
        config.base_opts[key] = options[key];
        if (typeof options.agent == 'undefined')
          config.base_opts.agent = false; // otherwise tls options are skipped
      }
    });

    config.headers = {
      'Accept': options.accept || '*/*',
      'Connection': options.connection || 'close',
      'User-Agent': options.user_agent || this.default_user_agent
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
        var boundary = options.boundary || this.default_boundary;
        return multipart.build(data, boundary, function(err, body){
          if (err) throw(err);
          config.headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
          config.headers['Content-Length'] = body.length;
          self.send_request(1, method, uri, config, body, callback);
        });
      } else {
        var content_type = options.json ? 'application/json' : 'application/x-www-form-urlencoded';
        var post_data = (typeof(data) === 'string') ? data :
            options.json ? JSON.stringify(data) : stringify(data);

        config.headers['Content-Type'] = content_type;
        config.headers['Content-Length'] = post_data.length;
      }
    }

    return this.send_request(1, method, uri, config, post_data, callback);
  },

  get_request_opts: function(method, uri, config){
    var opts   = config.base_opts, proxy = config.proxy;
    var remote = proxy ? url.parse(proxy) : url.parse(uri);

    opts.protocol = remote.protocol;
    opts.host     = remote.hostname;
    opts.port     = remote.port || (remote.protocol == 'https:' ? 443 : 80);
    opts.path     = proxy ? uri : remote.pathname + (remote.search || '');
    opts.method   = method;
    opts.headers  = config.headers;
    opts.headers['Host'] = proxy ? url.parse(uri).hostname : remote.hostname;

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

  send_request: function(count, method, uri, config, post_data, callback){

    var self = this, timer,
        request_opts = this.get_request_opts(method, uri, config),
        protocol = request_opts.protocol == 'https:' ? https : http;

    var request = protocol.request(request_opts, function(resp){

      var headers = resp.headers;
      if (timer) clearTimeout(timer);

      if ([301, 302].indexOf(resp.statusCode) != -1 && headers.location) {
        if (count <= config.follow)
          return self.send_request(++count, 'GET', url.resolve(uri, headers.location), config, null, callback);
        else if (config.follow > 0)
          return callback(new Error('Max redirects reached. Possible loop in: ' + headers.location));
      }

      if (resp.statusCode == 401 && headers['www-authenticate'] && config.credentials) {
        if (!config.headers['Authorization']) { // only if authentication hasn't been sent
          var auth_header = self.get_auth_header(headers['www-authenticate'], config.credentials, request_opts);

          if (auth_header) {
            config.headers['Authorization'] = auth_header;
            return self.send_request(count, method, uri, config, post_data, callback);
          }
        }
      }

      var chunks = [], length = 0,
          compressed = /gzip|deflate/.test(headers['content-encoding']),
          mime = self.parse_content_type(headers['content-type']);

      var response_opts = {
        output: config.output,
        parse: config.parse_response, // parse XML or JSON
        content_type: mime.type,
        text: mime.type && mime.type.indexOf('text/') != -1,
        charset: mime.charset
      }

      if (response_opts.text)
        response_opts.decode = config.decode_response; // only allow iconv on text/*

    // response.setEncoding(response_opts.utf8 ? 'utf8' : 'binary');

      resp.on('data', function(chunk){
        chunks.push(chunk);
        length += chunk.length;
      });

      resp.on('end', function(){

        var body = new Buffer(length), pos = 0;
        for (var i = 0, len = chunks.length; i < len; i++) {
          chunks[i].copy(body, pos);
          pos += chunks[i].length;
        }
        
        resp.bytes = length;

        if (typeof unzip != 'undefined' && compressed)
          unzip(body, function(err, buff){
            self.response_end(response_opts, resp, buff, callback);
          });
        else
          self.response_end(response_opts, resp, body, callback);

      });

    });

    if (config.timeout > 0) {
      timer = setTimeout(function() {
        request.abort();
      }, config.timeout)
    }

    request.on('error', function(err) {
      if (debug) console.log('Error on request: ' + err.toString());
      if (timer) clearTimeout(timer);
      if (callback) callback(err || new Error("Unkown error on request."));
    });

    if (post_data) request.write(post_data, config.encoding);
    request.end();
    return request;

  },

  parse_content_type: function(header){
    if (!header || header == '') return {};

    var charset = 'iso-8859-1', arr = header.split(';');
    try { charset = arr[1].match(/charset=(.+)/)[1] } catch (e) { /* not found */ }

    return { type: arr[0], charset: charset };
  },

  response_end: function(opts, response, body, callback){

    if (debug) console.log(response.headers);
    if (!callback) return;

    var handle_output = function(err, data){
      if (err || !opts.output)
        return callback(err, response, data);

      fs.writeFile(opts.output, data, function(err){
        callback(err, response, data);
      })
    }

    if (opts.parse && parsers[opts.content_type]) {
      parsers[opts.content_type](body.toString(), function(err, result){
        handle_output(err, result);
      });
    } else {
      if (opts.decode && opts.charset && !opts.charset.match(/utf-?8$/i)) // not utf-8
        body = require('iconv-lite').decode(body, opts.charset);

      handle_output(null, opts.text ? body.toString() : body);
    }

  }

}

var is_valid_data = function(obj) {
  return typeof obj === 'string'
      || (obj.toString() === '[object Object]' && Object.keys(obj).length > 0);
}

exports.head = function(uri, options, callback){
  return Needle.request(uri, 'HEAD', null, options, callback);
}

exports.get = function(uri, options, callback){
  return Needle.request(uri, 'GET', null, options, callback);
}

exports.post = function(uri, data, options, callback){
  if (!data || !is_valid_data(data)) throw('POST request expects data.');
  return Needle.request(uri, 'POST', data, options, callback);
}

exports.put = function(uri, data, options, callback){
  if (!data || !is_valid_data(data)) throw('PUT request expects data.');
  return Needle.request(uri, 'PUT', data, options, callback);
}

exports.delete = function(uri, data, options, callback){
  return Needle.request(uri, 'DELETE', null, options, callback);
}
