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
			"a.js",
			"b.js",
			"c.js"
		]
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
		it('', function() {

		});
	});
});