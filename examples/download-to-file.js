var fs = require('fs'),
    needle = require('./..');

var file = 'tux.png',
    url  = 'http://upload.wikimedia.org/wikipedia/commons/a/af/Tux.png';

needle.get(url, { output: file }, function(err, resp, data){
  console.log('File saved: ' + process.cwd() + '/' + file);
  console.log(resp.bytes + ' bytes transferred.');
});
