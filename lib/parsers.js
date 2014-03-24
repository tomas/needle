//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var Stream = require('stream');

//////////////////////////////////////////
// buffering stream class for our parsers
//////////////////////////////////////////

function parserFactory(fn) {
  return function() {

    var chunks = [],
        stream = new Stream.Transform({ objectMode: true });

    // Buffer all our data
    stream._transform = function (chunk, encoding, done) {
      if (Buffer.isBuffer(chunk) == false) {
        throw new Error('Can only aggregate buffer data for parsers');
      }

      chunks.push(chunk);
      done();
    },

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
        // console.error('Error while parsing: ', err)

        // If we were unable to parse, just pass the original unparsed data.
        self.push(data);
      } finally {
        done();
      }
    }

    return stream;
  }
}

//////////////////////////////////////////
// content type module.exports
//////////////////////////////////////////

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

  // xml2js.Parser.parseString() has the exact same function signature as our ParseStream
  // expects, so we can reuse this.
  module.exports['application/xml'] = parserFactory(new xml2js.Parser({
      explicitRoot : true,
      explicitArray: false
    }).parseString);

  module.exports['text/xml'] = module.exports['application/xml'];
  module.exports['application/rss+xml'] = module.exports['application/xml'];
} catch(e) { /* xml2js not found */ }
