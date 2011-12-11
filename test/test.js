// TODO: write specs. :)

var fs = require('fs'),
    client = require('./../lib/needle');

process.env.DEBUG = true;

function simple_get(){

	client.get('https://www.google.com', function(err, resp, body){

		console.log(err);
		console.log(body);

	});

}


function auth_get(){

	client.get('https://www.myserver.com', {username: 'asd', password: '123'}, function(err, resp, body){

		console.log(err);
		console.log(body);

	});

}

function simple_post(){

	var data = {
		foo: 'bar',
		baz: {
			nested: 'attributes'
		}
	}

	client.post('http://posttestserver.com/post.php', data, function(err, resp, body){

		console.log(err);
		console.log(body);

	});

}

function multipart_post(){

	var fd = fs.openSync('important.txt', 'w');
	fs.writeSync(fd, 'a lot of data\nwoohoo\n\nmore data\n\n');
	fs.close(fd);

	var data = {
		foo: 'bar',
		bar: 'baz',
		nested: {
			my_document: { file: 'important.txt', content_type: 'text/plain' },
			even: {
				more: 'nesting'
			}
		}
	}

	client.post('http://posttestserver.com/post.php?dir=example', data, {multipart: true}, function(err, resp, body){

		console.log(err);
		console.log(body);
		fs.unlink('important.txt');

	});

}

// simple_get();
// auth_get();
// simple_post();
multipart_post();
