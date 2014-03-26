var fs     = require('fs'),
    stream = require('stream'),
    needle = require('./../');

var url  = 'http://ibl.gamechaser.net/f/tagqfxtteucbuldhezkz/bt_level1.gz';

var resp = needle.get(url, { compressed: true, follow: true });
console.log('Downloading...');

resp.on('readable', function() {

  while (data = this.read()) {
    var lines = data.toString().split('\n');
    console.log('Got ' + lines.length + ' items.');
    // console.log(lines);
  }

})

resp.on('end', function(data) {
  console.log('Done');
})
