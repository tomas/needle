var needle = require('./../');

var url  = 'http://posttestserver.com/post.php?dir=needle';

var data = {
  foo: 'bar',
  nested: {
    test: 123
  }
}

var resp = needle.post(url, data, { multipart: true });

resp.on('readable', function() {
  while (data = this.read()) {
    console.log(data.toString());
  }
})

resp.on('end', function(data) {
  console.log('Done.');
})
