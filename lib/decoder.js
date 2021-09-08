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

  // if no iconv, push chunk along
  if (!iconv) return this.push(chunk), done();

  // try get charset from chunk, just once
  if (this.charset == 'utf8' && !this.parsed_chunk) {
    this.parsed_chunk = true;

    var matches = regex.exec(chunk.toString());
    if (matches) {
      found = matches[1].toLowerCase();
      this.charset = found == 'utf-8' ? 'utf8' : found;
    }
  }

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
