var helpers = require('./helpers'),
    should  = require('should'),
    needle  = require('./../'),
    server;

var port = 7708;

describe('Header casing', function() {

  before(function(done) {
    server = helpers.server({ port: port }, done);
  })

  after(function(done) {
    server.close(done);
  })

  ///////////////// helpers

  var get_auth = function(header) {
    var token  = header.split(/\s+/).pop();
    return token && Buffer.from(token, 'base64').toString().split(':');
  }

  describe('no option provided', function() {

    it('lower cases the headers', function(done) {
      needle.get('localhost:' + port, { parse: true, headers: { 'Test': 'foo' }}, function(err, resp) {
        var sent_headers = resp.body.headers;
        Object.keys(sent_headers).should.containEql('test');
        done();
      })
    })

  })

  describe('case_sensitive_headers flag provided', function() {

    it('header casing is not changed', function(done) {
      needle.get('localhost:' + port, { parse: true, headers: { 'Test': 'foo' }, case_sensitive_headers: true }, function(err, resp) {
        Object.keys(resp.body.raw_headers).should.containEql('Test');
        done();
      })
    })

  });

});
