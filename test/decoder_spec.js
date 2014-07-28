var should = require('should'),
    needle = require('./../'),
    Q      = require('q');

var target = 'http://www.chinesetop100.com/';

describe('decode (' + target + ')', function(){

  describe('when server send non-UTF8 data', function(){

    it('client should convert this to UTF-8 and the body should contains 全球中文网站前二十强', function(done){

      // Our Needle wrapper that requests a chinese website.
      var task    = Q.nbind(needle.get, needle, target);

      // Different instantiations of this task
      var tasks   = [Q.fcall(task, {decode: true}),
                     Q.fcall(task, {decode: false})];

      var results = tasks.map(function (task) {
        return task.then(function (obj) {
          return obj[0].body;
        });
      });

      // Execute all requests concurrently
      Q.all(results).done(function (bodys) {
        // We wanted to decode our first stream, and the body should contains '全球中文网站前二十强'
        bodys[0].indexOf('全球中文网站前二十强').should.not.equal(-1);

        // But not our second stream..
        bodys[1].indexOf('全球中文网站前二十强').should.equal(-1);

        done();
      });
    })
  })
})
