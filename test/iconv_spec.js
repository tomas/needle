var should = require('should'),
    needle = require('./../'),
    Q      = require('q'),
    chardet = require('jschardet');

describe('character encoding', function(){

  describe('when server send non-UTF8 data', function(){

    it('client should convert this to UTF-8', function(done){

      // Our Needle wrapper that requests a chinese website.
      var task    = Q.nbind(needle.get, needle, 'http://www.chinesetop100.com/');

      // Different instantiations of this task
      var tasks   = [Q.fcall(task, {decode: true}),
                     Q.fcall(task, {decode: false})];

      var results = tasks.map(function (task) {
        return task.then(function (obj) {
          return obj[0].body;
        });
      });

      var charsets = results.map(function (task) {
        return task.then(function (body) {
          return chardet.detect(body).encoding;
        });
      })

      // Execute all requests concurrently
      Q.all(charsets).done(function (results) {
        // We wanted to decode our first stream..
        results[0].should.have.equal('utf-8')

        // But not our second stream..
        results[1].should.not.equal(results[0]);

        // :TODO: is there any other way we can validate this?
        done();
      });
    })
  })
})
