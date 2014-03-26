var iconv,
    transform = require('./transformer');

module.exports = function(charset) {

  try {
    if (!iconv) iconv = require('iconv-lite');
  } catch(e) {
    /* iconv not found */
  }

  return transform(function(buffer, cb) {
    if (!iconv) return cb(null, buffer);

    var result = iconv.decode(buffer, charset);
    cb(null, result);
  }, false);
}
