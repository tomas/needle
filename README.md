Needle
======

HTTP client for NodeJS. Supports HTTPS, basic authentication, proxied requests, nested params, multipart
form uploads and gzip/deflate compression. Really simple stuff, around ~250 lines of code.

Usage
-----

``` js
var client = require('needle');

client.get(url, [options], callback);
client.post(url, data, [options], callback);
client.put(url, data, [options], callback);
client.delete(url, [options], callback);
```

Callback receives three arguments: (error, response, body)

Options
------

 - `compressed`: Whether to ask for a deflated or gzipped response or not. Defaults to `false`.
 - `timeout`: Returns error if response takes more than X. Defaults to `10000` (10 secs).
 - `multipart`: Enables multipart/form-data encoding. Defaults to `false`.
 - `username`: For HTTP basic auth.
 - `password`: For HTTP basic auth. Requires username to be passed, obviously.
 - `parse`: Whether to parse XML or JSON response bodies automagically. Defaults to `true`.
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

client.post('http://my.app.com', data, function(err, resp, body){

  // if you don't pass any data, needle will throw an exception.

});
```

### Multipart POST

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

Credits
-------

Written by Tomás Pollak.

Copyright
-----

(c) 2011 Fork Ltd. Licensed under the MIT license.
