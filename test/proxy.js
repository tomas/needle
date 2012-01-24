var http = require('http');
var port = 1234;

http.createServer(function(request, response) {
	
  console.log("Got request: " + request.url);
  console.log(request.headers['host']);

  var proxy = http.createClient(80, request.headers['host'])
  var proxy_request = proxy.request(request.method, request.url, request.headers);

  proxy_request.on('response', function (proxy_response) {
    proxy_response.on('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxy_response.on('end', function() {
      response.end();
    });
    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });

  request.on('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  request.on('end', function() {
    proxy_request.end();
  });

}).listen(port);

console.log("Proxy server listening on port " + port);
