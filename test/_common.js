'use strict';
var path = require('path');

var jt = require('../lib/core/kernel.js');
jt.configDir = __dirname;

var fsConfig = {
	list : {
		'fs': {
			'ignore/': {
				'ignoreFile.js': [
					'../a.js'
				],
				'a.js': [
					'../a.js'
				]
			},
			'compressor': {
				'a.css': [{
					'processor': 'compressCss',
					'file': 'fs/a.css'
				}],
				'a.js': [{
					'processor': 'compressJs',
					'file': 'fs/a.js'
				}],
				'a.html': [{
					'processor': 'compressHtml',
					'file': 'fs/a.html'
				}]
			},
			'c.js': [
				'a.js',
				'b.js'
			],
			'd.js': 'd.js',
			'e.js': 'a.js',
			'f.js': [{
				'value': 'string'
			}],
			'g.js': [
				'c.js',
				'f.js'
			],
			'h.js': [{
				'processor': 'notExist'
			}],
			'i.js': [{
				'value': 'string'
			}],
			'j.js': [{
				'file': 'f.js'
			}],
			'k.js': [{
				'value': '0'
			}],
			'l.js': [{
				'file': 'j.js'
			}],
			'm.js': [{
				'file': 'j.js'
			}],
			'buildF1.js': [{
				'file': 'j.js'
			}],
			'buildF2.js': [{
				'file': 'j.js'
			}],
			'buildF3.js': [{
				'file': 'j.js'
			}],
			'testForSearch.js': 'a.js',
			'reTestForSearch.js': 'a.js',
			'toRemove.js': 'a.js',
			'through.js': [{
				'processor': ['through'],
				'value': 'test'
			}]
		},
		'processor/': {
			'notFileValue.js': [{
				'processor': 'string'
			}],
			'notProcessor.js': [{
				'processor': '123123',
				'value': 'test'
			}],
			'Minifyjs.js': [{
				'processor': 'Minifyjs',
				'value': 'test'
			}]
		},
		'build': {
			'one.js': [{value: '1'}],
			'two.js': [{value: '2'}],
			'three': [{value: '3'}]
		},
		'minify': {
			'*': [{
				'processor': 'Minifyjs',
				'file': '../fs/*.js',
				'rename': function(filename) {
					return filename.replace(/\.js$/, '.min.js');
				}
			}, {
				'processor': 'Minifyjs',
				'file': '../fs/*.css'
			}, {
				'file': [
					'../processor/*.js'
				]
			}]
		}
	},
	ignorePath: [
		'fs/ignore/*'
	]
};
var projectConfig = {
	'Aproject': {
		files: [
			'fs/a.js',
			'fs/b.js',
			'fs/c.js',
			'fs/null.js'
		]
	},
	'Bproject': {
		files: [],
		output: 'fs/output'
	},
	'Cproject': {
		files: [
			'fs/j.js',
			'fs/i.js',
			'fs/k.js',
			'fs/null.js'
		]
	},
	'globProject': {
		files: [
			'build/*'
		]
	},
	'stringProject': {
		files: 'fs/j.js'
	},
	'localFileProject': {
		files: ['fs/a.js']
	}
};
var list = {
	'http://github.com/wyicwx/jt/headers': {
		headers: {
			Customadd: 'add',
			Server: 'testServer'
		}
	},
	'http://github.com/wyicwx/jt/statusCode': {
		statusCode: 404
	},
	'http://github.com/wyicwx/jt/file/(.*)': {
		respond: [{
			file: '$1'
		}]
	},
	'http://github.com/wyicwx/jt/value/(.*)': {
		respond: [{
			value: '$1'
		}]
	},
	'http://github.com/wyicwx/jt/(.*)': {
		respond: '$1'
	},
	'http://github.com/wyicwx/jt($)': {
		respond: ['fs/a.js']
	},
};
jt.setConfig('base', path.resolve(__dirname));
jt.setConfig('fs', fsConfig);
jt.setConfig('project', projectConfig);
jt.setConfig('test.get.config', 1);
jt.setConfig('server.list', list);
jt.init();
var through = require('through2');

jt.fs.assign('string', function() {
	return through();
});