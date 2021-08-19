var fs = require('fs');

var protocols = {
  http  : require('http'),
  https : require('https')
}

var keys = {
  cert : fs.readFileSync(__dirname + '/keys/ssl.cert'),
  key  : fs.readFileSync(__dirname + '/keys/ssl.key')
}

var helpers = {};

function* createRawHeadersIterator(arr){
  var curr = 0;
  while (curr < arr.length){
    if(yield { name: arr[curr++], value: arr[curr++] }) {
      curr = 0;
    }
  }
}

function rawHeadersByKey(rawHeaders) {
  var headersObject = {}
  var iterator = createRawHeadersIterator(rawHeaders);
  var headerIteration = iterator.next();
  while(!headerIteration.done) {
    let header = headerIteration.value;
    headersObject[header.name] = header.value;
    headerIteration = iterator.next();
  }
  return headersObject;
}


helpers.server = function(opts, cb) {
    console.log("lol", opts)
  var defaults = {
    code    : 200,
    headers : {'Content-Type': 'application/json'}
    
  }
  
  var redirect = function (req, res) {
    res.writeHead(302)
    res.end(opts.response || mirror_response(req));
  }

  var mirror_response = function(req) {
    return JSON.stringify({
      headers: req.headers,
      raw_headers: rawHeadersByKey(req.rawHeaders),
      body: req.body
    })
  }

  var get = function(what) {
    if (!opts[what])
      return defaults[what];
  
    if (typeof opts[what] == 'function')
      return opts[what](); // set them at runtime
    else
      return opts[what];
  }

  var finish = function(req, res) {
    console.log("req and res", req.headers,res.body);
    res.writeHead(get('code'), get('headers'));
    res.end(opts.response || mirror_response(req));
  }


  var handler = function(req, res) {
    // if(opts.headers.location) {
    //     console.log("woooooww", req.headers);
    //     redirect(req, res)
    // }
    req.setEncoding('utf8'); // get as string
    req.body = '';
    req.on('data', function(str) { req.body += str })
    req.socket.on('error', function(e) { 
      // res.writeHead(500, {'Content-Type': 'text/plain'});
      // res.end('Error: ' + e.message);
    })

    setTimeout(function(){
      finish(req, res);
    }, opts.wait || 0);

  };

  var protocol = opts.protocol || 'http';
  var server;

  if (protocol == 'https')
    server = protocols[protocol].createServer(keys, handler);
  else
    server = protocols[protocol].createServer(handler);

  server.listen(opts.port, cb);
  return server;
}

module.exports = helpers;
