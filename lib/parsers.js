//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var ParseStream = require('./parse_stream');

//////////////////////////////////////////
// content type module.exports
//////////////////////////////////////////

module.exports['application/json'] = function () {
  return ParseStream(function(buffer, callback) {
    var err, data;
    try {
      data = JSON.parse(buffer);
    } catch (e) {
      err = e;
    }
    callback(err, data);
  }, true);
};

module.exports['text/javascript'] = module.exports['application/json'];

try {
  var xml2js = require('xml2js');

  // xml2js.Parser.parseString() has the exact same function signature as our ParseStream
  // expects, so we can reuse this.
  module.exports['application/xml'] = function () {
    return ParseStream(new xml2js.Parser({
      explicitRoot : true,
      explicitArray: false
    }).parseString, true);
  };

  module.exports['text/xml'] = module.exports['application/xml'];
  module.exports['application/rss+xml'] = module.exports['application/xml'];
} catch(e) { /* xml2js not found */ }
