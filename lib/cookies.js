var valid_keys = ['domain', 'path', 'expires', 'httponly', 'secure'];

// modified version of the parse function from the cookie lib by jshttp:
// https://github.com/jshttp/cookie/blob/master/index.js

function parse(str, opt) {

  var opt   = opt || {}, 
      obj   = {}, 
      res   = {},
      pairs = str.split(/; */),
      dec   = opt.decode || decodeURIComponent;

  pairs.forEach(function(pair) {
    var eq_idx = pair.indexOf('=')

    // skip things that don't look like key=value
    if (eq_idx < 0) {
      return;
    }

    var key = pair.substr(0, eq_idx).trim()
    var val = pair.substr(++eq_idx, pair.length).trim();

    // quoted values
    if ('"' == val[0]) {
      val = val.slice(1, -1);
    }

    // only assign once
    if (undefined == obj[key]) {
      try {
        obj[key] = dec(val);
      } catch (e) {
        obj[key] = val;
      }
    }
  });

  // if key is part of valid_keys, set it, otherwise set it as key=[key] and value=[val]
  for (var key in obj) {
    if (valid_keys.indexOf(key.toLowerCase()) != -1) {
      res[key]  = obj[key];
    } else {
      res.key   = key;
      res.value = obj[key];
    }
  }

  return res;
};

function to_hash(arr, url) {
  var res = {};

  arr.forEach(function(obj) {
    // if (!obj.path || (url.indexOf(obj.path) !== -1)) {
      res[obj.key] = obj.value;
    // }
  })

  return res;
}

// returns a key/val object from an array of 
exports.read = function(header) {
  var arr = (header instanceof Array) ? header : [header];
  return to_hash(header.map(function(c) { return parse(c) }));
}

exports.write = function(obj) {
  var res = [],
      enc = encodeURIComponent;

  Object.keys(obj).forEach(function(key) {
    res.push(enc(key) + '=' + enc(obj[key]));
  })

  return res.join('; ');
};