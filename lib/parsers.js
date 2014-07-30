//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var Transform = require('stream').Transform;

function parserFactory(fn) {

  return function() {
    var chunks = [],
        stream = new Transform({ objectMode: true });

    // Buffer all our data
    stream._transform = function(chunk, encoding, done) {
      chunks.push(chunk);
      done();
    }

    // And call the parser when all is there.
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

module.exports['application/json'] = parserFactory(function(buffer, callback) {

  var err, data;
  try {
    data = JSON.parse(buffer);
  } catch (e) {
    err = e;
  }
  callback(err, data);

});

module.exports['text/javascript'] = module.exports['application/json'];

try {

  var xml2js = require('xml2js');

  // xml2js.Parser.parseString() has the exact same function signature
  // as our ParseStream expects, so we can reuse this.
  module.exports['application/xml'] = parserFactory(new xml2js.Parser({
      explicitRoot : true,
      explicitArray: false
    }).parseString, true);

  // aliases for other XML content types
  module.exports['text/xml'] = module.exports['application/xml'];
  module.exports['application/rss+xml']  = module.exports['application/xml'];
  module.exports['application/atom+xml'] = module.exports['application/xml'];

} catch(e) { /* xml2js not found */ }
