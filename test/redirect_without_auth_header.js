let helpers = require('./helpers'),
    needle = require('./../'),
    server;

const port = 7708;

describe('follow_authorization_header', () => {
    before(done => {
        server = helpers.server({
            port: port,
            headers: {
                location: "home"
            },
            code: 302
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
            },  () => {
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