var iconv,
    Transform = require('stream').Transform;

function parserFactory(fn) {

  try {
    iconv = require('iconv-lite');
  } catch(e) {
    /* iconv not found */
  }

  return function(charset) {

    var chunks = [],
        stream = new Transform({ objectMode: false });

    // Buffer all our data
    stream._transform = function(chunk, encoding, done) {
      chunks.push(chunk);
      done();
    }

    // And flush our tree.
    stream._flush = function(done) {
      var self = this,
          data = Buffer.concat(chunks);

      if (!iconv) {
        self.push(data);
        return done();
      }

      try {
        var result = fn(data, charset);
        self.push(result);
      } catch (err) {
        // console.error('Error while decoding: ', err);
        self.push(data); // just pass the original data
      } finally {
        done();
      }
    }

    return stream;
  }
}

module.exports = parserFactory(function(buffer, charset) {
  return iconv.decode(buffer, charset);
});
