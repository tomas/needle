var needle  = require('../'),
    sinon   = require('sinon'),
    should  = require('should'),
    http    = require('http'),
    cookies = require('../lib/cookies');

describe('cookies', function() {

  var last_req;

  var server = http.createServer(function(req, res) {
    last_req = req;
    res.end('Thanks.');
  })

  before(function(done) {
    server.listen(function() {
      port = this.address().port;
      done();
    });
  })

  after(function(done) {
    server.close(done)
  })

  describe('with default options', function() {

    it('no cookie header is set on request', function() {

    })

  })

  describe('if response does not contain cookies', function() {

    it('resp.cookies is undefined', function() {

    })

  })

  describe('if response contains cookies', function() {

    it('parses them', function() {

    })

    it('puts them on resp.cookies', function() {

    })

    describe('and response is a redirect', function() {

      describe('and follow_set_cookies is false', function() {

      })

      describe('and follow_set_cookies is true', function() {
        
      })

    })

  })

  describe('when passing an object on options.cookies', function() {

    it('sets the cookies', function() {

    })

  })

});