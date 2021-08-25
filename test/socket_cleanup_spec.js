var should = require('should'),
    needle = require('./../'),
    fs = require('fs'),
    https = require('https'),
    stream = require('stream');

describe('socket cleanup', function(){

  this.timeout(5000);

  var outFile = 'test/tmp';
  var httpAgent, endFired, closeFired, file, url, readStream, writeStream

  function getActiveSockets() {
    return Object.keys(httpAgent.sockets).length
  }

  before(function() {
    httpAgent = new https.Agent({
      keepAlive  : true,
      maxSockets : 1
    });

    getActiveSockets().should.eql(0);

    endFired = false;
    closeFired = false;
    file = 'ubuntu-21.04-desktop-amd64.iso';
    url = 'https://releases.ubuntu.com/21.04/' + file;
    readStream = needle.get(url, { agent: httpAgent });
    writeStream = fs.createWriteStream(outFile);
  })

  after(function() {
    httpAgent.destroy()
    fs.unlinkSync(outFile);
  })

  it('should cleanup sockets on ERR_STREAM_PREMATURE_CLOSE (using .pipe)', function(done) {
    readStream.on('end', function(e) {
      endFired = true;
    });

    readStream.on('close', function(e) {
      closeFired = true;
    });

    readStream.pipe(writeStream);

    setTimeout(function() {
      writeStream.destroy();
    }, 100);

    setTimeout(function() {
      // done();
      // endFired.should.eql(true);
      // closeFired.should.eql(true);
      setTimeout(function() {
        console.log(getActiveSockets())
        getActiveSockets().should.eql(0);
        done();

      }, 300);
    }, 200)
  })

  // it('should cleanup sockets on ERR_STREAM_PREMATURE_CLOSE (using stream.pipeline)', function(done) {

  //   readStream.on('end', function(e) {
  //     endFired = true;
  //   });

  //   readStream.on('close', function(e) {
  //     closeFired = true;
  //   });

  //   stream.pipeline(readStream, writeStream, function(err) {
  //     // err.code.should.eql('ERR_STREAM_PREMATURE_CLOSE')
  //     // if (err) readStream.request.destroy();
  //   });

  //   setTimeout(function() {
  //     getActiveSockets().should.eql(0);
  //     writeStream.destroy();
  //   }, 3000);

  //   setTimeout(function() {
  //     getActiveSockets().should.eql(0);
  //     // endFired.should.eql(true);
  //     // closeFired.should.eql(true);
  //     done();
  //   }, 4000)

  // })


})