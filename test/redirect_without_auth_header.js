let helpers = require('./helpers'),
    should  = require('should'),
    needle  = require('./../'),
    server;

const port = 7708;

describe('Follow authorization header', function() {

  before( done => {
    server = helpers.server({ port: port, headers: {location: "home"}, code:302}, done);
  })

  after(done =>  {
    server.close(done);
  })
  
  describe('without headers', () => {

    it('without header', done => {
      needle.get('localhost:' + port, { parse: true, follow_max: 1, follow_authorization_header: true, headers: { 'authorization': 'token42' }}, function(err, resp, body) {
        resp.on('redirect', function (location) {
            console.log("location", location
            );
        })
         console.log(resp.headers);
        Object.keys(sent_headers).should.not.containEql('authorization');
        done();
      })
    })

  })

  describe('with header', () => {
    it('with header', done => {
      needle.get('localhost:' + port, { parse: true, follow_max: 1, follow_authorization_header: true, headers: { 'Authorization': 'token42' } }, (err, resp) => {
        const body = JSON.parse(resp.body.toString())
        const sent_headers = resp.headers;
        Object.keys(body.headers).should.containEql('authorization');
        done();
      })
    })

  });

});

