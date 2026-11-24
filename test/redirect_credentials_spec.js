var helpers = require('./helpers'),
    should  = require('should'),
    needle  = require('./../');

var ports = { origin: 8895, other: 8896 };

describe('credentials and redirects to another origin', function() {

  var servers = {},
      seen    = [];

  before(function(done) {
    servers.origin = helpers.server({
      port    : ports.origin,
      code    : 301,
      headers : { 'Content-Type': 'text/plain', 'Location': 'http://127.0.0.1:' + ports.other + '/hello' }
    }, function() {
      servers.other = helpers.server({
        port    : ports.other,
        handler : function(req, res) {
          seen.push(req.headers);
          if (req.headers['authorization']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return res.end('ok');
          }
          res.writeHead(401, { 'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic realm="other"' });
          res.end('no');
        }
      }, done);
    });
  })

  after(function(done) {
    servers.origin.close(function() {
      servers.other.close(done);
    });
  })

  beforeEach(function() { seen = [] });

  ['auto', 'digest'].forEach(function(mode) {
    it('does not answer a challenge from the other origin (auth: ' + mode + ')', function(done) {
      var opts = { username: 'user', password: 'secret', auth: mode, follow_max: 1 };

      needle.get('http://127.0.0.1:' + ports.origin + '/hello', opts, function(err, resp) {
        should.not.exist(err);
        resp.statusCode.should.eql(401);
        seen.length.should.eql(1);
        seen.forEach(function(headers) {
          should.not.exist(headers['authorization']);
        })
        done();
      })
    })
  })

})
