//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var transform = require('./transformer');

module.exports['application/json'] = transform(function(buffer, callback) {

  var err, data;
  try {
    data = JSON.parse(buffer);
  } catch (e) {
    err = e;
  }
  callback(err, data);

}, true);

module.exports['text/javascript'] = module.exports['application/json'];

try {

  var xml2js = require('xml2js');

  // xml2js.Parser.parseString() has the exact same function signature
  // as our ParseStream expects, so we can reuse this.
  module.exports['application/xml'] = transform(new xml2js.Parser({
      explicitRoot : true,
      explicitArray: false
    }).parseString, true);

  // aliases for other XML content types
  module.exports['text/xml'] = module.exports['application/xml'];
  module.exports['application/rss+xml'] = module.exports['application/xml'];

} catch(e) { /* xml2js not found */ }
