Needle
======

Async HTTP client for NodeJS. Supports HTTPS, basic authentication, proxied requests, multipart
form uploads and gzip/deflate compression. Really simple stuff, around ~250 lines of code.

Usage
-----

``` js
var client = require('needle');

client.get(url, [options], callback);
client.head(url, [options], callback);
client.post(url, data, [options], callback);
client.put(url, data, [options], callback);
client.delete(url, [options], callback);
```

Callback receives three arguments: (error, response, body)

Options
------

 - `timeout`: Returns error if response takes more than X. Defaults to `10000` (10 secs).
 - `compressed`: Whether to ask for a deflated or gzipped response or not. Defaults to `false`.
 - `parse`: Whether to parse XML or JSON response bodies automagically. Defaults to `true`.
 - `multipart`: Enables multipart/form-data encoding. Defaults to `false`.
 - `username`: For HTTP basic auth.
 - `password`: For HTTP basic auth. Requires username to be passed, obviously.
 - `agent`: Uses an http.Agent of your choice, instead of the global (default) one. 
 - `proxy`: Sends request via HTTP proxy. Eg. `proxy: 'http://proxy.server.com:3128'`

Examples
--------

### Simple GET.

``` js
client.get('http://www.google.com', function(err, resp, body){

  console.log("Got status code: " + resp.statusCode);

});
```

You can also skip the 'http://' part if you want, by the way.

### HTTPS + querystring

``` js
client.get('https://www.google.com/search?q=syd+barrett', function(err, resp, body){

  // boom! works.

});
```

### GET with options

``` js
var options = {
  username: 'you',
  password: 'secret',
  compressed: true,
  timeout: false,
  headers: {
    'X-Secret-Header': "Even more secret text"
  }
}

client.get('http://api.server.com', options, function(err, resp, body){

  // used HTTP auth

});
```

### GET through proxy

``` js
client.get('http://search.npmjs.org', { proxy: 'http://localhost:1234' }, function(err, resp, body){

  // request passed through proxy

});
```

### POST/PUT

``` js
client.post('https://my.app.com/endpoint', 'foo=bar', function(err, resp, body){

  // you can pass params as a string or as an object

});
```

### POST/PUT 2

``` js
var data = {
  foo: 'bar',
  nested: {
    params: {
      are: {
        also: 'supported'
      }
    }
  }
}

client.put('https://api.app.com/v2', data, function(err, resp, body){

  // if you don't pass any data, needle will throw an exception.

});
```

### Multipart POST: passing file path

``` js
var data = {
  foo: bar,
  image: { file: '/home/tomas/linux.png', content_type: 'image/png' }
}

var options = {
  multipart: true,
  timeout: 5000
}

client.post('http://my.other.app.com', data, options, function(err, resp, body){

  // in this case, if the request takes more than 5 seconds
  // the callback will return a [Socket closed] error

});
```

### Multipart POST 2: passing data buffer

``` js
var buffer = fs.readFileSync('/path/to/package.zip');
var data = {
  zip_file: { buffer: buffer, filename: 'mypackage.zip', content_type: 'application/octet-stream' },
}

client.post('http://somewhere.com/over/the/rainbow', data, {multipart: true}, function(err, resp, body){

  // if you see, when using buffers we need to pass the filename for the multipart body.
  // you can also pass a filename when using the file path method, in case you want to override
  // the default filename to be received on the other end.

});
```

Credits
-------

Written by Tomás Pollak, with the help of contributors.

Copyright
-----

(c) 2012 Fork Ltd. Licensed under the MIT license.
