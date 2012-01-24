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

		if(prop && typeof prop === "object" && !(prop.file && prop.content_type))
			flatten(prop, into, prefix_key)
		else
			into[prefix_key] = prop;

	}

	return into;

}

var Needle = {

	default_boundary: '--------------------NODENEEDLEHTTPCLIENT',

	request: function(uri, method, data, options, callback){

		// normalize arguments
		var callback = (typeof options == 'function') ? options : callback;
		var options = options || {};
		if(uri.indexOf('http') == -1) uri = 'http://' + uri;

		var remote = url.parse(uri);
		var is_https = remote.protocol === "https:";
		var port = remote.port || (is_https ? 443 : 80);
		var protocol = is_https ? https : http;
		var request_compressed = (options.compressed && typeof unzip != 'undefined') || false;
		var request_encoding = options.multipart ? 'binary' : 'utf8';

		var parse_response = options.parse === false ? false : true;
		var timeout = options.timeout || 10000; // 10 seconds timeout
		var timer = null;

		var headers = {
			"Host" : remote.hostname,
			"User-Agent": "Needle/" + version + " (NodeJS " + process.version + ")",
			"Connection": "close",
			"Accept": "*/*"
		}

		if(request_compressed) headers['Accept-Encoding'] = 'gzip,deflate';

		if(data) {
			if(options.multipart){
				var boundary = options.boundary || this.default_boundary;
				var post_data = this.build_multipart_body(data, boundary);
				headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
			} else {
				var post_data = (typeof(data) === "string") ? data : stringify(data);
				headers['Content-Type'] = 'application/x-www-form-urlencoded'
			}
			headers['Content-Length'] = post_data.length;
			// if(process.env.DEBUG) console.log(post_data);
		}

		for(h in options.headers)
			headers[h] = options.headers[h];

		if(options.username && options.password){
			var b = new Buffer([options.username, options.password].join(':'));
			headers['Authorization'] = "Basic " + b.toString('base64');
		}

		var response_end = function(response, body){

			if(process.env.DEBUG) console.log(response.headers);
			var content_type = response.headers['content-type'] && response.headers['content-type'].split(';')[0];

			if(parse_response && parsers[content_type]) {
				parsers[content_type](body, function(result){
					if(callback) callback(null, response, result);
				});
			} else {
				if(callback) callback(null, response, body);
			}

		};

		var request_opts = {
			host: remote.hostname,
			port: port,
			path: remote.pathname + (remote.search || ""),
			method: method,
			headers: headers
		}

		if(process.env.DEBUG) console.log(request_opts);

		var request = protocol.request(request_opts, function(response){

			var body = '';
			var compressed = /gzip|deflate/.test(response.headers['content-encoding']);
			var response_encoding = compressed ? 'binary' : 'utf8';
			response.setEncoding(response_encoding);

			if(timer) clearTimeout(timer);

			response.on('data', function(chunk){
				body += chunk;
			});

			response.on('end', function() {
				if(typeof unzip != 'undefined' && compressed)
					unzip(new Buffer(body, 'binary'), function(err, buff){
						response_end(response, buff.toString())
					});
				else
					response_end(response, body);
			});

		});

		if(timeout) {
			timer = setTimeout(function() {
				request.abort();
			}, timeout)
		}

		request.on('error', function(err) {
			if(process.env.DEBUG) console.log('Error on request: ' + err);
			if(timer) clearTimeout(timer);
			if(callback) callback(err || true);
		});

		if(post_data) request.write(post_data, request_encoding);
		request.end();

		return request;

	},

	build_multipart_body: function(data, boundary){

		var body = '';
		var object = flatten(data);

		for(var key in object){

			var value = object[key];
			var part = value.file && value.content_type ? value : {value: value};
			body += this.generate_part(key, part, boundary);

		}

		return body + '\r\n' + '--' + boundary + '--';

	},

	generate_part: function(name, part, boundary){

		var return_part = '--' + boundary + "\r\n";
		return_part += "Content-Disposition: form-data; name=\"" + name + "\"";

		if(part.file && part.content_type){

			var filename = path.basename(part.file);
			var data = fs.readFileSync(part.file);

			return_part += "; filename=\"" + filename + "\"\r\n";
			return_part += "Content-Type: " + part.content_type + "\r\n\r\n";
			return_part += (part.content_type.indexOf('text') == -1)
				? data.toString('binary')
				: data.toString('utf8');

		} else {

			return_part += "\r\n\r\n";
			return_part += part.value;

		}

		return return_part + '\r\n';

	}

}

exports.get = function(uri, options, callback){
	return Needle.request(uri, "GET", null, options, callback);
}

exports.post = function(uri, data, options, callback){
	if(!data) throw("POST request expects data.");
	return Needle.request(uri, "POST", data, options, callback);
}

exports.put = function(uri, data, options, callback){
	if(!data) throw("PUT request expects data.");
	return Needle.request(uri, "PUT", data, options, callback);
}

exports.delete = function(uri, data, options, callback){
	return Needle.request(uri, "DELETE", null, options, callback);
}
