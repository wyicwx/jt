var assert = require('assert'),
	fs = require('fs'),
	path = require('path'),
	rewire = require('rewire');

require('../lib/kernel.js');
jt.config = require('../configs/config.js');
jt.config.base = path.resolve(__dirname);
jt.config.fs = {
	list : {
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
			}],
			"i.js": [{
				"processor": "string",
				"value": "string"
			}],
			"testForSearch.js": "a.js",
			"reTestForSearch.js": "a.js"
		}
	}
};
jt.config.project = {
	'Aproject': {
		files: [
			"fs/a.js",
			"fs/b.js",
			"fs/c.js"
		]
	},
	'Bproject': {
		files: []
	}
};

jt.init();

var builder = jt.extensions.builder.exports;

describe('extension builder', function() {
	it('#getFilesByProject()', function() {
		var files = builder.getFilesByProject('Aproject');
		if(files.length == 3) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});

	it('#getAllProject()', function() {
		var projects = builder.getAllProject();

		if(projects.length == jt.utils.size(jt.config.project)) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});

	it('#hasProject()', function() {
		if(builder.hasProject('Aproject')) {
			assert.ok(true);
		}

		if(builder.hasProject('')) {
			assert.ok(false);
		}

		if(builder.hasProject('AprojectA')) {
			assert.ok(false);
		}
	});

	describe('#build()', function() {
		it('it has data return true, return false by not data', function() {
			var returnA = builder.build('Aproject');
			var returnB = builder.build('AAproject');

			if(returnA === true && returnB === false) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('it return project files count', function(done) {
			builder.build('Aproject', function(datas) {
				if(datas.length == builder.getFilesByProject('Aproject').length) {
					done();
				} else {
					done(false);
				}
			});
		});
	});

	describe('#buildStream()', function() {
		it('it has project return array, return null by not project', function() {
			var returnA = builder.buildStream('Aproject');
			var returnB = builder.buildStream('AAproject');
			var returnC = builder.buildStream('Bproject');

			if(jt.utils.isArray(returnA) && jt.utils.isArray(returnC) && jt.utils.isNull(returnB)) {
				if(returnA.length && !returnC.length) {
					assert.ok(true);
					return;
				}
			}
			assert.ok(false);
		});

		it('it return a count stream', function(done) {
			var ret = builder.buildStream('Aproject');
			var app = jt.utils.do();

			ret.forEach(function(stream) {
				app.do(function(done) {
					stream.resume();
					
					stream.on('end', function() {
						done()
					});
				});
			});

			app.done(function() {
				done();
			});

		});
	});
});