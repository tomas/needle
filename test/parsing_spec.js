var should = require('should'),
    needle = require('./../'),
    http   = require('http'),
    port   = 11111,
    server;

describe('parsing', function(){

  describe('when response is an JSON string', function(){

    var json_string = '{"foo":"bar"}';

    before(function(done){
      server = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.end(json_string);
      }).listen(port, done);
    });

    after(function(done){
      server.close(done);
    })

    describe('and parse option is not passed', function() {

      describe('with default parse_response', function() {
        
        before(function() {
          needle.defaults().parse_response.should.eql('all')
        })

        it('should return object', function(done){
          needle.get('localhost:' + port, function(err, response, body){
            should.ifError(err);
            body.should.have.property('foo', 'bar');
            done();
          })
        })
        
      })

      describe('and default parse_response is set to false', function() {

        it('does NOT return object when disabled using .defaults', function(done){
          needle.defaults({ parse_response: false })
  
          needle.get('localhost:' + port, function(err, response, body) {
            should.not.exist(err);
            body.should.be.an.instanceof(Buffer)
            body.toString().should.eql('{"foo":"bar"}');
            
            needle.defaults({ parse_response: 'all' });
            done();
          })
        })

        
      })

    })

    describe('and parse option is true', function() {

      describe('and JSON is valid', function() {

        it('should return object', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, response, body){
            should.not.exist(err);
            body.should.have.property('foo', 'bar')
            done();
          })
        })

        it('should have a .parser = json property', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, resp) {
            should.not.exist(err);
            resp.parser.should.eql('json');
            done();
          })
        })

      });

      describe('and response is empty', function() {

        var old_json_string;

        before(function() {
          old_json_string = json_string;
          json_string = "";
        });

        after(function() {
          json_string = old_json_string;
        });

        it('should return an empty string', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, resp) {
            should.not.exist(err);
            resp.body.should.equal('');
            done();
          })
        })

      })

      describe('and JSON is invalid', function() {

        var old_json_string;

        before(function() {
          old_json_string = json_string;
          json_string = "this is not going to work";
        });

        after(function() {
          json_string = old_json_string;
        });

        it('does not throw', function(done) {
          (function(){
            needle.get('localhost:' + port, { parse: true }, done);
          }).should.not.throw();
        });

        it('does NOT return object', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, response, body) {
            should.not.exist(err);
            body.should.be.a.String;
            body.toString().should.eql('this is not going to work');
            done();
          })
        })

      });

    })

    describe('and parse option is false', function() {

      it('does NOT return object', function(done){
        needle.get('localhost:' + port, { parse: false }, function(err, response, body) {
          should.not.exist(err);
          body.should.be.an.instanceof(Buffer)
          body.toString().should.eql('{"foo":"bar"}');
          done();
        })
      })

      it('should NOT have a .parser = json property', function(done) {
        needle.get('localhost:' + port, { parse: false }, function(err, resp) {
          should.not.exist(err);
          should.not.exist(resp.parser);
          done();
        })
      })

    })

    describe('and parse option is "xml"', function() {

      it('does NOT return object', function(done){
        needle.get('localhost:' + port, { parse: 'xml' }, function(err, response, body) {
          should.not.exist(err);
          body.should.be.an.instanceof(Buffer)
          body.toString().should.eql('{"foo":"bar"}');
          done();
        })
      })

      it('should NOT have a .parser = json property', function(done) {
        needle.get('localhost:' + port, { parse: 'xml' }, function(err, resp) {
          should.not.exist(err);
          should.not.exist(resp.parser);
          done();
        })
      })

    })

  });

  describe('when response is JSON \'false\'', function(){

    var json_string = 'false';

    before(function(done){
      server = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'application/json');
        res.end(json_string);
      }).listen(port, done);
    });

    after(function(done){
      server.close(done);
    })

    describe('and parse option is not passed', function() {

      it('should return object', function(done){
        needle.get('localhost:' + port, function(err, response, body){
          should.ifError(err);
          body.should.equal(false);
          done();
        })
      })

    })

    describe('and parse option is true', function() {

      describe('and JSON is valid', function() {

        it('should return object', function(done){
          needle.get('localhost:' + port, { parse: true }, function(err, response, body){
            should.not.exist(err);
            body.should.equal(false)
            done();
          })
        })

      });

      describe('and response is empty', function() {

        var old_json_string;

        before(function() {
          old_json_string = json_string;
          json_string = "";
        });

        after(function() {
          json_string = old_json_string;
        });

        it('should return an empty string', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, resp) {
            should.not.exist(err);
            resp.body.should.equal('');
            done();
          })
        })

      })

      describe('and JSON is invalid', function() {

        var old_json_string;

        before(function() {
          old_json_string = json_string;
          json_string = "this is not going to work";
        });

        after(function() {
          json_string = old_json_string;
        });

        it('does not throw', function(done) {
          (function(){
            needle.get('localhost:' + port, { parse: true }, done);
          }).should.not.throw();
        });

        it('does NOT return object', function(done) {
          needle.get('localhost:' + port, { parse: true }, function(err, response, body) {
            should.not.exist(err);
            body.should.be.a.String;
            body.toString().should.eql('this is not going to work');
            done();
          })
        })

      });

    })

    describe('and parse option is false', function() {

      it('does NOT return object', function(done){
        needle.get('localhost:' + port, { parse: false }, function(err, response, body) {
          should.not.exist(err);
          body.should.be.an.instanceof(Buffer)
          body.toString().should.eql('false');
          done();
        })
      })

    })

    describe('and parse option is "xml"', function() {

      it('does NOT return object', function(done){
        needle.get('localhost:' + port, { parse: 'xml' }, function(err, response, body) {
          should.not.exist(err);
          body.should.be.an.instanceof(Buffer)
          body.toString().should.eql('false');
          done();
        })
      })

    })


  });

  describe('when response is an XML string', function(){

    before(function(done){
      server = http.createServer(function(req, res) {
        res.writeHeader(200, {'Content-Type': 'application/xml'})
        res.end("<post><body>hello there</body></post>")
      }).listen(port, done);
    });

    after(function(done){
      server.close(done);
    })

    describe('and xml2js library is present', function(){

      require.bind(null, 'xml2js').should.not.throw();

      describe('and parse_response is true', function(){

        it('should return valid object', function(done){
          needle.get('localhost:' + port, function(err, response, body){
            should.not.exist(err);
            body.post.should.have.property('body', 'hello there');
            done();
          })
        })

        it('should have a .parser = json property', function(done) {
          needle.get('localhost:' + port, function(err, resp) {
            should.not.exist(err);
            resp.parser.should.eql('xml');
            done();
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
