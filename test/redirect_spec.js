var helpers = require('./helpers'),
    should  = require('should'),
    sinon   = require('sinon'),
    needle  = require('./../');

var ports = {
  http : 8888,
  https : 9999
}

var protocols = {
  http  : require('http'),
  https : require('https')
}

var code = 301;
var location; // var to set the response location

function response_code() {
  return code;
}

function response_headers() {
  return { 'Content-Type': 'text/plain', 'Location': location }
}

describe('redirects', function() {

  var spies   = {},
      servers = {};

  var current_protocol;
  var hostname = require('os').hostname();

  // open two servers, one that responds to a redirect 
  before(function(done) {

    var opts = {
      port    : ports.http,
      code    : response_code,
      headers : response_headers
    }

    servers.http = helpers.server(opts, function() {
      opts.port = ports.https;
      opts.protocol = 'https';
      servers.https = helpers.server(opts, done);
    });
  })

  after(function(done) {
    servers.http.close(function() {
      servers.https.close(done);
    });
  })

  var prots = {'http': 'http'};
  Object.keys(prots).forEach(function(protocol) {

    current_protocol = protocol;
    var other_protocol = protocol == 'http' ? 'https' : 'http';

    var opts, // each test will modify this
        url = protocol + '://localhost:' + ports[protocol] + '/hello';

    function send_request(opts, cb) {
      opts.rejectUnauthorized = false;
      needle.post(url, { foo: 'bar' }, opts, cb);
    }

    function not_followed(done) {
      send_request(opts, function(err, resp) {
        resp.statusCode.should.eql(301);
        if (current_protocol == 'http') {
          spies.http.callCount.should.eql(1); // only original request
          spies.https.callCount.should.eql(0);
        } else {
          spies.http.callCount.should.eql(0); 
          spies.https.callCount.should.eql(1); // only original request
        }
        done();
      })
    }

    function followed(done) {
      // var target = url.match(/https?/)[0];
      // since we're expecting the request to hit [url] using [current_protocol].request
      // we'll stub the [current_protoco].request method in order to toggle the second
      // [target_protocol].request call to get a non-redirect response. otherwise
      // we'll get several requests

      send_request(opts, function(err, resp) {
        // resp.statusCode.should.eql(301);

        spies.http.callCount.should.eql(1); 
        spies.https.callCount.should.eql(10); 
        done();
      })
    }

    // set a spy on [protocol].request 
    // so we can see how many times a request was made
    before(function() {
      spies.http  = sinon.spy(protocols.http, 'request');
      spies.https = sinon.spy(protocols.https, 'request');
    })
    
    // and make sure it is restored after each test
    afterEach(function() {
      spies.http.reset();
      spies.https.reset();
    })

    after(function() {
      spies.http.restore();
      spies.https.reset();
    })

    // false and null have the same result
    var values = [false, null];
    values.forEach(function(value) {

      describe('when follow is ' + value, function() {

        before(function() {
          opts = { follow: value };
        })

        describe('and redirected to the same path on same host and protocol', function() {
          location = url;
          it('does not follow redirect', not_followed);
        })

        describe('and redirected to the same path on same host and different protocol', function() {
          location = url.replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
          it('does not follow redirect', not_followed);
        })

        describe('and redirected to a different path on same host, same protocol', function() {
          location = url.replace('/hello', '/goodbye');
          it('does not follow redirect', not_followed);
        })

        describe('and redirected to a different path on same host, different protocol', function() {
          location = url.replace('/hello', '/goodbye').replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
          it('does not follow redirect', not_followed);
        })

        describe('and redirected to same path on another host, same protocol', function() {
          location = url.replace('localhost', hostname);
          it('does not follow redirect', not_followed);
        })

        describe('and redirected to same path on another host, different protocol', function() {
          location = url.replace('localhost', hostname).replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
          it('does not follow redirect', not_followed);
        })

      })

    })

    describe('when follow is true', function() {

      before(function() {
        opts = { follow: true };
      })

      describe('and redirected to the same path on same host and protocol', function() {
        location = url;
        it('does not follow redirect', not_followed);
      })

      describe('and redirected to the same path on same host and different protocol', function() {
        location = url.replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]).replace(ports[protocol], ports[other_protocol]);
        it('follows redirect', followed);

        // we only need to test this once
        it('sends a GET request with no data', function(done) {
          send_request(opts, function(err, resp) {
            // if via http, the receiving protocol.request should be https
            // if via https, the receiving protocol.request should be http
            spies[other_protocol].args[0][0].method.should.eql('GET');
            // spy.args[0][3].should.eql(null);
            done();
          })
        })

      })

      describe('and redirected to a different path on same host, same protocol', function() {
        location = url.replace('/hello', '/goodbye');
        it('follows redirect', followed);
      })

      describe('and redirected to a different path on same host, different protocol', function() {
        location = url.replace('/hello', '/goodbye').replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
        it('follows redirect', followed);
      })

      describe('and redirected to same path on another host, same protocol', function() {
        location = url.replace('localhost', hostname);
        it('follows redirect', followed);
      })

      describe('and redirected to same path on another domain, different protocol', function() {
        location = url.replace('localhost', hostname).replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
        it('follows redirect', followed);
      })

    })

    describe('when follow is an object', function() {

      before(function() {
        opts = { follow: {} };
      })

/*
      describe('and max is null', function() {

      })

      describe('and max is a number', function() {

      })

      describe('and max is a boolean', function() {
        
      })
*/

      describe('and keep_method is false', function() {

        before(function() {
          opts.keep_method = false;
        })
        
        // defaults to follow host and protocol
        describe('and redirected to the same path on same host and different protocol', function() {

          location = url.replace(protocol, other_protocol);

          it('follows redirect', followed);

          it('sends a GET request with no data', function(done) {
            send_request(opts, function(err, resp) {
              spies.http.args[0][0].method.should.eql('GET');
              // spy.args[0][3].should.eql(null);
              done();
            })
          })

        })

      })

      describe('and keep_method is true', function() {

        before(function() {
          opts.keep_method = true;
        })

        // defaults to follow host and protocol
        describe('and redirected to the same path on same host and different protocol', function() {

          location = url.replace(protocol, other_protocol);

          it('follows redirect', followed);

          it('sends a POST request with the original data', function(done) {
            send_request(opts, function(err, resp) {
              spies.http.args[0][0].method.should.eql('POST');
              // spies.http.args[0][3].should.eql({ foo: 'bar'});
              done();
            })
          })

        })

      })

      describe('and if_same_host is false', function() {

        before(function() {
          opts.if_same_host = false;
        })

        // by default it will follow other protocols
        describe('and redirected to same path on another domain, same protocol', function() {
          location = url.replace('localhost', hostname);
          it('follows redirect', followed);
        })

      })

      describe('and if_same_host is true', function() {

        before(function() {
          opts.if_same_host = true;
        })

        // by default it will follow other protocols
        describe('and redirected to same path on another domain, same protocol', function() {
          location = url.replace('localhost', hostname);
          it('does not follow redirect', not_followed);
        })
        
      })

      describe('and if_same_protocol is false', function() {

        before(function() {
          opts.if_same_protocol = false;
        })

        // by default it will follow other hosts
        describe('and redirected to same path on another domain, different protocol', function() {
          location = url.replace('localhost', hostname).replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
          it('follows redirect', followed);
        })

      })

      describe('and if_same_protocol is true', function() {

        before(function() {
          opts.if_same_protocol = true;
        })

        // by default it will follow other hosts
        describe('and redirected to same path on another domain, different protocol', function() {
          location = url.replace('localhost', hostname).replace(protocol, other_protocol).replace(ports[protocol], ports[other_protocol]);
          it('does not follow redirect', not_followed);
        })
        
      })

    })

  })

});
