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
			"compressor": {
				"a.css": [{
					"processor": "compressCss",
					"file": "fs/a.css"
				}],
				"a.js": [{
					"processor": "compressJs",
					"file": "fs/a.js"
				}],
				"a.html": [{
					"processor": "compressHtml",
					"file": "fs/a.html"
				}]
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
			"fs/c.js",
			"fs/null.js"
		]
	},
	'Bproject': {
		files: [],
		output: 'fs/output'
	},
	'Cproject': {
		files: [
			"fs/h.js",
			"fs/i.js",
			"fs/k.js",
			"fs/null.js"
		]
	}
};


jt.config.fs = jt.utils.clone(fsConfig);
jt.init();
jt.config.fs = jt.utils.clone(fsConfig);
jt.privateFs = rewire('../lib/fs.js');
jt.privateServer = rewire('../lib/server.js');