var Transform = require('stream').Transform;

//////////////////////////////////////////
// buffering stream class for our parsers
//////////////////////////////////////////

module.exports = function(fn, objectMode) {
  var chunks = [],
      stream = new Transform({ objectMode: objectMode });

  // Buffer all our data
  stream._transform = function(chunk, encoding, done) {
    chunks.push(chunk);
    done();
  }
    
  // And flush our tree.
  stream._flush = function(done) {
    var self = this,
    data = Buffer.concat(chunks);

    try {
      fn(data, function (err, result) {
        if (err) throw err;
          
        self.push(result);
      });
    } catch (err) {
      // console.error('Error while decoding: ', err);
      self.push(data); // just pass the original data
    } finally {
      done();
    }
  }

  return stream;
}
