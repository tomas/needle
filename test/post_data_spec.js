var needle  = require('..'),
    http    = require('http'),
    should  = require('should'),
    sinon   = require('sinon'),
    stream  = require('stream'),
    helpers = require('./helpers');

var multiparts = ['----------------------NODENEEDLEHTTPCLIENT'];
multiparts.push(['Content-Disposition: form-data; name=\"foo\"'])
multiparts.push(['\r\nbar\r\n----------------------NODENEEDLEHTTPCLIENT--'])

describe('post data (e.g. request body)', function() {

  var stub, spy, server;

  before(function(done) {
    server = helpers.server({ port: 4321 }, done);
  })

  after(function(done) {
    server.close(done);
  })

  afterEach(function() {
    if (stub) stub.restore();
    if (spy) spy.restore();
  })

  function get(data, opts, cb) {
    return needle.request('get', 'http://localhost:' + 4321, data, opts, cb)
  }

  function post(data, opts, cb) {
    return needle.request('post', 'http://localhost:' + 4321, data, opts, cb)
  }

  function spystub_request() {
    var http_req = http.request;
    stub = sinon.stub(http, 'request', function(opts, cb) {
      var req = http_req(opts, cb);
      spy = sinon.spy(req, 'write');
      return req;
    })
  }

  function check_request(method) {
    stub.calledOnce.should.be.true;
    stub.args[0][0]['headers']['host'].should.equal('localhost:4321');
    stub.args[0][0]['method'].should.equal(method);
  }

  describe('with multipart: true', function() {

    describe('when null', function() {

      it('sends request (non multipart)', function(done) {
        spystub_request();

        post(null, { multipart: true }, function(err, resp) {
          check_request('post');
          done();
        })
      })

      it('doesnt set Content-Type header', function(done) {
        post(null, { multipart: true }, function(err, resp) {
          should.not.exist(resp.body.headers['content-type']);
          done();
        })
      })

      it('doesnt change default Accept header', function(done) {
        post(null, { multipart: true }, function(err, resp) {
          // resp.body contains 'header' and 'body', mirroring what we sent
          resp.body.headers['accept'].should.equal('*/*');
          done();
        })
      })

      it('doesnt write anything', function(done) {
        spystub_request();

        post(null, { multipart: true }, function(err, resp) {
          spy.called.should.be.false;
          resp.body.body.should.eql('');
          done();
        })
      })

    })

    describe('when string', function() {

      it('explodes', function() {
        (function() {
          post('foobar', { multipart: true })
        }).should.throw()
      })

    })

    describe('when object', function() {

      describe('get request', function() {

        it('sends request', function(done) {
          spystub_request();

          get({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            check_request('get');
            done();
          })
        })

        it('sets Content-Type header', function(done) {
          post({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            resp.body.headers['content-type'].should.equal('multipart/form-data; boundary=--------------------NODENEEDLEHTTPCLIENT');
            done();
          })
        })

        it('doesnt change default Accept header', function(done) {
          post({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            resp.body.headers['accept'].should.equal('*/*');
            done();
          })
        })

        it('writes string as buffer', function(done) {
          spystub_request();

          get({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            spy.called.should.be.true;

            spy.args[0][0].should.be.a.Buffer;
            spy.args[0][0].toString().should.equal(multiparts.join('\r\n'));
            resp.body.body.should.eql(multiparts.join('\r\n'));
            done();
          })
        })

      })

      describe('post request', function() {

        it('sends request', function(done) {
          spystub_request();

          post({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            check_request('post');
            done();
          })
        })

        it('writes string as buffer', function(done) {
          spystub_request();

          post({ foo: 'bar' }, { multipart: true }, function(err, resp) {
            spy.called.should.be.true;
            spy.args[0][0].should.be.a.Buffer;
            spy.args[0][0].toString().should.equal(multiparts.join('\r\n'));
            resp.body.body.should.eql(multiparts.join('\r\n'));
            done();
          })
        })

      })

    })

    describe('when stream', function() {

      var stream_for_multipart;

      before(function() {
        stream_for_multipart = new stream.Readable();
        stream_for_multipart._read = function() {
          this.push('foobar');
          this.push(null);
        }
      })

      it('explodes', function() {
        (function() {
          post(stream_for_multipart, { multipart: true })
        }).should.throw()
      })

    })

  })

  describe('non multipart', function() {

    describe('when null', function() {

      describe('get request', function() {

        it('sends request', function(done) {
          spystub_request();

          get(null, {}, function(err, resp) {
            check_request('get');
            done();
          })
        })

        it('doesnt write anything', function(done) {
          spystub_request();

          get(null, {}, function(err, resp) {
            spy.called.should.be.false;
            resp.body.body.should.eql('');
            done();
          })
        })

      })

      describe('post request', function() {

        it('sends request', function(done) {
          spystub_request();

          post(null, {}, function(err, resp) {
            check_request('post');
            done();
          })
        })

        it('doesnt write anything', function(done) {
          spystub_request();

          post(null, {}, function(err, resp) {
            spy.called.should.be.false;
            resp.body.body.should.eql('');
            done();
          })
        })

      })

    })

    describe('when string with no equal sign', function() {

      describe('get request', function() {

        it('explodes', function() {
          (function() {
            get('foobar', {})
          }).should.throw()
        })

      })

      describe('post request', function() {

        it('sends request', function(done) {
          spystub_request();

          post('foobar', {}, function(err, resp) {
            check_request('post');
            done();
          })
        })

        it('writes string as buffer', function(done) {
          spystub_request();

          post('foobar', {}, function(err, resp) {
            spy.called.should.be.true;
            spy.args[0][0].should.be.a.Buffer;
            spy.args[0][0].toString().should.equal('foobar');
            resp.body.body.should.eql('foobar');
            done();
          })
        })

      })

    })

    describe('when string WITH equal sign', function() {

      describe('get request', function() {

        describe('with json: false (default)', function() {

          it('sends request, adding data as querystring', function(done) {
            spystub_request();

            get('foo=bar', { json: false }, function(err, resp) {
              check_request('get');
              stub.args[0][0]['path'].should.equal('/?foo=bar')
              done();
            })
          })

          it('doesnt set Content-Type header', function(done) {
            get('foo=bar', { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              should.not.exist(resp.body.headers['content-type']);
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            get('foo=bar', { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('doesnt write anything', function(done) {
            get('foo=bar', { json: false }, function(err, resp) {
              spy.called.should.be.false;
              resp.body.body.should.eql('');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request, without setting a querystring', function(done) {
            spystub_request();

            get('foo=bar', { json: true }, function(err, resp) {
              check_request('get');
              stub.args[0][0]['path'].should.equal('/')
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            get('foo=bar', { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            get('foo=bar', { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes raw string (assuming it already is JSON, so no JSON.stringify)', function(done) {
            get('foo=bar', { json: true }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].toString().should.eql('foo=bar')
              resp.body.body.should.eql('foo=bar');
              done();
            })
          })

        })

      })

      describe('post request', function() {

        describe('with json: false (default)', function() {

          it('sends request', function(done) {
            spystub_request();

            post('foo=bar', { json: false }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header to www-form-urlencoded', function(done) {
            post('foo=bar', { json: false }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/x-www-form-urlencoded');
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            post('foo=bar', { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('writes as buffer', function(done) {
            post('foo=bar', { json: false }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].should.be.a.Buffer;
              spy.args[0][0].toString().should.equal('foo=bar');
              resp.body.body.should.eql('foo=bar');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request', function(done) {
            spystub_request();

            post('foo=bar', { json: true }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            post('foo=bar', { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            post('foo=bar', { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes raw string (assuming it already is JSON, so no JSON.stringify)', function(done) {
            post('foo=bar', { json: true }, function(err, resp) {
              spy.called.should.be.true;
              var json = JSON.stringify('foo=bar');
              spy.args[0][0].toString().should.eql('foo=bar')
              resp.body.body.should.eql('foo=bar');
              done();
            })
          })

        })

      })

    })

    describe('when object', function() {

      describe('get request', function() {

        describe('with json: false (default)', function() {

          it('sends request, adding data as querystring', function(done) {
            spystub_request();

            get({ foo: 'bar' }, { json: false }, function(err, resp) {
              check_request('get');
              stub.args[0][0]['path'].should.equal('/?foo=bar')
              done();
            })
          })

          it('doesnt set Content-Type header', function(done) {
            get({ foo: 'bar' }, { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              should.not.exist(resp.body.headers['content-type']);
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            get({ foo: 'bar' }, { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('doesnt write anything', function(done) {
            get({ foo: 'bar' }, { json: false }, function(err, resp) {
              spy.called.should.be.false;
              resp.body.body.should.eql('');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request, without setting a querystring', function(done) {
            spystub_request();

            get({ foo: 'bar' }, { json: true }, function(err, resp) {
              check_request('get');
              stub.args[0][0]['path'].should.equal('/')
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            get({ foo: 'bar' }, { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            get({ foo: 'bar' }, { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes JSON.stringify version of object', function(done) {
            get({ foo: 'bar' }, { json: true }, function(err, resp) {
              spy.called.should.be.true;
              var json = JSON.stringify({ foo: 'bar'})
              spy.args[0][0].toString().should.eql(json)
              resp.body.body.should.eql(json);
              done();
            })
          })

        })

      })

      describe('post request', function() {

        describe('with json: false (default)', function() {

          it('sends request', function(done) {
            spystub_request();

            post({ foo: 'bar' }, { json: false }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header to www-form-urlencoded', function(done) {
            post({ foo: 'bar' }, { json: false }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/x-www-form-urlencoded');
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            post({ foo: 'bar' }, { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('writes as buffer', function(done) {
            post({ foo: 'bar' }, { json: false }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].should.be.a.Buffer;
              spy.args[0][0].toString().should.equal('foo=bar');
              resp.body.body.should.eql('foo=bar');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request', function(done) {
            spystub_request();

            post({ foo: 'bar' }, { json: true }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            post({ foo: 'bar' }, { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            post({ foo: 'bar' }, { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes JSON.stringified object', function(done) {
            post({ foo: 'bar' }, { json: true }, function(err, resp) {
              spy.called.should.be.true;
              var json = JSON.stringify({ foo: 'bar'})
              spy.args[0][0].toString().should.eql(json)
              resp.body.body.should.eql(json);
              done();
            })
          })

        })

      })

    })

    describe('when buffer', function() {

      describe('get request', function() {

        describe('with json: false (default)', function() {

          it('sends request', function(done) {
            spystub_request();

            get(new Buffer('foobar'), { json: false }, function(err, resp) {
              check_request('get');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            get(new Buffer('foobar'), { json: false }, function(err, resp) {
              // should.not.exist(resp.body.headers['content-type']);
              resp.body.headers['content-type'].should.equal('application/x-www-form-urlencoded');

              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            get(new Buffer('foobar'), { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('writes as buffer', function(done) {
            get(new Buffer('foobar'), { json: false }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].should.be.a.Buffer;
              spy.args[0][0].toString().should.equal('foobar');
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request, without setting a querystring', function(done) {
            spystub_request();

            get(new Buffer('foobar'), { json: true }, function(err, resp) {
              check_request('get');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            get(new Buffer('foobar'), { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            get(new Buffer('foobar'), { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes JSON.stringify version of object', function(done) {
            get(new Buffer('foobar'), { json: true }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].toString().should.eql('foobar')
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

      })

      describe('post request', function() {

        describe('with json: false (default)', function() {

          it('sends request', function(done) {
            spystub_request();

            post(new Buffer('foobar'), { json: false }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header to www-form-urlencoded', function(done) {
            post(new Buffer('foobar'), { json: false }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/x-www-form-urlencoded');
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            post(new Buffer('foobar'), { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('writes as buffer', function(done) {
            post(new Buffer('foobar'), { json: false }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].should.be.a.Buffer;
              spy.args[0][0].toString().should.equal('foobar');
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request', function(done) {
            spystub_request();

            post(new Buffer('foobar'), { json: true }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            post(new Buffer('foobar'), { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            post(new Buffer('foobar'), { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes JSON.stringified object', function(done) {
            post(new Buffer('foobar'), { json: true }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].toString().should.eql('foobar')
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

      })

    })

    describe('when stream', function() {

      var input_stream;

      beforeEach(function() {
        input_stream = new stream.Readable();
        input_stream._read = function() {
          this.push('foobar');
          this.push(null);
        }
      })

      describe('get request', function() {

        it('explodes', function() {
          (function() {
            get(input_stream, {})
          }).should.throw()
        })

      });

      describe('post request', function() {

        describe('with json: false (default)', function() {

          it('sends request', function(done) {
            spystub_request();

            post(input_stream, { json: false }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header to www-form-urlencoded', function(done) {
            post(input_stream, { json: false }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/x-www-form-urlencoded');
              done();
            })
          })

          it('doesnt change default Accept header', function(done) {
            post(input_stream, { json: false }, function(err, resp) {
              // resp.body contains 'header' and 'body', mirroring what we sent
              resp.body.headers['accept'].should.equal('*/*');
              done();
            })
          })

          it('writes as buffer', function(done) {
            post(input_stream, { json: false }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].should.be.a.Buffer;
              spy.args[0][0].toString().should.equal('foobar');
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

        describe('with json: true', function() {

          it('sends request', function(done) {
            spystub_request();

            post(input_stream, { json: true }, function(err, resp) {
              check_request('post');
              done();
            })
          })

          it('sets Content-Type header', function(done) {
            post(input_stream, { json: true }, function(err, resp) {
              resp.body.headers['content-type'].should.equal('application/json; charset=utf-8');
              done();
            })
          })

          it('set Accept header to application/json', function(done) {
            post(input_stream, { json: true }, function(err, resp) {
              resp.body.headers['accept'].should.equal('application/json');
              done();
            })
          })

          it('writes JSON.stringified object', function(done) {
            post(input_stream, { json: true }, function(err, resp) {
              spy.called.should.be.true;
              spy.args[0][0].toString().should.eql('foobar')
              resp.body.body.should.eql('foobar');
              done();
            })
          })

        })

      })

    })

  })

})