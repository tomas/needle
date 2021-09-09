var iconv,
    inherits  = require('util').inherits,
    stream    = require('stream');

var regex = /(?:charset|encoding)\s*=\s*['"]? *([\w\-]+)/i;

inherits(StreamDecoder, stream.Transform);

function StreamDecoder(charset) {
  if (!(this instanceof StreamDecoder))
    return new StreamDecoder(charset);

  stream.Transform.call(this, charset);
  this.charset = charset;
  this.parsed_chunk = false;
}

StreamDecoder.prototype._transform = function(chunk, encoding, done) {
  var res, found;

  // try to get charset from chunk, just once
  if (!this.parsed_chunk && (this.charset == 'utf8' || this.charset == 'utf-8')) {
    this.parsed_chunk = true;

    // look for charset
    if (regex.test(chunk.toString())) {
      var charset = (RegExp.$1).toLowerCase().replace('utf8','utf-8'); // canonicalize
      // override if iconv can handle it
      if (iconv.encodingExists(charset)) this.charset = charset;
    }
  }

  // no need to decode utf-8, pass through
  if (this.charset == 'utf-8') return this.push(chunk), done();

  // initialize stream decoder if not present
  const self = this;
  if (!this.decoder) {
    this.decoder = iconv.decodeStream(this.charset);
    this.decoder.on("data", function(decoded_chunk){
      // push decoded chunk
      self.push(decoded_chunk);
    });
  };
  
  // write chunk to decoder
  this.decoder.write(chunk);
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
