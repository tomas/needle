Needle
======

The most handsome HTTP client in the Nodelands. Supports SSL, basic auth, requests via proxy,
multipart form-data (e.g. file uploads), gzip/deflate compression and, as you would expect, 
follows redirects. Simple, nimble and to the point.

Usage
-----

``` js
var needle = require('needle');

needle.get('http://www.google.com', function(err, resp, body){
  console.log("Got status code: " + resp.statusCode);
});
```

Install
-----

```
npm install needle
```

Options
------

 - `timeout`: Returns error if response takes more than X milisecs. Defaults to `10000` (10 secs). `0` means no timeout.
 - `follow`: When `false`, Needle won't follow redirects. Can also be a number or `true` (the default, 10 max).
 - `compressed`: Whether to ask for a deflated or gzipped response or not. Defaults to `false`.
 - `parse`: Whether to parse XML or JSON response bodies automagically. Defaults to `true`.
 - `multipart`: Enables multipart/form-data encoding. Defaults to `false`.
 - `username`: For HTTP basic auth.
 - `password`: For HTTP basic auth. Requires username to be passed, obviously.
 - `agent`: Uses an http.Agent of your choice, instead of the global (default) one.
 - `proxy`: Forwards request through HTTP proxy. Eg. `proxy: 'http://proxy.server.com:3128'`

Methods
-------

``` js
needle.get(url, [options], callback);
needle.head(url, [options], callback);
needle.post(url, data, [options], callback);
needle.put(url, data, [options], callback);
needle.delete(url, [options], callback);
```
Callback receives three arguments: `(error, response, body)`

Examples
-------------

### GET with querystring

``` js
needle.get('http://www.google.com/search?q=syd+barrett', function(err, resp, body){
  if(!err && resp.statusCode == 200)
    console.log(body); // prints HTML
});
```

### HTTPS GET with Basic Auth

``` js
needle.get('https://api.server.com', { username: 'you', password: 'secret' }, 
  function(err, resp, body){ 
    // used HTTP auth
});
```

### More options

``` js
var options = {
  timeout: false,
  compressed : true,
  parse: true,
  headers: {
    'X-Custom-Header': "Bumbaway atuna"
  }
}

needle.get('server.com/posts.json', options, function(err, resp, body){
  // Needle prepends 'http://' to the URL if not found
});
```

### GET through proxy

``` js
needle.get('http://search.npmjs.org', { proxy: 'http://localhost:1234' }, function(err, resp, body){
  // request passed through proxy
});
```

### Simple POST

``` js
needle.post('https://my.app.com/endpoint', 'foo=bar', function(err, resp, body){
  // you can pass params as a string or as an object
});
```

### PUT with data object

``` js
var nested = {
  params: {
    are: {
      also: 'supported'
    }
  }
}

needle.put('https://api.app.com/v2', nested, function(err, resp, body){
  // if you don't pass any data, needle will throw an exception.
});
```

### File upload using multipart, passing file path

``` js
var data = {
  foo: 'bar',
  image: { file: '/home/tomas/linux.png', content_type: 'image/png' }
}

needle.post('http://my.other.app.com', data, { multipart: true }, function(err, resp, body){
  // needle will read the file and include it in the form-data as binary
});
```

### Multipart POST, passing data buffer

``` js
var buffer = fs.readFileSync('/path/to/package.zip');
var data = {
  zip_file: { 
    buffer: buffer, 
    filename: 'mypackage.zip', 
    content_type: 'application/octet-stream' 
  },
}

needle.post('http://somewhere.com/over/the/rainbow', data, {multipart: true}, function(err, resp, body){
  // if you see, when using buffers we need to pass the filename for the multipart body.
  // you can also pass a filename when using the file path method, in case you want to override
  // the default filename to be received on the other end.
});
```

### Multipart with custom Content-Type

``` js
var data = {
  timeout: 2000,
  token: 'verysecret',
  body: { 
    value: JSON.stringify({ title: 'test', version: 1 }),
    content_type: 'application/json'
  }
}

needle.post('http://test.com/endpoint', data, {multipart: true}, function(err, resp, body){
  // in this case, if the request takes more than 5 seconds
  // the callback will return a [Socket closed] error
});
```

Credits
-------

Written by Tomás Pollak, with the help of contributors.

Copyright
---------

(c) 2012 Fork Ltd. Licensed under the MIT license.
