// based on the qs module, but handles null objects as expected
// fixes by Tomas Pollak.

var stringify = function(obj, prefix) {
  if (obj === null || typeof obj == 'undefined') {
    return prefix + '=';
  } else if (obj.constructor == Array) {
    return stringifyArray(obj, prefix);
  } else if (typeof obj == 'object') {
    return stringifyObject(obj, prefix);
  } else if (prefix) { // string inside array or hash
    return prefix + '=' + encodeURIComponent(String(obj));
  } else { 
    throw new TypeError('Object expected.');
  }
};

function stringifyArray(arr, prefix) {
  var ret = [];

  for (var i = 0, len = arr.length; i < len; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }

  return ret.join('&');
}

function stringifyObject(obj, prefix) {
  var ret = [];

  Object.keys(obj).forEach(function(key) {
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  })

  return ret.join('&');
}

exports.build = stringify;