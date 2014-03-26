var Transform = require('stream').Transform;

module.exports = function(fn, object) {

  return function() {

    var chunks = [],
        stream = new Transform({ objectMode: object });

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
        fn(data, function(err, result) {
          if (err) throw err;
          self.push(result);
        });
      } catch (err) {
        // console.error('Error while processing: ', err);
        self.push(data); // just pass the original data
      } finally {
        done();
      }
    }

    return stream;
  }

}
