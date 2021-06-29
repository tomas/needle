//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var Transform = require('stream').Transform;

function parserFactory(name, fn) {

  function parser() {
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
        self.push(data); // just pass the original data
      } finally {
        done();
      }
    }

    return stream;
  }

  return { fn: parser, name: name };
}

var json = parserFactory('json', function(buffer, cb) {
  var err, data;
  try { data = JSON.parse(buffer); } catch (e) { err = e; }
  cb(err, data);
});

module.exports['application/json'] = json;
module.exports['text/javascript']  = json;

try {

  var xml2js = require('xml2js');

  // xml2js.Parser.parseString() has the exact same function signature
  // as our ParseStream expects, so we can reuse this.
  var xml = parserFactory('xml', new xml2js.Parser({
    explicitRoot : true,
    explicitArray: false
  }).parseString, true);

  module.exports['text/xml']             = xml;
  module.exports['application/xml']      = xml;
  module.exports['application/rdf+xml']  = xml;
  module.exports['application/rss+xml']  = xml;
  module.exports['application/atom+xml'] = xml;

} catch(e) { /* xml2js not found */ }
