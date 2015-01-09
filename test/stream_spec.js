var should = require('should'),
    needle = require('./../'),
    http   = require('http'),
    stream = require('stream'),
    fs     = require('fs'),
    port   = 11111,
    server;

describe('stream', function() {

  describe('when the server sends back json', function(){

    before(function(){
      server = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.end('{"foo":"bar"}');
      }).listen(port);
      serverTimeout = http.createServer(function(req, res) {
        setTimeout(function() { res.end(); }, 3);
      }).listen(port + 1);
      serverTimeoutOnResponse = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.write('a');
        setTimeout(function() { res.end('bcde'); }, 3);
      }).listen(port + 2);
    });

    after(function(){
      server.close();
      serverTimeout.close();
      serverTimeoutOnResponse.close();
    })

    describe('and the client uses streams', function(){

      it('should create a proper streams2 stream', function(done) {
        var stream     = needle.get('localhost:' + port)

        stream._readableState.flowing.should.be.false;

        var readableCalled = false;
        stream.on('readable', function () {
          readableCalled = true;
        })

        stream.on('end', function () {
          readableCalled.should.be.true;
          done();
        });

        stream.resume();
      })

      it('should emit a single data item which is our JSON object', function(done) {
        var stream     = needle.get('localhost:' + port)

        var chunks = [];
        stream.on('readable', function () {
          while (chunk = this.read()) {
            chunk.should.be.an.Object;
            chunks.push(chunk);
          }
        })

        stream.on('end', function () {
          chunks.should.have.length(1)
          chunks[0].should.have.property('foo', 'bar');
          done();
        });
      })

      it('should emit response event and the argument is an http.IncomingMessage instance.', function(done) {
        var stream     = needle.get('localhost:' + port)

        stream.on('response', function (resp) {
          resp.should.be.an.instanceOf(http.IncomingMessage);
          done();
        });
      })

      it('should emit error event and the argument is an Error instance.', function(done) {
        var stream     = needle.get('localhost:' + (port + 1), {timeout: 1});

        stream.on('error', function (err) {
          err.should.be.an.instanceOf(Error);
          done();
        });
      })

      it('should emit timeout event if request timeout.', function(done) {
        var stream     = needle.get('localhost:' + (port + 1), {timeout: 1});

        stream.on('timeout', function (what) {
          what.should.equal('request');
          done();
        });
      })

      it('should emit timeout event if response timeout.', function(done) {
        var stream     = needle.get('localhost:' + (port + 2), {timeout: 1});

        stream.on('timeout', function (what) {
          what.should.equal('response');
          done();
        });
      })

      it('should emit a raw buffer if we do not want to parse JSON', function(done) {
        var stream     = needle.get('localhost:' + port, {parse: false})

        var chunks = [];
        stream.on('readable', function () {
          while (chunk = this.read()) {
            Buffer.isBuffer(chunk).should.be.true;
            chunks.push(chunk);
          }
        })

        stream.on('end', function () {
          var body = Buffer.concat(chunks).toString();
          body.should.equal('{"foo":"bar"}')
          done();
        });
      })

    })
  })

  describe('when the server sends back what was posted to it', function () {
    var file = 'asdf.txt';

    before(function(done){
      server = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/octet')
        req.pipe(res);
      }).listen(port);

      fs.writeFile(file, 'contents of stream', done);
    });

    after(function(done){
      server.close();
      fs.unlink(file, done);
    })

    it('can PUT a stream', function (done) {
      var stream = needle.put('localhost:' + port, fs.createReadStream(file), { stream: true });

      var chunks = [];
      stream.on('readable', function () {
        while (chunk = this.read()) {
          Buffer.isBuffer(chunk).should.be.true;
          chunks.push(chunk);
        }
      })

      stream.on('end', function () {
        var body = Buffer.concat(chunks).toString();
          body.should.equal('contents of stream')
          done();
      });
    });
  })
})
