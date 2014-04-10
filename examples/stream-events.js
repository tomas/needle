var needle = require('./..');

var resp   = needle.get('google.com', { follow: true, timeout: 5000 });

resp.on('readable', function() {
  var chunk;
  while (chunk = this.read()) {
    console.log('Got ' + chunk.length + ' bytes');
  }
})

resp.on('headers', function(headers) {
  console.log('Got headers', headers);
})

resp.on('redirect', function(url) {
  console.log('Redirected to url ' + url);
})

resp.on('end', function(err) {
  console.log('Finished. No more data to receive.');
  if (err) console.log('With error', err)
})
