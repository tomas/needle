var http = require('http');

var helpers = {};

helpers.server = function(opts, cb) {

  var default_headers = {'Content-Type': 'application/json'};

  var mirror_response = function(req) {
    return JSON.stringify({
      headers: req.headers,
      body: req.body
    })
  }

  var finish = function(req, res) {
    res.writeHead(opts.code || 200, opts.headers || default_headers);
    res.end(opts.response || mirror_response(req));
  }

  var server = http.createServer(function(req, res){

    req.setEncoding('utf8'); // get as string
    req.body = '';
    req.on('data', function(str) { req.body += str })

    setTimeout(function(){
      finish(req, res);
    }, opts.wait || 0);

  })

  server.listen(opts.port, cb);
  return server;

}

module.exports = helpers;
