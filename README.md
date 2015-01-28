Needle
======

[![NPM](https://nodei.co/npm/needle.png)](https://nodei.co/npm/needle/)

The leanest and most handsome HTTP client in the Nodelands. 

```js
var needle = require('needle');

needle.get('http://www.google.com', function(error, response) {
  if (!error && response.statusCode == 200)
    console.log(response.body);
});
```

Callbacks not floating your boat? Needle got your back.

```js
var data = { 
  file: '/home/johnlennon/walrus.png', 
  content_type: 'image/png' 
};

needle
  .post('https://my.server.com/foo', data, { multipart: true })
  .on('readable', function() { /* eat your chunks */ })
  .on('end', function() {
    console.log('Ready-o, friend-o.');
  })
```

With only one single dependency, Needle supports: 

 - HTTP/HTTPS requests, with the usual verbs you would expect.
 - All of Node's native TLS options, such as 'rejectUnauthorized' (see below).
 - Basic & Digest authentication
 - Multipart form-data (e.g. file uploads)
 - HTTP Proxy forwarding, optionally with authentication.
 - Streaming gzip or deflate decompression
 - Automatic XML & JSON parsing
 - 301/302 redirect following, if enabled, and
 - Streaming non-UTF-8 charset decoding, via `iconv-lite`.

And yes, Mr. Wayne, it does come with the latest streams2 support.

This makes Needle an ideal alternative for performing quick HTTP requests in Node, either for API interaction, downloading or uploading streams of data, and so on. If you need OAuth, AWS support or anything fancier, you should check out mikeal's request module. 

Important
---------

The version bump from 0.6 to 0.7 includes a few notable changes to the streaming interface. If you were using Needle in 'steams mode', please take a look at the [changelog](https://github.com/tomas/needle/blob/master/CHANGELOG.md) to see what's going on. If you were using regular callbacks, no problemo amigo -- you can update to 0.7+ and everything will be smooth as silk.

Install
-------

```
$ npm install needle
```

Usage
-----

```js
// using callback
needle.get('ifconfig.me/all.json', function(error, response) {
  if (!error)
    console.log(response.body.ip_addr); // JSON decoding magic. :)
});

// using streams
var out = fs.createWriteStream('logo.png');
needle.get('https://google.com/images/logo.png').pipe(out);
```

As you can see, you can call Needle with a callback or without it. When passed, the response body will be buffered and written to `response.body`, and the callback will be fired when all of the data has been collected and processed (e.g. decompressed, decoded and/or parsed).

When no callback is passed, the buffering logic will be skipped but the response stream will still go through Needle's processing pipeline, so you get all the benefits of post-processing while keeping the streamishness we all love from Node.

Response pipeline
-----------------

Depending on the response's Content-Type, Needle will either attempt to parse JSON or XML streams, or, if a text response was received, will ensure that the final encoding you get is UTF-8. For XML decoding to work, though, you'll need to install the `xml2js` package as we don't enforce unneeded dependencies unless strictly needed.

You can also request a gzip/deflated response, which, if sent by the server, will be processed before parsing or decoding is performed.

```js
needle.get('http://stackoverflow.com/feeds', { compressed: true }, function(err, resp) {
  console.log(resp.body); // this little guy won't be a Gzipped binary blob 
                          // but a nice object containing all the latest entries
});
```

Or in anti-callback mode, using a few other options:

```js
var options = {
  compressed         : true,
  follow             : true,
  rejectUnauthorized : true
}

// in this case, we'll ask Needle to follow redirects (disabled by default), 
// but also to verify their SSL certificates when connecting.
var stream = needle.get('https://backend.server.com/everything.html', options);

stream.on('readable', function() {
  while (data = this.read()) {
    console.log(data.toString()); 
  }
})
```

API
---

All of Needle's request methods return a Readable stream, and both `options` and `callback` are optional. If passed, the callback will return three arguments: `error`, `response` and `body`, which is basically an alias for `response.body`.

### needle.head(url, options, callback)

```js
var options = {
  timeout: 5000 // if we don't get a response in 5 seconds, boom.
}

needle.head('https://my.backend.server.com', function(err, resp) {
  if (err)
    console.log('Shoot! Something is wrong: ' + err.message)
  else
    console.log('Yup, still alive.')
})
```

### needle.get(url, options, callback)

```js
needle.get('google.com/search?q=syd+barrett', function(err, resp) {
  // if no http:// is found, Needle will automagically prepend it.
});
```

### needle.post(url, data, options, callback)

```js
var options = {
  headers: { 'X-Custom-Header': 'Bumbaway atuna' }
}

needle.post('https://my.app.com/endpoint', 'foo=bar', options, function(err, resp) {
  // you can pass params as a string or as an object.
});
```

### needle.put(url, data, options, callback)

```js
var nested = {
  params: {
    are: {
      also: 'supported'
    }
  }
}

needle.put('https://api.app.com/v2', nested, function(err, resp) {
  console.log('Got ' + resp.bytes + ' bytes.') // another nice treat from this handsome fella.
});
```

### needle.delete(url, data, options, callback)

```js
var options = {
  username: 'fidelio',
  password: 'x'
}

needle.delete('https://api.app.com/messages/123', null, options, function(err, resp) {
  // in this case, data may be null, but you need to explicity pass it.
});
```

### needle.request(method, url, data, options, callback)

Generic request. This not only allows for flexibility, but also lets you perform a GET request with data, in which case will be appended to the request as a query string. 

```js
var data = {
  q      : 'a very smart query',
  page   : 2,
  format : 'json'
}

needle.request('get', 'forum.com/search', data, function(err, resp) {
  if (!err && resp.statusCode == 200)
    console.log(resp.body); // here you go, mister.
});
```

More examples after this short break.

Request options
---------------

 - `timeout`   : Returns error if no response received in X milisecs. Defaults to `10000` (10 secs). `0` means no timeout.
 - `follow`    : Number of redirects to follow. `false` means don't follow any (default), `true` means 10. 
 - `multipart` : Enables multipart/form-data encoding. Defaults to `false`. Use it when uploading files.
 - `proxy`     : Forwards request through HTTP(s) proxy. Eg. `proxy: 'http://proxy.server.com:3128'`
 - `agent`     : Uses an http.Agent of your choice, instead of the global, default one.
 - `headers`   : Object containing custom HTTP headers for request. Overrides defaults described below.
 - `auth`      : Determines what to do with provided username/password. Options are `auto`, `digest` or `basic` (default). `auto` will detect the type of authentication depending on the response headers.
 - `json`      : When `true`, sets content type to `application/json` and sends request body as JSON string, instead of a query string. 

Response options
----------------

 - `decode`    : Whether to decode the text responses to UTF-8, if Content-Type header shows a different charset. Defaults to `true`.
 - `parse`     : Whether to parse XML or JSON response bodies automagically. Defaults to `true`.
 - `output`    : Dump response output to file. This occurs after parsing and charset decoding is done.

Note: To stay light on dependencies, Needle doesn't include the `xml2js` module used for XML parsing. To enable it, simply do `npm install xml2js`.

HTTP Header options
-------------------

These are basically shortcuts to the `headers` option described above.

 - `compressed`: If `true`, sets 'Accept-Encoding' header to 'gzip,deflate', and inflates content if zipped. Defaults to `false`.
 - `username`  : For HTTP basic auth.
 - `password`  : For HTTP basic auth. Requires username to be passed, but is optional.
 - `accept`    : Sets 'Accept' HTTP header. Defaults to `*/*`.
 - `connection`: Sets 'Connection' HTTP header. Defaults to `close`.
 - `user_agent`: Sets the 'User-Agent' HTTP header. Defaults to `Needle/{version} (Node.js {node_version})`.

Node.js TLS Options
-------------------

These options are passed directly to `https.request` if present. Taken from the [original documentation](http://nodejs.org/docs/latest/api/https.html):

 - `pfx`: Certificate, Private key and CA certificates to use for SSL.
 - `key`: Private key to use for SSL.
 - `passphrase`: A string of passphrase for the private key or pfx.
 - `cert`: Public x509 certificate to use.
 - `ca`: An authority certificate or array of authority certificates to check the remote host against.
 - `ciphers`: A string describing the ciphers to use or exclude.
 - `rejectUnauthorized`: If true, the server certificate is verified against the list of supplied CAs. An 'error' event is emitted if verification fails. Verification happens at the connection level, before the HTTP request is sent.
 - `secureProtocol`: The SSL method to use, e.g. SSLv3_method to force SSL version 3.

Overriding Defaults
-------------------

Yes sir, we have it. Needle includes a `defaults()` method, that lets you override some of the defaults for all future requests. Like this:

```js
needle.defaults({ timeout: 60000, user_agent: 'MyApp/1.2.3' });
```

This will override Needle's default user agent and 10-second timeout, so you don't need to pass those options in every other request.

Examples Galore
---------------

### HTTPS GET with Basic Auth

```js
needle.get('https://api.server.com', { username: 'you', password: 'secret' },
  function(err, resp) {
    // used HTTP auth
});
```

Or use [RFC-1738](http://tools.ietf.org/html/rfc1738#section-3.1) basic auth URL syntax:

```js
needle.get('https://username:password@api.server.com', function(err, resp) {
    // used HTTP auth from URL
});
```

### Digest Auth

```js
needle.get('other.server.com', { username: 'you', password: 'secret', auth: 'digest' }, 
  function(err, resp, body) {
    // needle prepends 'http://' to your URL, if missing
});
```

### Custom Accept header, deflate

```js
var options = {
  compressed : true, 
  follow     : true,
  accept     : 'application/vnd.github.full+json'
}

needle.get('api.github.com/users/tomas', options, function(err, resp, body) {
  // body will contain a JSON.parse(d) object
  // if parsing fails, you'll simply get the original body
});
```

### GET XML object

```js
needle.get('https://news.ycombinator.com/rss', function(err, resp, body) {
  // if xml2js is installed, you'll get a nice object containing the nodes in the RSS
});
```

### GET binary, output to file

```js
needle.get('http://upload.server.com/tux.png', { output: '/tmp/tux.png' }, function(err, resp, body) {
  // you can dump any response to a file, not only binaries.
});
```

### GET through proxy

```js
needle.get('http://search.npmjs.org', { proxy: 'http://localhost:1234' }, function(err, resp, body) {
  // request passed through proxy
});
```

### GET a very large document in a stream (from 0.7+)

```js
var stream = needle.get('http://www.as35662.net/100.log');

stream.on('readable', function() {
  var chunk;
  while (chunk = this.read()) {
    console.log('got data: ', chunk);
  }
});
```

### GET JSON object in a stream (from 0.7+)

```js
var stream = needle.get('http://jsonplaceholder.typicode.com/db', { parse: true });

stream.on('readable', function() {
  var node;
  
  // our stream will only emit a single JSON root node.
  while (node = this.read()) {
    console.log('got data: ', node);
  }
});
```

### GET JSONStream flexible parser with search query (from 0.7+)

```js

 // The 'data' element of this stream will be the string representation
 // of the titles of all posts.

needle.get('http://jsonplaceholder.typicode.com/db', { parse: true })
      .pipe(new JSONStream.parse('posts.*.title'));
      .on('data', function (obj) {
        console.log('got post title: %s', obj);
      });
```

### File upload using multipart, passing file path

```js
var data = {
  foo: 'bar',
  image: { file: '/home/tomas/linux.png', content_type: 'image/png' }
}

needle.post('http://my.other.app.com', data, { multipart: true }, function(err, resp, body) {
  // needle will read the file and include it in the form-data as binary
});
```

### Stream upload, PUT or POST

``` js
needle.put('https://api.app.com/v2', fs.createReadStream('myfile.txt'), function(err, resp, body) {
  // stream content is uploaded verbatim
});
```

### Multipart POST, passing data buffer

```js
var buffer = fs.readFileSync('/path/to/package.zip');

var data = {
  zip_file: {
    buffer       : buffer,
    filename     : 'mypackage.zip',
    content_type : 'application/octet-stream'
  }
}

needle.post('http://somewhere.com/over/the/rainbow', data, { multipart: true }, function(err, resp, body) {
  // if you see, when using buffers we need to pass the filename for the multipart body.
  // you can also pass a filename when using the file path method, in case you want to override
  // the default filename to be received on the other end.
});
```

### Multipart with custom Content-Type

```js
var data = {
  token: 'verysecret',
  payload: {
    value: JSON.stringify({ title: 'test', version: 1 }),
    content_type: 'application/json'
  }
}

needle.post('http://test.com/', data, { timeout: 5000, multipart: true }, function(err, resp, body) {
  // in this case, if the request takes more than 5 seconds
  // the callback will return a [Socket closed] error
});
```

For even more examples, check out the examples directory in the repo.

Credits
-------

Written by Tomás Pollak, with the help of contributors.

Copyright
---------

(c) 2014 Fork Ltd. Licensed under the MIT license.
