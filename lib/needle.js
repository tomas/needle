//////////////////////////////////////////
// Needle -- Node Simple HTTP Client
// Written by Tomas Pollak <tomas@forkhq.com>
// (c) 2011 - Fork Ltd.
// MIT Licensed
//////////////////////////////////////////

var util = require('util'),
		fs = require('fs'),
		path = require('path'),
		http = require('http'),
		https = require('https'),
		url = require('url'),
		stringify = require('qs').stringify;

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

	default_boundary: 'NODENEEDLEHTTPCLIENT',

	request: function(uri, method, data, options, callback){

		// normalize arguments
		var callback = (typeof options == 'function') ? options : callback;
		var options = options || {};
		if(uri.indexOf('http') == -1) uri = 'http://' + uri;

		var remote = url.parse(uri);
		var is_https = remote.protocol === "https:";
		var port = remote.port || (is_https ? 443 : 80);
		var protocol = is_https ? https : http;

		var parse_response = options.parse == false ? false : true;
		var timeout = options.timeout || 10000; // 10 seconds timeout
		var timer = null;

		var headers = {
			"Host" : remote.hostname,
			"User-Agent": "Needle/1.0 (NodeJS " + process.version + ")",
			"Connection": "close",
			"Accept": "*/*"
		}

		if(data) {
			if(options.multipart){
				var boundary = options.boundary || this.default_boundary;
				var post_data = this.build_multipart_body(data, boundary);
				headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
			} else {
				var post_data = (typeof(data) === "string") ? data : stringify(data);
				headers['Content-Type'] = "application/x-www-form-urlencoded"
			}
		}

		if(post_data)
			headers['Content-Length'] = Buffer.byteLength(post_data);

		for(h in options.headers)
			if(headers.hasOwnProperty(h)) headers[h] = options.headers[h];

		if(process.env.DEBUG) console.log(post_data);

		if(options.username && options.password){
			var b = new Buffer([options.username, options.password].join(':'));
			headers['Authorization'] = "Basic " + b.toString('base64');
		}

		var request_opts = {
			host: remote.hostname,
			port: port,
			path: remote.path,
			method: method,
			headers: headers
		}

		if(process.env.DEBUG) console.log(request_opts);

		var request = protocol.request(request_opts, function(response){

			var body = '';
			response.setEncoding('utf8');

			if(timer) clearTimeout(timer);

			response.on('data', function(chunk){
				body += chunk;
			});

			response.on('end', function() {
				if(parse_response && parsers[response.headers['content-type']]) {
					parsers[response.headers['content-type']](body, function(result){
						if(callback) callback(null, result, response);
					});
				} else {
					if(callback) callback(null, body, response);
				}
			});

		});

		if(timeout) {
			timer = setTimeout(function() {
				request.abort();
			}, timeout)
		}

		request.on('error', function(err) {
			console.log('Error on request: ' + err);
			if(timer) clearTimeout(timer);
			if(callback) callback(err || true);
		});

		if(post_data) request.write(post_data, options.encoding || 'utf8');
		request.end();

		return request;

	},

	build_multipart_body: function(data, boundary){

		var body = '';
		var object = flatten(data);

		for(var key in object){

			var part = object[key].file ? object[key] : {value: object[key]};
			body += this.generate_part(key, part, boundary);

		}

		return body + '\r\n' + '--' + boundary + '--';

	},

	generate_part: function(name, part, boundary){

		var return_part = '--' + boundary + "\r\n";
		return_part += "Content-Disposition: form-data; name=\"" + name + "\"";

		if(part.file && part.content_type){

			var filename = path.basename(part.file);
			return_part += "; filename=\"" + filename + "\"\r\n";
			return_part += "Content-Type: " + part.content_type + "\r\n\r\n";

			var data = fs.readFileSync(filename);
			return_part += (part.content_type.indexOf('text') == -1)
				? data.toString('base64')
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
	return Needle.request(uri, "POST", data, options, callback);
}

exports.put = function(uri, data, options, callback){
	return Needle.request(uri, "PUT", data, options, callback);
}

exports.delete = function(uri, data, options, callback){
	return Needle.request(uri, "DELETE", null, options, callback);
}
