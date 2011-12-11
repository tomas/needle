// This is not done yet. Sorry.

var fs = require('fs'),
    client = require(__dirname + '/index');

function simple_get(){

	client.get('https://www.google.com', function(err, body, resp){

		console.log(err);
		console.log(body);

	});

}


function auth_get(){

	client.get('https://www.myserver.com', {username: 'asd', password: '123'}, function(err, body, resp){

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

	client.post('http://posttestserver.com/post.php', data, function(err, body, resp){

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

	client.post('http://localhost:3000', data, {multipart: true}, function(err, body, resp){

		console.log(err);
		console.log(body);

	});

}

// simple_get();
// auth_get();
// simple_post();
multipart_post();
