var needle  = require('../'),
    sinon   = require('sinon'),
    should  = require('should'),
    http    = require('http'),
    Emitter = require('events').EventEmitter,
    helpers = require('./helpers');

var get_catch = function(url, opts) {
  var err;
  try {
    needle.get(url, opts);
  } catch(e) {
    err = e;
  }
  return err;
}

describe('errors', function(){

  describe('null URL', function(){

    it('throws', function(){
      var ex = get_catch(); // null
      should.exist(ex);
      ex.should.be.an.instanceOf(TypeError);
      ex.message.should.containEql('URL must be a string');
    })

  })

/*

  describe('invalid protocol', function(){

    var url = 'foo://www.google.com/what'

    it('throws', function(){
      var ex = get_catch(url);
      should.exist(ex);
    })

  })

  describe('invalid host', function(){

    var url = 'http://s1\\\2.com/'

    it('throws', function(){
      var ex = get_catch(url);
      should.exist(ex);
    })

  })

  describe('invalid path', function(){

    var url = 'http://www.google.com\\\/x\\\    /x2.com/'

    it('throws', function(){
      var ex = get_catch(url);
      should.exist(ex);
    })

  })

*/

  describe('when host does not exist', function(){

    var url = 'http://unexistinghost/foo';

    describe('with callback', function() {

      it('does not throw', function(){
        var ex = get_catch(url);
        should.not.exist(ex);
      })

      it('callbacks an error', function(done) {
        needle.get(url, function(err){
          err.should.be.a.Error;
          done();
        })
      })

      it('error should be ENOTFOUND', function(done){
        needle.get(url, function(err){
          err.code.should.match(/ENOTFOUND|EADDRINFO/)
          done();
        })
      })

      it('does not callback a response', function(done){
        needle.get(url, function(err, resp){
          should.not.exist(resp);
          done();
        })
      })

    })

    describe('without callback', function() {

      it('does not throw', function(){
        var ex = get_catch(url);
        should.not.exist(ex);
      })

      it('emits end event once, with error', function(done) {
        var called = 0,
            stream = needle.get(url);

        stream.on('end', function(err) {
          called++;
        })

        setTimeout(function() {
          called.should.equal(1);
          done();
        }, 50)
      })

      it('error should be ENOTFOUND or EADDRINFO', function(done){
        var error,
            stream = needle.get(url);

        stream.on('end', function(err) {
          error = err;
        })

        setTimeout(function() {
          error.code.should.match(/ENOTFOUND|EADDRINFO/)
          done();
        }, 50)
      })

      it('does not emit a readable event', function(done){
        var called = false,
            stream = needle.get(url);

        stream.on('readable', function() {
          called = true;
        })

        setTimeout(function() {
          called.should.be.false;
          done();
        }, 50)
      })

    })

  })

  describe('when request timeouts', function(){

    var server,
        url = 'http://localhost:3333/foo';

    var send_request = function(cb) {
      return needle.get(url, { timeout: 200 }, cb);
    }

    before(function(){
      server = helpers.server({ port: 3333, wait: 1000 });
    })

    after(function(){
      server.close();
    })

    describe('with callback', function() {

      it('aborts the request', function(done){

        var time = new Date();

        send_request(function(err){
          var timediff = (new Date() - time);
          timediff.should.be.within(200, 300);
          done();
        })

      })

      it('callbacks an error', function(done){
        send_request(function(err){
          err.should.be.a.Error;
          done();
        })
      })

      it('error should be ECONNRESET', function(done){
        send_request(function(err){
          err.code.should.equal('ECONNRESET')
          done();
        })
      })

      it('does not callback a response', function(done) {
        send_request(function(err, resp){
          should.not.exist(resp);
          done();
        })
      })

    })

    describe('without callback', function() {

      it('emits end event once, with error', function(done) {
        var called = 0,
            stream = send_request();

        stream.on('end', function(err) {
          called++;
        })

        setTimeout(function() {
          called.should.equal(1);
          done();
        }, 250)
      })

      it('aborts the request', function(done){

        var time = new Date();
        var stream = send_request();

        stream.on('end', function(err) {
          var timediff = (new Date() - time);
          timediff.should.be.within(200, 300);
          done();
        })

      })

      it('error should be ECONNRESET', function(done){
        var error,
            stream = send_request();

        stream.on('end', function(err) {
          error = err;
        })

        setTimeout(function() {
          error.code.should.equal('ECONNRESET')
          done();
        }, 250)
      })

      it('does not emit a readable event', function(done){
        var called = false,
            stream = send_request();

        stream.on('readable', function() {
          called = true;
        })

        setTimeout(function() {
          called.should.be.false;
          done();
        }, 250)
      })

    })

  })

})
