<a name='v0.7' /> Api changes between v0.6 and v0.7
---------------------------------------------------

In version 0.7 a lot of work was done on the Needle internals to make streams a first class citizen. Needle can now be used as a streams2-compatible stream and you gain a lot of performance improvements come with it.

While great care was taken not to introduce any breaking changes, there are probably a few edge cases in which Needle's behaviour has changed, specifically:

 * Needle now emits a strict streams2-compatible stream. This means that if your code relied on the Needle stream to always be in flowing mode, your code will likely need an update. For more information about this new Stream behavior, please refer to [the Node.JS blog](http://blog.nodejs.org/2012/12/20/streams2/).

 * In the v0.6 release, Needle's stream didn't parse, uncompress or did anything to the body content: everything chunk of data that was emitted on the stream was the raw body. In the 0.7 release every chunk of data will be a fully processed chunk, including uncompression, character recoding and parsing (in case of XML/JSON).

If you use the regular callback interface of Needle, this will be a backwards-compatible upgrade.
