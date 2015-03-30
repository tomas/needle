var needle = require('../'),
  sinon = require('sinon'),
  should = require('should'),
  nock = require('nock'),
  assert = require('assert'),
  cookies = require('../lib/cookies');

nock.disableNetConnect();

var WEIRD_COOKIE_NAME = 'wc',
  BASE64_COOKIE_NAME = 'bc',
  FORBIDDEN_COOKIE_NAME = 'fc',
  WEIRD_COOKIE_VALUE = '!\'*+#()&-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[' +
  ']^_`abcdefghijklmnopqrstuvwxyz{|}~',
  BASE64_COOKIE_VALUE = 'Y29va2llCg==',
  FORBIDDEN_COOKIE_VALUE = ' ;"\\,',
  WEIRD_COOKIE = 'weird=!\'*+#()&-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~',
  BASE64_COOKIE = 'base=Y29va2llCg==',
  FORBIDDEN_COOKIE = 'forbidden=%20%3B%22%5C%2C',
  COOKIE_HEADER = WEIRD_COOKIE + '; ' + BASE64_COOKIE + '; ' + FORBIDDEN_COOKIE;

function decode(str) {
  return decodeURIComponent(str);
}

function encode(str) {
  str = str.replace(/[\x00-\x1F\x7F]/g, encodeURIComponent);
  return str.replace(/[\s\"\,;\\%]/g, encodeURIComponent);
}

describe('cookies', function() {
  var headers, server, opts;

  beforeEach(function() {

    headers = [
      {
        'content-type': 'text/html'
      },
      {
        'Set-Cookie': [
          WEIRD_COOKIE_NAME + '=' + encode(WEIRD_COOKIE_VALUE) + ';',
          BASE64_COOKIE_NAME + '=' + encode(BASE64_COOKIE_VALUE) + ';',
          FORBIDDEN_COOKIE_NAME + '=' + encode(FORBIDDEN_COOKIE_VALUE) + ';'
        ],
        'content-type': 'text/html'
      }
    ];
  });

  beforeEach(function() {
    nock('http://nocookies.test').get('/').reply(200, '', headers[0]);
    nock('http://allcookies.test').get('/').reply(200, '', headers[1]);
  });

  describe('with default options', function() {
    it('no cookie header is set on request', function(done) {
      needle.get('http://nocookies.test', function(err, response) {
        assert(!response.req._headers.cookie);
        done();
      });
    });
  });

  describe('if response does not contain cookies', function() {
    it('response.cookies is undefined', function(done) {
      needle.get('http://nocookies.test', function(error, response) {
        assert(!response.cookies);
        done();
      });
    });
  });

  describe('if response contains cookies', function() {
    it('puts them on resp.cookies', function(done) {
      needle.get('http://allcookies.test', function(error, response) {
        response.should.have.property('cookies');
        done();
      });
    });

    it('parses them as a object', function(done) {
      needle.get('http://allcookies.test', function(error, response) {
        response.cookies.should.be.an.instanceOf(Object)
          .and.have.property(WEIRD_COOKIE_NAME);
        response.cookies.should.have.property(BASE64_COOKIE_NAME);
        response.cookies.should.have.property(FORBIDDEN_COOKIE_NAME);
        done();
      });
    });

    it('must decode it', function(done) {
      needle.get('http://allcookies.test', function(error, response) {
        response.cookies.wc.should.be.eql(WEIRD_COOKIE_VALUE);
        response.cookies.bc.should.be.eql(BASE64_COOKIE_VALUE);
        response.cookies.fc.should.be.eql(FORBIDDEN_COOKIE_VALUE);
        done();
      });
    });

    describe('and response is a redirect', function() {
      describe('and follow_set_cookies is false', function() {
        it('no cookie header set on redirection request', function() {});
      });
      describe('and follow_set_cookies is true', function() {});
    });
  });

  describe('if resquest contains cookie header', function() {
    var opts = {
      cookies: {}
    };

    before(function() {
      opts.cookies[WEIRD_COOKIE_NAME] = WEIRD_COOKIE_VALUE;
      opts.cookies[BASE64_COOKIE_NAME] = BASE64_COOKIE_VALUE;
      opts.cookies[FORBIDDEN_COOKIE_NAME] = FORBIDDEN_COOKIE_VALUE;
    });

    it('must be a valid cookie string', function(done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/;

      needle.get('http://allcookies.test', opts, function(error, response) {
        var cookieString = response.req._headers.cookie;

        cookieString.should.be.type('string');

        cookieString.split(/\s*;\s*/)
          .forEach(function(pair) {
            COOKIE_PAIR.test(pair).should.be.exactly(true);
          });
        done();
      });
    });

    it('dont have to encode allowed characters', function(done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
        KEY_INDEX = 1,
        VALUE_INEX = 3;

      needle.get('http://allcookies.test', opts, function(error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/)
          .forEach(function(str) {
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

      needle.get('http://allcookies.test', opts, function(error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/)
          .forEach(function(str) {
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
