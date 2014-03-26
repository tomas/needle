
/*
 We prefer decoding using iconv, since it's a streaming parser.
 */
try {
  if (typeof module.exports != 'function') {
    var iconv       = require('iconv');

    console.log('needle using iconv')

    module.exports = function (charset) {
      return iconv.Iconv(charset, 'UTF-8');
    }
  }
} catch (e) {
}

/*
 When we do not have iconv, we use iconv-lite, which has to buffer
 the entire document before parsing.
 */
try {
  if (typeof module.exports != 'function') {
    var iconv       = require('iconv-lite'),
        ParseStream = require('./parse_stream');

    console.log('needle using iconv-lite')

    module.exports = function (charset) {
      return ParseStream(function(buffer, callback) {
        callback(null, iconv.decode(buffer, charset));
      }, false);
    };
  }
} catch (e) {
}

/*
 And as fallback we do not do anything at all.
 */
if (typeof module.exports != 'function') {
  console.log('needle using nothing!')
  module.exports = require('stream').PassThrough
}
