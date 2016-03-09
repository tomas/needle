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
        res.setHeader('Content-Type', 'application/json')
        res.end('{"foo":"bar"}')
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
    })
  });
});
