// NOTE: this is a tray specific test
const helpers = require('./helpers'),
    needle = require('./../');

const port = 7708;

describe('follow_authorization_header', () => {
	let server;
    before(done => {
        server = helpers.server({
            port: port,
            headers: {
                location: "home"
            },
            code: 302,
			wait: 100
        }, done);
    })

    after(done => {
        server.close(done);
    })

    describe('when false', () => {
        it('should omit authorization header', done => {
            needle.get('localhost:' + port, {
                parse: true,
                follow_max: 1,
                follow_authorization_header: false,
                headers: {
                    'authorization': 'token42'
                }
            },  (err, resp) => {
                Object.keys(server.requestReceived.headers).should.not.containEql('authorization');
                done();
            })
        })

    })

    describe('when true', () => {
        it('should include authorization header', done => {
            needle.get('localhost:' + port, {
                parse: true,
                follow_max: 1,
                follow_authorization_header: true,
                headers: {
                    'authorization': 'token42'
                }
            }, (err, resp) => {
                Object.keys(server.requestReceived.headers).should.containEql('authorization');
                done();
            })
        })

    });

});
