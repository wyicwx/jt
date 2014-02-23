var yui = require('yuicompressor');

jt.compressor.defineJsProcessor('yui', function(buffer, done) {
	yui.compress(buffer.toString(), function(err, data, extra) {
		if(err) throw err;
		done(data);
	});
	
});

