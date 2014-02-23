var uglify = require('uglify-js').minify;

jt.compressor.defineJsProcessor('uglify', function(buffer, done) {
	var data = uglify(buffer.toString(), {fromString: true});
	
	done(data.code);
});