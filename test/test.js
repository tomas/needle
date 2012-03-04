// TODO: write specs. :)

var fs = require('fs'),
    client = require('./../lib/needle');

process.env.DEBUG = true;

var response_callback = function(err, resp, body){
	console.log(err);
	if(resp) console.log("Got status code " + resp.statusCode)
	console.log(body);
}

function simple_get(){
	client.get('http://www.nodejs.org', response_callback);
}

function proxy_get(){
	client.get('https://www.google.com/search?q=nodejs', {proxy: 'http://localhost:1234'}, response_callback);
}

function auth_get(){
	client.get('https://www.twitter.com', {username: 'asd', password: '123'}, response_callback);
}

function simple_post(){

	var data = {
		foo: 'bar',
		baz: {
			nested: 'attribute'
		}
	}

	client.post('http://posttestserver.com/post.php', data, response_callback);

}

function multipart_post(){

	var filename = 'test_file.txt';
	var data = 'Plain text data.\nLorem ipsum dolor sit amet.\nBla bla bla.\n';
	fs.writeFileSync(filename, data);

	var black_pixel = new Buffer("data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=".replace(/^data:image\/\w+;base64,/, ""), "base64");

	var data = {
		foo: 'bar',
		bar: 'baz',
		nested: {
			my_document: { file: filename, content_type: 'text/plain' },
			even: {
				more: 'nesting'
			}
		},
    buffer: { filename:'black_pixel.gif', buffer:black_pixel, content_type: 'image/gif' },
	}

	client.post('http://posttestserver.com/post.php?dir=example', data, {multipart: true}, function(err, resp, body){

		console.log(err);
		console.log("Got status code " + resp.statusCode)
		console.log(body);
		fs.unlink(filename);

	});

}

switch(process.argv[2]){
	case 'get':
		simple_get();
		break;
	case 'auth':
		auth_get();
		break;
	case 'proxy':
		proxy_get();
		break;
	case 'post':
		simple_post();
		break;
	case 'multipart':
		multipart_post();
	default:
		console.log("Usage: ./test.js [get|auth|proxy|multipart]")
}