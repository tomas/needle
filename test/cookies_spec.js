var needle = require('../'),
  sinon = require('sinon'),
  http = require('http'),
  should = require('should'),
  assert = require('assert');

var WEIRD_COOKIE_NAME = 'wc',
  BASE64_COOKIE_NAME = 'bc',
  FORBIDDEN_COOKIE_NAME = 'fc',
  NUMBER_COOKIE_NAME = 'nc',
  WEIRD_COOKIE_VALUE = '!\'*+#()&-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[' +
  ']^_`abcdefghijklmnopqrstuvwxyz{|}~',
  BASE64_COOKIE_VALUE = 'Y29va2llCg==',
  FORBIDDEN_COOKIE_VALUE = ' ;"\\,',
  NUMBER_COOKIE_VALUE = 12354342,
  WEIRD_COOKIE = 'wc=!\'*+#()&-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~',
  BASE64_COOKIE = 'bc=Y29va2llCg==',
  FORBIDDEN_COOKIE = 'fc=%20%3B%22%5C%2C',
  NUMBER_COOKIE = 'nc=12354342',
  COOKIE_HEADER = WEIRD_COOKIE + '; ' + BASE64_COOKIE + '; ' +
  FORBIDDEN_COOKIE + '; ' + NUMBER_COOKIE,
  TEST_HOST = 'localhost';
NO_COOKIES_TEST_PORT = 11112, ALL_COOKIES_TEST_PORT = 11113;

function decode(str) {
  return decodeURIComponent(str);
}

function encode(str) {
  str = str.toString().replace(/[\x00-\x1F\x7F]/g, encodeURIComponent);
  return str.replace(/[\s\"\,;\\%]/g, encodeURIComponent);
}

describe('cookies', function() {

  var headers, server, opts;

  before(function() {
    setCookieHeader = [
      WEIRD_COOKIE_NAME + '=' + encode(WEIRD_COOKIE_VALUE) + ';',
      BASE64_COOKIE_NAME + '=' + encode(BASE64_COOKIE_VALUE) + ';',
      FORBIDDEN_COOKIE_NAME + '=' + encode(FORBIDDEN_COOKIE_VALUE) + ';',
      NUMBER_COOKIE_NAME + '=' + encode(NUMBER_COOKIE_VALUE) + ';'
    ];
  });

  before(function(done) {
    serverAllCookies = http.createServer(function(req, res) {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Set-Cookie', setCookieHeader);
      res.end('200');
    }).listen(ALL_COOKIES_TEST_PORT, TEST_HOST, done);
  });

  after(function(done) {
    serverAllCookies.close(done);
  });

  describe('with default options', function() {
    it('no cookie header is set on request', function(done) {
      needle.get(
        TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, function(err, response) {
          assert(!response.req._headers.cookie);
          done();
        });
    });
  });

  describe('if response does not contain cookies', function() {
    before(function(done) {
      serverNoCookies = http.createServer(function(req, res) {
        res.setHeader('Content-Type', 'text/html');
        res.end('200');
      }).listen(NO_COOKIES_TEST_PORT, TEST_HOST, done);
    });

    it('response.cookies is undefined', function(done) {
      needle.get(
        TEST_HOST + ':' + NO_COOKIES_TEST_PORT, function(error, response) {
          assert(!response.cookies);
          done();
        });
    });

    after(function(done) {
      serverNoCookies.close(done);
    });
  });

  describe('if response contains cookies', function() {
    it('puts them on resp.cookies', function(done) {
      needle.get(
        TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, function(error, response) {
          response.should.have.property('cookies');
          done();
        });
    });

    it('parses them as a object', function(done) {
      needle.get(
        TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, function(error, response) {
          response.cookies.should.be.an.instanceOf(Object)
            .and.have.property(WEIRD_COOKIE_NAME);
          response.cookies.should.have.property(BASE64_COOKIE_NAME);
          response.cookies.should.have.property(FORBIDDEN_COOKIE_NAME);
          response.cookies.should.have.property(NUMBER_COOKIE_NAME);
          done();
        });
    });

    it('must decode it', function(done) {
      needle.get(
        TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, function(error, response) {
          response.cookies.wc.should.be.eql(WEIRD_COOKIE_VALUE);
          response.cookies.bc.should.be.eql(BASE64_COOKIE_VALUE);
          response.cookies.fc.should.be.eql(FORBIDDEN_COOKIE_VALUE);
          response.cookies.nc.should.be.eql(NUMBER_COOKIE_VALUE.toString());
          done();
        });
    });

    describe('and response is a redirect', function() {
      describe('and follow_set_cookies is false', function() {
        it('no cookie header set on redirection request', function() {});
      });
      describe('and follow_set_cookies is true', function() {});
    });

    describe('with parse_cookies = false', function() {
      it('does not parse them', function(done) {
        needle.get(
          TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, { parse_cookies: false }, function(error, response) {
            assert(!response.cookies);
            done();
          });
      });
    });
  });

  describe('if request contains cookie header', function() {
    var opts = {
      cookies: {}
    };

    before(function() {
      opts.cookies[WEIRD_COOKIE_NAME] = WEIRD_COOKIE_VALUE;
      opts.cookies[BASE64_COOKIE_NAME] = BASE64_COOKIE_VALUE;
      opts.cookies[FORBIDDEN_COOKIE_NAME] = FORBIDDEN_COOKIE_VALUE;
      opts.cookies[NUMBER_COOKIE_NAME] = NUMBER_COOKIE_VALUE;
    });

    it('must be a valid cookie string', function(done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/;

      needle.get(TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, opts, function(error, response) {
        var cookieString = response.req._headers.cookie;

        cookieString.should.be.type('string');

        cookieString.split(/\s*;\s*/).forEach(function(pair) {
          COOKIE_PAIR.test(pair).should.be.exactly(true);
        });

        cookieString.should.be.exactly(COOKIE_HEADER);

        done();
      });
    });

    it('dont have to encode allowed characters', function(done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
        KEY_INDEX = 1,
        VALUE_INEX = 3;

      needle.get(TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, opts, function(error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/).forEach(function(str) {
          var pair = COOKIE_PAIR.exec(str);
          cookieObj[pair[KEY_INDEX]] = pair[VALUE_INEX];
        });

        cookieObj[WEIRD_COOKIE_NAME].should.be.exactly(WEIRD_COOKIE_VALUE);
        cookieObj[BASE64_COOKIE_NAME].should.be.exactly(BASE64_COOKIE_VALUE);
        done();
      });
    });

    it('must encode forbidden characters', function(done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
        KEY_INDEX = 1,
        VALUE_INEX = 3;

      needle.get(TEST_HOST + ':' + ALL_COOKIES_TEST_PORT, opts, function(error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/).forEach(function(str) {
          var pair = COOKIE_PAIR.exec(str);
          cookieObj[pair[KEY_INDEX]] = pair[VALUE_INEX];
        });

        cookieObj[FORBIDDEN_COOKIE_NAME].should.not.be.eql(
          FORBIDDEN_COOKIE_VALUE);
        cookieObj[FORBIDDEN_COOKIE_NAME].should.be.exactly(
          encode(FORBIDDEN_COOKIE_VALUE));
        cookieObj[FORBIDDEN_COOKIE_NAME].should.be.exactly(
          encodeURIComponent(FORBIDDEN_COOKIE_VALUE));
        done();
      });
    });
  });
});
