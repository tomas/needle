Needle
======

HTTP client for node. Support HTTP basic auth, nested params and multipart form
uploads. Really simple stuff, less than 200 lines of code.

Usage
-----

var client = require('needle');

client.get(url, [options], callback(err, body, resp)
client.post(url, [data], [options], callback(err, body, resp)
client.put(url, [data], [options], callback(err, body, resp)
client.delete(url, [options], callback(err, body, resp)

Options
------

 - timeout: default 10000 (10 secs)
 - multipart: use multipart encoding or not. defaults to false
 - username: for http auth
 - password: for http auth
 - parse: whether to parse XML or JSON response bodies automagically. defaults to true.

Examples
--------

### Simple GET.

var client = require('needle');

    client.get('http://www.google.com', function(err, body, resp){

      console.log("Got status code: " + resp.statusCode);

    });

### GET with options

    var options = {
      username: 'you',
      password: 'secret',
      headers: {
        'User-Agent': "MyApp/1.2.3"
      }
    }

    client.get('http://api.server.com', options, function(err, body, resp){

      // used HTTP auth

    });

### POST/PUT

    var data = {
      foo: 'bar',
      nested: {
        params: {
          are: {
            also: possible
          }
        }
      }
    }

    client.post('http://my.app.com', data, function(err, body, resp){

      // yay

    });

### Multipart POST

    var data = {
      foo: bar,
      image: { file: '/home/tomas/linux.png', type: 'image/png' }
    }

    var options = {
      multipart: true,
      timeout: 10000
    }

    client.post('http://my.other.app.com', data, options, function(err, body, resp){

      // in this case, if the request takes more than 10 seconds
      // the callback will return an error

    });

Credits
-------

Written by Tomás Pollak.

Legal
-----

(c) Copyright 2011 Fork Ltd. Licensed under the MIT license.
