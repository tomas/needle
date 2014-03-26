//////////////////////////////////////////
// This example demonstrates what happends
// when you use the built-in JSON parser.
//////////////////////////////////////////

var fs     = require('fs'),
    stream = require('stream'),
    needle = require('./../');

var url    = 'http://ip.jsontest.com/';
var resp   = needle.get(url, { parse: true });

resp.on('readable', function(obj) {
  var chunk;

  while (rootNode = this.read()) {
    console.log('root = ', rootNode);
  }
});

resp.on('end', function(data) {
  console.log('Done');
});
