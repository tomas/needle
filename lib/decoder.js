var iconv,
    inherits  = require('util').inherits,
    stream    = require('stream');

var charsetReg = /(?:charset|encoding)\s*=\s*['"]? *([\w\-]+)/i;

inherits(StreamDecoder, stream.Transform);

function StreamDecoder(charset) {
  if (!(this instanceof StreamDecoder))
    return new StreamDecoder(charset);

  stream.Transform.call(this, charset);
  this.charset = charset;
  this.parsedFromChunk = false;
}

StreamDecoder.prototype._transform = function(chunk, encoding, done) {
  var res;

  // try get charset from chunk, just once
  if (this.charset == 'iso-8859-1' && !this.parsedFromChunk) {
    this.parsedFromChunk = true;
    var matchs = charsetReg.exec(chunk.toString());
    if (matchs) {
      var cs = matchs[1].toLowerCase();
      this.charset = cs == 'utf-8' ? 'utf8' : cs;
    }
  }

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
