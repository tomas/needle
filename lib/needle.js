//////////////////////////////////////////
// Needle -- Node.js HTTP Client
// Written by Tomás Pollak <tomas@forkhq.com>
// (c) 2012 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var fs = require('fs'),
    basename = require('path').basename,
    http = require('http'),
    https = require('https'),
    url_parse = require('url').parse,
    stringify = require('qs').stringify,
    version = JSON.parse(fs.readFileSync(__dirname + '/../package.json').toString()).version;

exports.version = version;
try { var unzip = require('zlib').unzip; } catch(e){ /* zlib not supported */ }

var default_user_agent = "Needle/" + version;
default_user_agent += " (Node.js " + process.version + "; " + process.platform + " " + process.arch + ")";
var node_http_opts = ['agent', 'pfx', 'key', 'passphrase', 'cert', 'ca', 'rejectUnauthorized', 'requestCert'];
var debug = !!process.env.DEBUG;

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
    var xml_parser = new xml2js.Parser();
    xml_parser.parseString(data, callback);
  };
} catch(e) { }

// utility function for flattening params in multipart POST's
function flatten(object, into, prefix){
  into = into || {};

  for(key in object){
    var prefix_key = prefix ? prefix + "[" + key + "]" : key;
    var prop = object[key];

    if(prop && typeof prop === "object" && !((prop.buffer || prop.file) && prop.content_type))
      flatten(prop, into, prefix_key)
    else
      into[prefix_key] = prop;
  }

  return into;
}

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
      encoding: options.encoding || (options.multipart ? 'binary' : 'utf8'),
      parse_response: options.parse === false ? false : true,
      follow: options.follow === false ? 0 : options.follow || 10, // 10 by default
      timeout: (typeof options.timeout == 'number') ? options.timeout : 10000
    }

    node_http_opts.forEach(function(key){
      if(typeof options[key] != 'undefined')
        config.base_opts[key] = options[key];
    });

    config.headers = {
      "User-Agent": options.user_agent || this.default_user_agent,
      "Connection": "close",
      "Accept": "*/*"
    }

    if (options.compressed && typeof unzip != 'undefined')
      config.headers['Accept-Encoding'] = 'gzip,deflate';

    for (h in options.headers)
      config.headers[h] = options.headers[h];

    if (options.username && options.password){
      var b = new Buffer([options.username, options.password].join(':'));
      config.headers['Authorization'] = "Basic " + b.toString('base64');
    }

    if (data){
      if (options.multipart){

        var boundary = options.boundary || this.default_boundary;
        return this.build_multipart_body(data, boundary, function(err, body){

          if(err) throw(err);
          config.headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
          config.headers['Content-Length'] = body.length;
          self.send_request(1, method, uri, config, body, callback);

        });

      } else {
        post_data = (typeof(data) === "string") ? data : stringify(data);
        config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        config.headers['Content-Length'] = post_data.length;
      }

    }

    this.send_request(1, method, uri, config, post_data, callback);
  },

  get_request_opts: function(method, uri, config){
    var opts = config.base_opts, proxy = config.proxy;
    var remote = proxy ? url_parse(proxy) : url_parse(uri);

    opts.host = remote.hostname;
    opts.port = remote.port || (remote.protocol == 'https:' ? 443 : 80);
    opts.protocol = remote.protocol;
    opts.path = proxy ? uri : remote.pathname + (remote.search || '');
    opts.method = method;
    opts.headers = config.headers;
    opts.headers["Host"] = proxy ? url_parse(uri).hostname : remote.hostname;

    return opts;
  },

  send_request: function(count, method, uri, config, post_data, callback){

    var self = this, timer, response_opts = {parse_response: config.parse_response};
    var request_opts = this.get_request_opts(method, uri, config);

    var protocol = request_opts.protocol == 'https:' ? https : http;
    var request = protocol.request(request_opts, function(response){

      if (timer) clearTimeout(timer);

      if ((response.statusCode == 301 || response.statusCode == 302) && response.headers.location){
        if (count <= config.follow)
          return self.send_request(++count, 'GET', response.headers.location, config, null, callback);
        else if (config.follow > 0)
          return callback(new Error("Too many redirects. Possible redirect loop in " + response.headers.location))
      }

      var body = '';
      var compressed = /gzip|deflate/.test(response.headers['content-encoding']);
      response.setEncoding(compressed ? 'binary' : 'utf8');

      response.on('data', function(chunk){
        body += chunk;
      });

      response.on('end', function(){
        if(typeof unzip != 'undefined' && compressed)
          unzip(new Buffer(body, 'binary'), function(err, buff){
            self.response_end(response_opts, response, buff.toString(), callback);
          });
        else
          self.response_end(response_opts, response, body, callback);

      });

    });

    if(config.timeout > 0) {
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

  },

  response_end: function(opts, response, body, callback){

    if (debug) console.log(response.headers);
    if (!callback) return;
    var content_type = response.headers['content-type'] && response.headers['content-type'].split(';')[0];

    if (opts.parse_response && parsers[content_type]) {
      parsers[content_type](body, function(err, result){
        callback(err, response, result);
      });
    } else {
      callback(null, response, body);
    }

  },

  build_multipart_body: function(data, boundary, callback){

    var body = '';
    var object = flatten(data);
    var count = Object.keys(object).length;

    for (var key in object){

      var value = object[key];
      if (value === null || typeof value == 'undefined') return --count;

      var part = (value.buffer || value.file) && value.content_type ? value : {value: value};

      this.generate_part(key, part, boundary, function(err, section){
        if (err) return callback(err);
        body += section;
        --count || callback(null, body + '--' + boundary + '--');
      });

    }

  },

  generate_part: function(name, part, boundary, callback){

    var return_part = '--' + boundary + "\r\n";
    return_part += "Content-Disposition: form-data; name=\"" + name + "\"";

    var append = function(data, filename){

      if (data){
        return_part += "; filename=\"" + encodeURIComponent(filename) + "\"\r\n";
        return_part += "Content-Type: " + part.content_type + "\r\n\r\n";
        return_part += (part.content_type.indexOf('text') == -1)
          ? data.toString('binary')
          : data.toString('utf8');
      }

      callback(null, return_part + '\r\n');
    };

    if ((part.file || part.buffer) && part.content_type){

      var filename = part.filename ? part.filename : part.file ? basename(part.file) : name;
      if (part.buffer) return append(part.buffer, filename);

      fs.readFile(part.file, function(err, data){
        if(err) return callback(err);
        append(data, filename);
      });

    } else {

      return_part += "\r\n\r\n";
      return_part += part.value;
      append();

    }

  }

}

exports.head = function(uri, options, callback){
  return Needle.request(uri, 'HEAD', null, options, callback);
}

exports.get = function(uri, options, callback){
  return Needle.request(uri, 'GET', null, options, callback);
}

exports.post = function(uri, data, options, callback){
  if(!data || typeof data == 'function') throw('POST request expects data.');
  return Needle.request(uri, 'POST', data, options, callback);
}

exports.put = function(uri, data, options, callback){
  if(!data || typeof data == 'function') throw('PUT request expects data.');
  return Needle.request(uri, 'PUT', data, options, callback);
}

exports.delete = function(uri, data, options, callback){
  return Needle.request(uri, 'DELETE', null, options, callback);
}
