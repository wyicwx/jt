var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

require('./_common.js');
var compressor = jt.compressor;

describe('jt.compressor', function() {

	it('Minifyjs正常运行', function() {
		jt.fs.readFile('processor/Minifyjs.js', function(data) {});
	});


	it('compress -f 单文件', function(done) {
		jt.commander.run(['compress', '-f', 'fs/m.js']);
		setTimeout(function() {
			var file = jt.fs.pathResolve('fs/m.min.js');
			if(fs.existsSync(file)) {
				fs.unlinkSync(file);
				done();
			} else {
				done(false);
			}
		}, 1000);
	});

	it('compress -f gzip', function(done) {
		jt.commander.run(['compress', '-f', 'fs/l.js', '--gzip']);
		setTimeout(function() {
			var file = jt.fs.pathResolve('fs/l.min.js');
			if(fs.existsSync(file)) {
				fs.unlinkSync(file);
				done();
			} else {
				done(false);
			}
		}, 1000);
	});

	it('compress -f --out', function(done) {
		jt.commander.run(['compress', '-f', 'fs/l.js', '--out=~/fs/ignore']);
		setTimeout(function() {
			var file = jt.fs.pathResolve('fs/ignore/l.min.js');
			if(fs.existsSync(file)) {
				fs.unlinkSync(file);
				done();
			} else {
				done(false);
			}
		}, 1000);
	});

	it('compress -f 多文件', function(done) {
		jt.commander.run(['compress', '-f', 'fs/buildF1.js', 'fs/buildF2.js', 'fs/buildF3.js']);
		setTimeout(function() {
			process.stdin.emit('data', 'all\r\n');
		}, 10);
		setTimeout(function() {
			var file1 = jt.fs.pathResolve('fs/buildF1.min.js');
			var file2 = jt.fs.pathResolve('fs/buildF2.min.js');
			var file3 = jt.fs.pathResolve('fs/buildF3.min.js');
			var has = true;
			[file1, file2, file3].forEach(function(file) {
				if(fs.existsSync(file)) {
					fs.unlinkSync(file);
				} else {
					has = false;
				}
			});

			if(has) {
				done();
			} else {
				done(false);
			}
		}, 1000);
	});

	it('compress -f 正常显示help,没有报错', function() {
		jt.commander.run(['compress', '-f']);
	});

	it('compress 正常显示help,没有报错', function() {
		jt.commander.run(['compress']);
	});
});