var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
  TRAILING_SEMICOLON = /;+$/,
  CTL_CHARS = /[\x00-\x1F\x7F]/g,
  EXCLUDED_CHARS = /[\s\"\,;\\%]/g,
  KEY_INDEX = 1,
  VALUE_INDEX = 3;

function remove_trailing_semicolon (str) {
  var regexp_match = TRAILING_SEMICOLON.exec(str);
  return regexp_match ? str.slice(0, regexp_match.index) : str;
}

function get_first_pair (str) {
  return str.split(/\s*;\s*/).shift();
}

function encodeCookieComponent (str) {
  str = str.replace(CTL_CHARS, encodeURIComponent);
  return str.replace(EXCLUDED_CHARS, encodeURIComponent);
}

function parse (str) {
  str = str.trim();
  str = remove_trailing_semicolon(str);
  str = get_first_pair(str);

  var res = COOKIE_PAIR.exec(str);
  return {
    key: decodeURIComponent(res[KEY_INDEX]),
    value: decodeURIComponent(res[VALUE_INDEX])
  };
}

// returns a key/val object from an array of cookie strings
exports.read = function (header) {
  var res = {};
  header = (header instanceof Array) ? header : [header];

  header.forEach(function (cookie_str) {
    var cookie = parse(cookie_str);
    res[cookie.key] = cookie.value;
  });

  return res;
};

// writes a cookie string header
exports.write = function (cookies) {
  return Object.keys(cookies).map(function (key) {
    var encodedKey = encodeCookieComponent(key);
    var encodedValue = encodeCookieComponent(cookies[key]);
    return encodedKey + '=' + encodedValue;
  }).join('; ');
};
