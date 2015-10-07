var should  = require('should'),
    fs      = require('fs'),
    needle  = require('./../');

var port1 = 8888, port2 = 8889;

describe('retry request', function() {
  var spies   = {},
      servers = [];

  // open 2 servers:
  // one that that receives a connection and hangup immediately for every request
  // a second that hangs up the first connection and them succeeds in the second
  before(function(done) {
    // server 1
    var server = require('http').createServer(function(req, res){
      res.socket.destroy();
    });
    server.listen(port1, function(){
    });

    servers.push(server);

    // server 2
    var connCount = 0;
    server = require('http').createServer(function(req, res){
      connCount++;
      if(connCount > 1){
        res.end('ok');
      }else{
        res.socket.destroy();
      }
    });
    server.listen(port2, function(){
    });
    servers.push(server);
    done();
  });

  after(function(done){
    servers[0].close(function(){
      servers[1].close(done);
    });
  })

  describe('when receives a ECONNRESET error', function(){
    it('should retry connection five times and then reach connection limit', function(done){

      function retry_five_times(err){
        err.code.should.eql('ECONNRESET');
        numberOfTries.should.eql(5);
        done();
      }

      var obj = needle.get('http://127.0.0.1:' + port1, { retry_request: true, retry_request_wait: 100 }, retry_five_times),
          numberOfTries = 1;

      obj.on('retry_request', function(){
        numberOfTries++;
      });
    })

    it('should retry connection one time and then receive some response', function(done){

      function retry_and_succeeds(err, res, body){
        numberOfTries.should.eql(2);
        body.toString().should.eql('ok');
        done();
      }

      var obj = needle.get('http://127.0.0.1:' + port2, { retry_request: true, retry_request_wait: 100 }, retry_and_succeeds),
          numberOfTries = 1;

      obj.on('retry_request', function(){
        numberOfTries++;
      });
    })
  });
});
