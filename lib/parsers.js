//////////////////////////////////////////
// Defines mappings between content-type
// and the appropriate parsers.
//////////////////////////////////////////

var Transform = require('stream').Transform;
var sax = require('sax');

function parseXML(str, cb) {
  var obj, current, parser = sax.parser(true, { trim: true, lowercase: true })
  parser.onerror = parser.onend = done;

  function start() {
    try {
      parser.write(str).close()
    } catch(e) {
      done(e)
    }
  }

  function done(err) {
    cb(err, obj)
    done = function() { };
  }

  function newElement(name, attributes) {
    return {
      name: name || '',
      text: '',
      attributes: attributes || {},
      children: []
    }
  }

  parser.ontext = function(t) {
    if (current) current.text += t
  }

  parser.onopentag = function(node) {
    var element = newElement(node.name, node.attributes)
    if (current) {
      element.parent = current
      current.children.push(element)
    } else { // root object
      obj = element
    }

    current = element
  };

  parser.onclosetag = function() {
    if (typeof current.parent !== 'undefined') {
      var just_closed = current
      current = current.parent
      delete just_closed.parent
    }
  }

  start()
}

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

var xml = parserFactory('xml', function(buffer, cb) {
  parseXML(buffer.toString(), function(err, obj) {
    cb(err, data)
  })
});

module.exports['text/xml']             = xml;
module.exports['application/xml']      = xml;
module.exports['application/rdf+xml']  = xml;
module.exports['application/rss+xml']  = xml;
module.exports['application/atom+xml'] = xml;