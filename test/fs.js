var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

require('./_common.js');

describe('jt.fs', function() {
	describe('#pretreatment', function() {
		it('jt.config.fs.list需要格式化成完整路径', function() {
			['c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'h.js', 'i.js'].forEach(function(name) {
				if(path.join(jt.config.base, "fs/"+name) in jt.config.fs.list) {
					assert.ok(true);
				} else {
					assert.ok(false);
				}
			});
		});

		it('run processor', function(done) {
			jt.fs.readFile('fs/f.js', function(data) {
				if(data.toString() == 'string') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('run not define processor', function(done) {
			jt.fs.readFile('fs/h.js', function(data) {
				if(data.toString() == '') {
					done();
				} else {
					done(false);
				}
			});
		});
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
				var ret = Buffer.concat([a, new Buffer('\n'), b]);
				if(chunk.toString() == ret.toString()) {
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

		it('support processor option\'s file is be read', function(done) {
			jt.fs.readFile('fs/j.js', function(data) {
				if(data.toString() == 'string') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('对processor支持多个参数多processor，并将结果串行传递', function(done) {
			jt.fs.processorDefine('test1', function(data, opt, done) {
				var data = data.toString();

				data += '1';
				done(data);
			});

			jt.fs.readFile('fs/k.js', function(buffer) {
				if(buffer.toString() == '01') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('处理器的file参数多重引用的支持', function(done) {
			jt.fs.readFile('fs/l.js', function(buffer) {
				if(buffer.toString() == 'define("test", "string");') {
					done();
				} else {
					done(false);
				}
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

	describe('#search()', function() {
		it('could be search file while exist in real file system', function() {
			jt.fs.search('c.js', function(data) {
				if(jt.fs.isVirtual(data[0])) {
					assert.ok(true);
				} else {
					assert.ok(false);
				}
			});
		});

		it('it search virtual result must be in virtual file system', function() {
			jt.fs.search('b.js', function(data) {
				var file = jt.fs.pathConverter('fs/b.js'),
					hasFile = false;

				data.forEach(function(value) {
					if(value == file) {
						hasFile = true;
					}
				});

				if(hasFile) {
					assert.ok(true);
				} else {
					assert.ok(false);
				}
			});
		});
	});

	describe('#searchVirtual()', function() {
		it('could be fuzzy search', function() {
			var result = jt.fs.searchVirtual('ForSearch.js'),
				ret1 = jt.fs.pathConverter('fs/testForSearch.js'),
				ret2 = jt.fs.pathConverter('fs/reTestForSearch.js'),
				hasRet1 = false, hasRet2 = false;

			result.forEach(function(value) {
				if(!hasRet1 && value == ret1) {
					hasRet1 = true;
				}
				if(!hasRet2 && value == ret2) {
					hasRet2 = true;
				}
			});

			if(hasRet1 && hasRet2) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});
	});

	describe('#map2local()', function() {
		it('it exist in real file system', function(done) {
			var filename = jt.fs.pathConverter('fs/toRemove.js');
			if(fs.existsSync(filename)) {
				fs.unlinkSync(jt.fs.pathConverter(filename));
			}

			jt.fs.map2local(filename, function() {
				if(fs.existsSync(filename)) {
					done();
					fs.unlinkSync(jt.fs.pathConverter(filename));
				}
			});
		});
	});

	describe('private function', function() {
		it('#_map2combo(), prevent duplicate references to cause a stack overflow', function() {
			jt.privateFs.__get__('_map2combo')('fs/d.js');
		});

		describe('#_readSimpleFile()', function() {		
			var filename = path.join(jt.root, 'test/fs/fs.js');
			it('it use fs.readFile but not file return null', function(done) {
				jt.privateFs.__get__('_readSimpleFile')(filename, function(data) {
					if(data.toString() === '') {
						done();
					} else {
						done(true);
					}
				});
			});

			it('it must return buffer', function(done) {
				jt.privateFs.__get__('_readSimpleFile')(filename, function(data) {
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