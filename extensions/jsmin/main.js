var jsmin  = require('jsmin2');

jt.compressor.defineJsProcessor('jsmin', function(buffer, done) {
	var data = jsmin(buffer.toString());
	done(data.code);
});