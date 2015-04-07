var createHash = require('crypto').createHash;
var digestHeader = require('digest-header');

function get_header(header, credentials, opts) {
  var type = header.split(' ')[0],
      user = credentials[0],
      pass = credentials[1];

  if (type == 'Digest') {
    return digest.generate(header, user, pass, opts.method, opts.path);
  } else if (type == 'Basic') {
    return basic(user, pass);
  }
}

////////////////////
// basic

function md5(string) {
  return createHash('md5').update(string).digest('hex');
}

function basic(user, pass) {
  var str  = typeof pass == 'undefined' ? user : [user, pass].join(':');
  return 'Basic ' + new Buffer(str).toString('base64');
}

////////////////////
// digest
// logic inspired from https://github.com/simme/node-http-digest-client

var digest = {};

digest.generate = function(header, user, pass, method, path) {
  var userpass = user+':'+pass;
  var headers = digestHeader(method, path, header, userpass)
  return headers;
}

module.exports = {
  header : get_header,
  basic  : basic,
  digest : digest.generate
}
