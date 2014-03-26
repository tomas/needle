var iconv,
    inherits  = require('util').inherits,
    stream    = require('stream');

inherits(StreamDecoder, stream.Transform);

function StreamDecoder(charset) {
  if (!(this instanceof StreamDecoder))
    return new StreamDecoder(charset);

  stream.Transform.call(this, charset);
  this.charset = charset;
}

StreamDecoder.prototype._transform = function(chunk, encoding, done) {
  var res;

  try {
    res = iconv.decode(chunk, this.charset);
  } catch(e) { // something went wrong, just return original chunk
    res = chunk;
  }

  this.push(res);
  done();
}

module.exports = function(charset) {
  try {
    if (!iconv) iconv = require('iconv-lite');
  } catch(e) {
    /* iconv not found */
  }

  if (iconv)
    return new StreamDecoder(charset);
  else
    return new stream.PassThrough;
}
