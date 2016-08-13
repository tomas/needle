var helpers = require('./helpers'),
    should  = require('should'),
    needle  = require('./../'),
    server;

var port = 7707;
var sent_uri;
var path = '/>=6.9.0%20<7.0.0';
var uri = 'localhost:' + port + path;

describe.only('URI', function() {

  before(function(done) {
    server = helpers.server({ port: port }, done);

    server.on('request', function (req, res) {
      sent_uri = req.url;
    });
  })

  after(function(done) {
    server.close(done);
  })

  describe('when no encode_uri option passed', function() {

    it('should not encode URI', function(done) {
      needle.get(uri, function(err, resp) {
        sent_uri.should.eql('/%3E=6.9.0%20%3C7.0.0');
        done();
      })
    })

    it('should not encode URI', function(done) {
      needle.get(uri, { encode_uri: true }, function(err, resp) {
        sent_uri.should.eql('/%3E=6.9.0%2520%3C7.0.0');
        done();
      })
    })

  })
})
