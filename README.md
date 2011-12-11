Needle
======

HTTP client for node. Supports HTTP basic auth, HTTPS, nested params and multipart
form uploads. Really simple stuff, around ~200 lines of code.

Usage
-----

    var client = require('needle');

    client.get(url, [options], callback);
    client.post(url, data, [options], callback);
    client.put(url, data, [options], callback);
    client.delete(url, [options], callback);

    callback receives three arguments: (err, response, body)

Options
------

 - timeout: Returns error if response takes more than X. Defaults to 10000 (10 secs).
 - multipart: Enables multipart/form-data encoding. Defaults to false.
 - username: For http auth.
 - password: For http auth. Both are required of course.
 - parse: Whether to parse XML or JSON response bodies automagically. Defaults to true.

Examples
--------

### Simple GET.

    client.get('http://www.google.com', function(err, resp, body){

      console.log("Got status code: " + resp.statusCode);

    });

You can also skip the 'http://' part if you want, by the way.

### HTTPS + querystring

    client.get('https://www.google.com/search?q=syd+barrett', function(err, resp, body){

      // works

    });

### GET with options

    var options = {
      username: 'you',
      password: 'secret',
      timeout: false,
      headers: {
        'X-Secret-Header': "Even more secret text"
      }
    }

    client.get('http://api.server.com', options, function(err, resp, body){

      // used HTTP auth

    });

### POST/PUT

    var data = {
      foo: 'bar',
      nested: {
        params: {
          are: {
            also: 'possible'
          }
        }
      }
    }

    client.post('http://my.app.com', data, function(err, resp, body){

      // yippie

    });

### Multipart POST

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
      // the callback will return an error

    });

Credits
-------

Written by Tomás Pollak.

Legal
-----

(c) Copyright 2011 Fork Ltd. Licensed under the MIT license.
