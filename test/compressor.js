var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

require('./_common.js');
var compressor = jt.compressor;

describe('jt.compressor', function() {
	describe('#js()', function() {
		it('压缩后尺寸变小且压缩后不为空', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				var origSize = buffer.length;
				jt.compressor.js(buffer, function(buffer) {
					if(buffer.length && buffer.length <= origSize) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('返回值是buffer', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				jt.compressor.js(buffer, function(buffer) {
					if(Buffer.isBuffer(buffer)) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('扩展compressJs支持', function(done) {
			jt.fs.readFile('fs/a.js', function(buffer) {
				jt.compressor.js(buffer, function(data1) {

					jt.fs.readFile('fs/compressor/a.js', function(data2) {
						if(data1.toString() == data2.toString()) {
							done();
						} else {
							done(false);
						}
					});
				});
			});
		});
	});

	describe('#css()', function() {
		it('压缩后尺寸变小且压缩后不为空', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				var origSize = buffer.length;
				jt.compressor.css(buffer, function(buffer) {
					if(buffer.length && buffer.length <= origSize) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('返回值是buffer', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				jt.compressor.css(buffer, function(buffer) {
					if(Buffer.isBuffer(buffer)) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('扩展compressCss支持', function(done) {
			jt.fs.readFile('fs/a.css', function(buffer) {
				jt.compressor.css(buffer, function(data1) {

					jt.fs.readFile('fs/compressor/a.css', function(data2) {
						if(data1.toString() == data2.toString()) {
							done();
						} else {
							done(false);
						}
					});
				});
			});
		});
	});

	describe('#bestJs()', function() {
		it('压缩后尺寸变小且压缩后不为空', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				var origSize = buffer.length;
				jt.compressor.bestJs(buffer, function(buffer) {
					if(buffer.length && buffer.length <= origSize) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('返回格式校验,参数1buffer,参数2最小压缩参数信息,参数3所有信息.', function(done) {
			jt.fs.readFile('fs/c.js', function(buffer) {
				jt.compressor.bestJs(buffer, function(buffer, bestInfo, all) {
					var availd = true;
					if(!Buffer.isBuffer(buffer)) {
						availd = false;
					}
					if(!jt.utils.isObject(buffer)) {
						availd = false;
					}
					if(!jt.utils.isArray(all)) {
						availd = false;
					}

					var has = false;

					jt.utils.each(all, function(item) {
						if(item == bestInfo) has = true;
					});

					if(has && availd) {
						done();
					} else {
						done(false);
					}
				});
			});
		});
	});

	describe('#html()', function() {
		it('压缩后尺寸变小且压缩后不为空', function(done) {
			jt.fs.readFile('fs/a.html', function(buffer) {
				var origSize = buffer.length;
				jt.compressor.html(buffer, function(buffer) {
					if(buffer.length && buffer.length <= origSize) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('返回值是buffer', function(done) {
			jt.fs.readFile('fs/a.html', function(buffer) {
				jt.compressor.html(buffer, function(buffer) {
					if(Buffer.isBuffer(buffer)) {
						done();
					} else {
						done(false);
					}
				});
			});
		});

		it('扩展compressHtml支持', function(done) {
			jt.fs.readFile('fs/a.html', function(buffer) {
				jt.compressor.html(buffer, function(data1) {

					jt.fs.readFile('fs/compressor/a.html', function(data2) {
						if(data1.toString() == data2.toString()) {
							done();
						} else {
							done(false);
						}
					});
				});
			});
		});
	});
});