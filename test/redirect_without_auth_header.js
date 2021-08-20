let helpers = require('./helpers'),
    should = require('should'),
    needle = require('./../'),
    server;

const port = 7708;

describe('Follow authorization header', function () {

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

    describe('without headers', () => {

        it('without header', done => {
            needle.get('localhost:' + port, {
                parse: true,
                follow_max: 1,
                follow_authorization_header: false,
                headers: {
                    'authorization': 'token42'
                }
            }, function (err, resp, body) {
                Object.keys(server.requestReceived.headers).should.not.containEql('authorization');
                done();
            })
        })

    })

    describe('with header', () => {
        it('with header', done => {
            needle.get('localhost:' + port, {
                parse: true,
                follow_max: 1,
                follow_authorization_header: true,
                headers: {
                    'Authorization': 'token42'
                }
            }, (err, resp) => {
                Object.keys(server.requestReceived.headers).should.containEql('authorization');
                done();
            })
        })

    });

});