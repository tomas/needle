var fs       = require('fs'),
    basename = require('path').basename,
    FormData = require('form-data');

var get_file_opts = function(part, key){
  return {
    filename    : part.filename || (part.file && basename(part.file)) || key,
    contentType : part.content_type
  }
}

exports.stream = function(data, cb) {

  if (typeof data != 'object')
    return callback(new Error('Multipart builder expects data as key/val object.'));

  var stream = new FormData(),
      object = flatten(data),
      count  = Object.keys(object).length;

  if (count === 0)
    return callback(new Error('Empty multipart body. Invalid data.'))

  var done = function(err, section) {
    if (err) return callback(err);
    if (section) body += section;
    --count || callback(null, body + '--' + boundary + '--');
  };

  for (var key in object) {
    var value = object[key];

    if (value === null || typeof value == 'undefined')
      continue;

    if (value.file && value.content_type) {
      stream.append(key, fs.createReadStream(value.file), get_file_opts(value, key) );
    } else if (value.buffer) {
      stream.append(key, value.buffer, get_file_opts(value, key));
    } else {
      var part = value.value || value,
          opts = value.content_type ? { contentType: part.content_type } : {};

      stream.append(key, part, opts);
    }
  }
  
  stream.getLength(function(err, length) {
    cb(null, stream, length);
  });

}

// flattens nested objects for multipart body
var flatten = function(object, into, prefix) {
  into = into || {};

  for(var key in object) {
    var prefix_key = prefix ? prefix + '[' + key + ']' : key;
    var prop = object[key];

    if (prop && typeof prop === 'object' && !(prop.buffer || prop.file || prop.content_type))
      flatten(prop, into, prefix_key)
    else
      into[prefix_key] = prop;
  }

  return into;
}
