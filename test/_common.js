var assert = require('assert'),
	fs = require('fs'),
	path = require('path'),
	rewire = require('rewire');

var jt = require('../lib/kernel.js');
jt.config = require('../configs/config.js');
jt.config.base = path.resolve(__dirname);
var fsConfig = fs = {
	list : {
		"fs/": {
			"ignore/": {
				"ignoreFile.js": [
					"../a.js"
				],
				"a.js": [
					"../a.js"
				]
			},
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
			"j.js": [{
				"processor": "string",
				"file": "fs/f.js"
			}],
			"k.js": [{
				"processor": "string,test1",
				"value": "0"
			}],
			"l.js": [{
				"processor": "seajs-define-string",
				"file": "fs/j.js",
				"name": "test"
			}],
			"testForSearch.js": "a.js",
			"reTestForSearch.js": "a.js",
			"toRemove.js": "a.js"
		}
	},
	ignorePath: [
		"fs/ignore"
	]
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


jt.config.fs = jt.utils.clone(fsConfig);
jt.init();
jt.config.fs = jt.utils.clone(fsConfig);
jt.privateFs = rewire('../lib/fs.js');