var assert = require('assert'),
	fs = require('fs'),
	path = require('path'),
	rewire = require('rewire');

require('../lib/kernel.js');
jt.config = require('../configs/config.js');
jt.config.base = path.resolve(__dirname);
jt.config.fs = {
	"fs/": {
		"c.js": [
			"a.js",
			"b.js"
		],
		"d.js": "d.js",
		"e.js": "a.js",
		"f.js": [{
			"processor": "string",
			"value": "string"
		}],
		"g.js": [
			'c.js',
			'f.js'
		],
		"h.js": [{
			"processor": "notDefine"
		}]
	}
};


jt.fs = rewire('../lib/fs.js');

describe('jt.fs', function() {
	describe('#pretreatment', function() {
		it('define processor', function() {		
			jt.fs.processorDefine('string', function(data) {
				this.next(data.value);
			});			
		});

		it('run processor', function(done) {
			jt.fs.readFile('fs/f.js', function(data) {
				if(data.toString() == 'string') {
					done();
				} else {
					done(true);
				}
			});
		});

		it('run not define processor', function(done) {
			jt.fs.readFile('fs/h.js', function(data) {
				if(data.toString() == '') {
					done();
				} else {
					done(true);
				}
			});
		})
	});

	describe('#createReadStream()', function() {
		it('it must be stream object', function() {
			var stream = jt.fs.createReadStream();
			var methods = ['read', 'resume', 'pause', 'pipe'];

			for(var i in methods) {
				if(!stream[methods[i]]) {
					assert.ok(false);
				}
			}
			assert.ok(true);
		});	

		it('read virtual file "c.js", it must be merged by "a.js" and "b.js"', function(done) {
			var stream = jt.fs.createReadStream('fs/c.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				var a = fs.readFileSync(path.join(jt.root, 'test/fs/a.js'));
				var b = fs.readFileSync(path.join(jt.root, 'test/fs/b.js'));

				if(chunk.toString() == a+b) {
					done();
				} else {
					done(true);
				}
			});
		});

		it('read real file "a.js", it must be equivalent to fs.readFile\'s result', function(done) {
			var stream = jt.fs.createReadStream('fs/a.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				var a = fs.readFileSync(path.join(jt.root, 'test/fs/a.js'));

				if(chunk.toString() == a) {
					done();
				} else {
					done(true);
				}
			});
		});
	});

	describe('#readFile()', function() {
		it('it result must be equivalent to createReadStream', function(done) {
			var stream = jt.fs.createReadStream('fs/c.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				var ret = jt.fs.readFile('fs/c.js', function(data) {
					if(chunk.toString() == data.toString()) {
						done();
					} else {
						done(true);
					}
				});
			});
		});
	});

	describe('#isVirtual()', function() {
		it('combo file is virtual file', function() {
			var ensure = jt.fs.isVirtual('fs/c.js');

			assert.ok(ensure);
		});

		it('real file is not virtual file', function() {
			var ensure1 = jt.fs.isVirtual('fs/a.js');
			var ensure2 = jt.fs.isVirtual('fs/b.js');

			assert.ok(!ensure1 && !ensure2);
		});
	});

	describe('private function', function() {
		it('#_map2combo(), prevent duplicate references to cause a stack overflow', function() {
			jt.fs.__get__('_map2combo')('fs/d.js');
		});

		describe('#_readSimpleFile()', function() {		
			var filename = path.join(jt.root, 'test/fs/fs.js');
			it('it use fs.readFile but not file return null', function(done) {
				jt.fs.__get__('_readSimpleFile')(filename, function(data) {
					if(data.toString() === '') {
						done();
					} else {
						done(true);
					}
				});
			});

			it('it must return buffer', function(done) {
				jt.fs.__get__('_readSimpleFile')(filename, function(data) {
					if(Buffer.isBuffer(data)) {
						done();
					} else {
						done(true);
					}
				});
			});
		})
	});
});
