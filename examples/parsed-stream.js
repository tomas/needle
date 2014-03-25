var fs     = require('fs'),
    stream = require('stream'),
    needle = require('./../');

var url    = 'http://ip.jsontest.com/';
var resp   = needle.get(url, { parse: true });

resp.on('data', function(obj) {
  console.log(obj);
})

resp.on('end', function(data) {
  console.log('Done');
})
