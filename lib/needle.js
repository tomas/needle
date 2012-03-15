//////////////////////////////////////////
// Needle -- Node Simple HTTP Client
// Written by Tomás Pollak <tomas@forkhq.com>
// (c) 2011 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var util = require('util'),
		fs = require('fs'),
		path = require('path'),
		http = require('http'),
		https = require('https'),
		url = require('url'),
		stringify = require('qs').stringify,
		version = JSON.parse(fs.readFileSync(__dirname + '/../package.json').toString()).version;

// http.globalAgent.maxSockets = 128;
exports.version = version;
try { var unzip = require('zlib').unzip; } catch(e){ /* zlib not supported */ }

var parsers = {
	'application/json': function(data, callback){
		callback(data && JSON.parse(data));
	}
};

try {
	var xml2js = require('xml2js');

	parsers['application/xml'] = function(data, callback){

		var xml_parser = new xml2js.Parser();

		xml_parser.on('end', callback);
		xml_parser.on('error', function(result) {
			// throw("Error parsing XML!")
			callback(null);
		});

		xml_parser.parseString(data);

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

	request: function(uri, method, data, options, callback){

		var self = this;
		var callback = (typeof options == 'function') ? options : callback;
		var options = options || {};
		if(uri.indexOf('http') == -1) uri = 'http://' + uri;

		var remote = options.proxy ? url.parse(options.proxy) : url.parse(uri);
		var is_https = remote.protocol === "https:";
		var port = remote.port || (is_https ? 443 : 80);
		var request_compressed = (options.compressed && typeof unzip != 'undefined') || false;
		var post_data = null;

		var request_opts = {
			encoding: options.multipart ? 'binary' : 'utf8',
			protocol: is_https ? https : http,
			parse_response: options.parse === false ? false : true,
			timeout: options.timeout || 10000 // 10 seconds timeout
		}

		var headers = {
			"Host" : options.proxy ? url.parse(uri).hostname : remote.hostname,
			"User-Agent": "Needle/" + version + " (NodeJS " + process.version + ")",
			"Connection": "close",
			"Accept": "*/*"
		}

		if(request_compressed) headers['Accept-Encoding'] = 'gzip,deflate';

		for(h in options.headers)
			headers[h] = options.headers[h];

		if(options.username && options.password){
			var b = new Buffer([options.username, options.password].join(':'));
			headers['Authorization'] = "Basic " + b.toString('base64');
		}

		var http_opts = {
			host: remote.hostname,
			port: port,
			path: options.proxy ? uri : remote.pathname + (remote.search || ''),
			method: method,
			headers: headers
		}

		if (typeof options.agent != 'undefined') http_opts.agent = options.agent;

		if(data) {
			if(options.multipart){

				var boundary = options.boundary || this.default_boundary;
				return this.build_multipart_body(data, boundary, function(err, body){

					if(err) throw(err);
					headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
					headers['Content-Length'] = body.length;
					self.send_request(request_opts, http_opts, body, callback);

				});

			} else {
				post_data = (typeof(data) === "string") ? data : stringify(data);
				headers['Content-Type'] = 'application/x-www-form-urlencoded';
				headers['Content-Length'] = post_data.length;
			}

		}

		this.send_request(request_opts, http_opts, post_data, callback);

	},

	send_request: function(request_opts, http_opts, post_data, callback){

		if(process.env.DEBUG) console.log(http_opts + "\n\n" + post_data);
		var self = this, timer, response_opts = {parse_response: request_opts.parse_response};

		var request = request_opts.protocol.request(http_opts, function(response){
			if(timer) clearTimeout(timer);

			var body = '';
			var compressed = /gzip|deflate/.test(response.headers['content-encoding']);
			response.setEncoding(compressed ? 'binary' : 'utf8');

			response.on('data', function(chunk){
				body += chunk;
			});

			response.on('end', function() {
				if(typeof unzip != 'undefined' && compressed)
					unzip(new Buffer(body, 'binary'), function(err, buff){
						self.response_end(response_opts, response, buff.toString(), callback);
					});
				else
					self.response_end(response_opts, response, body, callback);
			});

		});

		if(request_opts.timeout) {
			timer = setTimeout(function() {
				request.abort();
			}, request_opts.timeout)
		}

		request.on('error', function(err) {
			if(process.env.DEBUG) console.log('Error on request: ' + err.toString());
			if(timer) clearTimeout(timer);
			if(callback) callback(err || new Error("Unkown error on request."));
		});

		if(post_data) request.write(post_data, request_opts.encoding);
		request.end();

	},

	response_end: function(opts, response, body, callback){

		if(process.env.DEBUG) console.log(response.headers);
		if(!callback) return;
		var content_type = response.headers['content-type'] && response.headers['content-type'].split(';')[0];

		if(opts.parse_response && parsers[content_type]) {
			parsers[content_type](body, function(result){
				callback(null, response, result);
			});
		} else {
			callback(null, response, body);
		}

	},

	build_multipart_body: function(data, boundary, callback){

		var body = '';
		var object = flatten(data);
		var count = Object.keys(object).length;

		for(var key in object){

			var value = object[key];
			if(value === null || typeof value == 'undefined') return --count;

			var part = (value.buffer || value.file) && value.content_type ? value : {value: value};

			this.generate_part(key, part, boundary, function(err, section){
				if(err) return callback(err);
				body += section;
				--count || callback(null, body + '--' + boundary + '--');
			});

		}

	},

	generate_part: function(name, part, boundary, callback){

		var return_part = '--' + boundary + "\r\n";
		return_part += "Content-Disposition: form-data; name=\"" + name + "\"";

		var append = function(data, filename){

			if(data){
				return_part += "; filename=\"" + encodeURIComponent(filename) + "\"\r\n";
				return_part += "Content-Type: " + part.content_type + "\r\n\r\n";
				return_part += (part.content_type.indexOf('text') == -1)
					? data.toString('binary')
					: data.toString('utf8');
			}

			callback(null, return_part + '\r\n');
		};

		if((part.file || part.buffer) && part.content_type){

			var filename = part.filename ? part.filename : part.file ? path.basename(part.file) : name;
			if(part.buffer) return append(part.buffer, filename);

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
	if(!data) throw('POST request expects data.');
	return Needle.request(uri, 'POST', data, options, callback);
}

exports.put = function(uri, data, options, callback){
	if(!data) throw('PUT request expects data.');
	return Needle.request(uri, 'PUT', data, options, callback);
}

exports.delete = function(uri, data, options, callback){
	return Needle.request(uri, 'DELETE', null, options, callback);
}
