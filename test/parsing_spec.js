var should = require('should'),
    needle = require('./../'),
    http = require('http'),
    port = 11111,
    server;

describe('parsing', function(){

  describe('when response is an JSON string', function(){

    before(function(){
      server = http.createServer(function(req, res) {
        res.setHeaders({'Content-Type': 'application/json'})
        res.end('{"foo":"bar"}')
      }).listen(port);
    });

    after(function(){
      server.close();
    })

    describe('and parse option is not passed', function() {

      it('should return object', function(){
        needle.get('localhost:' + port, function(err, response, body){
          should.not.exist(err);
          body.should.equal({foo: 'bar'});
        })
      })

    })

    describe('and parse option is true', function() {

      it('should return object', function(){
        needle.get('localhost:' + port, { parse: true }, function(err, response, body){
          should.not.exist(err);
          body.should.equal({foo: 'bar'});
        })
      })

    })

    describe('and parse option is false', function() {

      it('does NOT return object', function(){
        needle.get('localhost:' + port, { parse: false }, function(err, response, body) {
          should.not.exist(err);
          body.should.equal('{"foo":"bar"}');
        })
      })

    })

  });

  describe('when response is an XML string', function(){

    before(function(){
      server = http.createServer(function(req, res) {
        res.writeHeader(200, {'Content-Type': 'application/xml'})
        res.end("<post><body>hello there</body></post>")
      }).listen(port);
    });

    after(function(){
      server.close();
    })

    describe('and xml2js library is present', function(){

      describe('and parse_response is true', function(){

        it('should return JSON object', function(){
          needle.get('localhost:' + port, function(err, response, body){
            should.not.exist(err);
            body.should.equal({post: {body: 'hello there'}});
          })
        })

      })

      describe('and parse response is not true', function(){

        it('should return xml string', function(){



        })

      })

    })

    describe('and xml2js is not found', function(){

      it('should return xml string', function(){

      })

    })


  })


})
