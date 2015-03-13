var COOKIE_PAIR = /^([^=\s]+)\s*=\s*("?)\s*(.*)\s*\2\s*$/,
    TRAILING_SEMICOLON = /;+$/,
    KEY_INDEX = 1,
    VALUE_INDEX = 3;

function remove_trailing_semicolon(str) {
  var regexp_match = TRAILING_SEMICOLON.exec(str);
  return regexp_match ? str.slice(0, regexp_match.index) : str;
}

function get_first_pair(str) {
  return str.split(/\s*;\s*/).shift();
}

function parse(str, decode) {
  decode = decode || decodeURIComponent;

  str = str.trim();
  str = remove_trailing_semicolon(str);
  str = get_first_pair(str);

  var res = COOKIE_PAIR.exec(str);
  return {
    key: decode(res[KEY_INDEX]),
    value: decode(res[VALUE_INDEX])
  };
}

// returns a key/val object from an array of cookie strings
exports.read = function (header, decode) {
  var res = {};
  header = (header instanceof Array) ? header : [header];

  header.forEach(function (cookie_str) {
    var cookie = parse(cookie_str, decode);
    res[cookie.key] = cookie.value;
  });

  return res;
};

// writes a cookie string header
exports.write = function(obj, encode) {
  encode = encode || encodeURIComponent;

  return Object.keys(obj).map(function(key) {
    return encode(key) + '=' + encode(obj[key]);
  }).join('; ');
};
