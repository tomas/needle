var needle = require('../'),
  sinon = require('sinon'),
  should = require('should'),
  nock = require('nock'),
  assert = require('assert'),
  cookies = require('../lib/cookies');

nock.disableNetConnect();

var WEIRD_COOKIE = '!\'*+#()&-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[' +
  ']^_`abcdefghijklmnopqrstuvwxyz{|}~',
  BASE64_COOKIE = 'Y29va2llCg==',
  FORBIDDEN_COOKIE = ' ;"\\,';

function decode (str) {
  return decodeURIComponent(str);
}

function encode (str) {
  str = str.replace(/[\x00-\x1F\x7F]/g, encodeURIComponent);
  return str.replace(/[\s\"\,;\\%]/g, encodeURIComponent);
}

describe('cookies', function () {
  var headers, server, opts;

  beforeEach(function () {

    headers = [
      {
        'content-type': 'text/html'
      },
      {
        'Set-Cookie': [
          'wc=' + encode(WEIRD_COOKIE) + ';',
          'bc=' + encode(BASE64_COOKIE) + ';',
          'fc=' + encode(FORBIDDEN_COOKIE) + ';'
        ],
        'content-type': 'text/html'
    }];
  });

  beforeEach(function () {
    nock('http://nocookies.test').get('/').reply(200, '', headers[0]);
    nock('http://allcookies.test').get('/').reply(200, '', headers[1]);
  });

  describe('with default options', function () {
    it('no cookie header is set on request', function (done) {
      needle.get('http://nocookies.test', function (err, response) {
        assert(!response.req._headers.cookie);
        done();
      });
    });
  });

  describe('if response does not contain cookies', function () {
    it('response.cookies is undefined', function (done) {
      needle.get('http://nocookies.test', function (error, response) {
        assert(!response.cookies);
        done();
      });
    });
  });

  describe('if response contains cookies', function () {
    it('puts them on resp.cookies', function (done) {
      needle.get('http://allcookies.test', function (error, response) {
        response.should.have.property('cookies');
        done();
      });
    });

    it('parses them as a object', function (done) {
      needle.get('http://allcookies.test', function (error, response) {
        response.cookies.should.be.an.instanceOf(Object).and.have.property('wc');
        response.cookies.should.have.property('bc');
        response.cookies.should.have.property('fc');
        done();
      });
    });

    it('must decode it', function (done) {
      needle.get('http://allcookies.test', function (error, response) {
        response.cookies.wc.should.be.eql(WEIRD_COOKIE);
        response.cookies.bc.should.be.eql(BASE64_COOKIE);
        response.cookies.fc.should.be.eql(FORBIDDEN_COOKIE);
        done();
      });
    });


    describe('and response is a redirect', function () {

      describe('and follow_set_cookies is false', function () {
        it('no cookie header set on redirection request', function () {});
      });

      describe('and follow_set_cookies is true', function () {});

    });

  });

  describe('if resquest contains cookie header', function () {
    var opts;

    before(function () {
      opts = {
        'cookies': {
          'weird': WEIRD_COOKIE,
          'base': BASE64_COOKIE,
          'forbidden': FORBIDDEN_COOKIE
        }
      };
    });

    it('must be a valid cookie string', function (done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/;

      needle.get('http://allcookies.test', opts, function (error, response) {
        var cookieString = response.req._headers.cookie;

        cookieString.should.be.type('string');

        cookieString.split(/\s*;\s*/).forEach(function (pair) {
          COOKIE_PAIR.test(pair).should.be.exactly(true);
        });
        done();
      });
    });

    it('dont have to encode allowed characters', function (done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
        KEY_INDEX = 1,
        VALUE_INEX = 3;

      needle.get('http://allcookies.test', opts, function (error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/).forEach(function (str) {
          var pair = COOKIE_PAIR.exec(str);
          cookieObj[pair[KEY_INDEX]] = pair[VALUE_INEX];
        });

        cookieObj.weird.should.be.exactly(WEIRD_COOKIE);
        cookieObj.base.should.be.exactly(BASE64_COOKIE);
        done();
      });
    });

    it('must encode forbidden characters', function (done) {
      var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
        KEY_INDEX = 1,
        VALUE_INEX = 3;

      needle.get('http://allcookies.test', opts, function (error, response) {
        var cookieObj = {},
          cookieString = response.req._headers.cookie;

        cookieString.split(/\s*;\s*/).forEach(function (str) {
          var pair = COOKIE_PAIR.exec(str);
          cookieObj[pair[KEY_INDEX]] = pair[VALUE_INEX];
        });

        cookieObj.forbidden.should.not.be.eql(FORBIDDEN_COOKIE);
        cookieObj.forbidden.should.be.exactly(encode(FORBIDDEN_COOKIE));
        cookieObj.forbidden.should.be.exactly(encodeURIComponent(FORBIDDEN_COOKIE));
        done();
      });
    });
  });
});
