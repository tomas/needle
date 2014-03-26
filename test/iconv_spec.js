var should  = require('should'),
    needle  = require('./../'),
    async   = require('async'),
    chardet = require('jschardet');

describe('character encoding', function(){

  describe('when server send non-UTF8 data', function(){

    it('client should convert this to UTF-8', function(done){

      // Our Needle wrapper that requests a chinese website.
      var task    = needle.get.bind(needle, 'http://www.chinesetop100.com/');

      // Different instantiations of this task
      var streams = [task({decode: true}),
                     task({decode: false})];

      // Async function that detects a stream's encoding
      var detectEncoding = function (stream, done) {
        var buf = [];

        stream.on('readable', function () {
          var stream = this,
              chunk  = null;

          while (chunk = stream.read()) {
            buf.push(chunk);
          }
        })

        stream.on('end', function () {
          done(null, chardet.detect(Buffer.concat(buf)))
        })
      }

      // Collect all encoding results and validate.
      async.map(streams, detectEncoding, function (err, results) {
        results[0].encoding.should.equal('utf-8')
        results[1].encoding.should.not.equal(results[0].encoding);

        done();
      })
    })
  })
})
