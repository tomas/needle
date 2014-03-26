var should  = require('should'),
    npm     = require('npm'),
    async   = require('async'),
    chardet = require('jschardet');

var testEncoding = function(charset){
  return function(done) {
    // We must re-require our needle module because we dynamically
    // alter the installed packages.
    var needle = require('./../');

    // Our Needle wrapper that requests a chinese website.
    var task    = needle.get.bind(needle, 'http://www.chinesetop100.com/');

    // Different instantiations of this task
    var streams = [task({decode: true}),
                   task({decode: false})];

    // Async function that detects a stream's encoding
    var detectEncoding = function (stream, done) {
      var buf = [];

      stream.on('readable', function () {
        var stream = this,
            chunk  = null;

        while (chunk = stream.read()) {
          buf.push(chunk);
        }
      });
          
      stream.on('end', function () {
        done(null, chardet.detect(Buffer.concat(buf)))
      });
    }

    // How will we know the result is valid?
    var validate = 
        (charset 
         ? // Validate that the resulting charset is indeed what we
           // expect it to be, and that the undecoded result is
           // different. 
           //
           // :NOTE: if the source url was already in `utf-8`, this
           // will fail -- so make sure that our source url is not
           // in utf-8.
           function (err, results) {
               results[0].encoding.should.equal(charset)
               results[1].encoding.should.not.equal(results[0].encoding);
               
               done();
           }

         : // No charset was provided, which means we're testing that
           // no iconv was installed.
           function (err, results) {
             // Which means that both results[0] and results[1] are
             // undecoded.
             results[1].encoding.should.equal(results[0].encoding);

             done();
           }
        );

    // Collect all encoding results and validate.
    async.map(streams, detectEncoding, validate)
  };
};

var uncache = function (id) {
  if (!id) return
  if (!require.cache[id]) return

  require.cache[id].children.forEach(function (child) {
    uncache(child.id);
  });

  delete require.cache[id];
}

// Uninstalls all decoders, invalidates cache and (re)install
// a specific decoder.
var prepareModules = function (id) {
  var modules = ['iconv', 'iconv-lite'];
  
  return function (done) {
    // Get rid of the cache (including needle)
    modules.concat(['./../']).forEach(function (module) {
      try {
        uncache(require.resolve(module));
        
      } catch (e) {} // Module not cached/found
    })

    // Tell mocha that this can take a while
    this.timeout(30000)

    commands = [];

    // Uninstall all modules (if any)
    commands.push(async.apply(npm.commands.uninstall, modules))

    // A specific module to insall was requested
    if (id) {
      commands.push(async.apply(npm.commands.install, [id]));
    }

    async.series(commands, done);
  }
}

describe('character encoding', function(){

  before(function (done) {
    npm.load(done);
  })

  describe('when server send non-UTF8 data', function(){

    //////////////////////////////////////////
    // `iconv` streaming parser
    //////////////////////////////////////////   
    describe('and the client has iconv installed', function () {
      before(prepareModules('iconv'));

      it('should not have iconv-lite installed', function () {
        require.bind(null, 'iconv-lite').should.throw()
      });

      it('should have iconv installed', function () {
        require.bind(null, 'iconv').should.not.throw()
      });

      it('client should convert this to UTF-8', testEncoding('utf-8'));
    })

    //////////////////////////////////////////
    // `iconv-lite` parser
    //////////////////////////////////////////   
    describe('and the client has iconv-lite installed', function () {
      before(prepareModules('iconv-lite'));
        
      it('should not have iconv installed', function () {
        require.bind(null, 'iconv').should.throw()
      });

      it('should have iconv-lite installed', function () {
        require.bind(null, 'iconv-lite').should.not.throw()
      });

      it('client should convert this to UTF-8', testEncoding('utf-8'));        
    })

    //////////////////////////////////////////
    // no parser available
    //////////////////////////////////////////   
    describe('and the client has no iconv or iconv-lite installed', function () {
      before(prepareModules());
          
      it('should not have iconv installed', function () {
        require.bind(null, 'iconv').should.throw()
      });

      it('should not have iconv-lite installed', function () {
        require.bind(null, 'iconv-lite').should.throw()
      });

      it('client should not convert this at all', testEncoding()); 
    })
  })
})
