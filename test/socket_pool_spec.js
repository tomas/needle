var needle  = require('../'),
    //sinon   = require('sinon'),
    should  = require('should'),
    http    = require('http'),
    //helpers = require('./helpers');
    server,
    port=11112;

describe('socket pool usage', function () {

  describe('socket end callbacks', function () {

    var httpAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 1
    });

    before(function(){
      server = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        setTimeout(function () {
          res.end('{"foo":"bar"}');
        }, 50);
      }).listen(port);
    });

    after(function(){
      server.close();
    });

    it('should not increase even if sockets are reused', function (done) {

      var testReqCount = 10;
      var completed = 0;

      var lastAssertError;
      for (var i = 0; i < testReqCount; i++) {
        needle.get('localhost:' + port, {agent: httpAgent}, function (err, resp) {
          if (err) {
            throw new Error("Unexpected error: " + err);
          } else {
            completed++;
            // lets go through all sockets and inspect all socket objects
            for(hostTarget in httpAgent.sockets) {
              httpAgent.sockets[hostTarget].forEach(function (socket) {
                // normally, there are 2 internal listeners and 1 needle sets up,
                // but to be sure the test does not fail even if newer node versions
                // introduce additional listeners, we use a higher limit.
                try {
                  socket.listeners('end').length.should.be.below(5, "too many listeners on the socket object's end event");
                } catch (e) {
                  lastAssertError = e;
                }
              });
            }
            if (testReqCount == completed) {
              done(lastAssertError);
            }
          }
        });
      }
    });

    it('should be called when a socket is closed down', function (done) {

      // This test case uses its own httpAgent to make sure we do not mess up any other
      // socket objects kept in keep-alive state by other tests.
      var httpAgent = new http.Agent({
          keepAlive: true,
          maxSockets: 1
      });

      needle.get('localhost:' + port, {agent: httpAgent}, function (err, resp) {
        if (err) {
          // we expect error as we just closed down the underlying socket.
          done();
        } else {
          done(new Error("Request was expected to fail since the socket was closed"));
        }
      });

      setTimeout(function () {
        for(hostTarget in httpAgent.sockets) {
          httpAgent.sockets[hostTarget].forEach(function (socket) {
            socket.emit('end');
          });
        }
      }, 0);
    });
  });
});
