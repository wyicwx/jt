var assert = require('assert');
var http = require('http');

require('./_common.js');
jt.commander.run(['server', 'start']);

function getContent(callback) {
	return function(response) {
		var chunks = [];
		response.on('data', function(chunk) {
			chunks.push(chunk);
		});

		response.on('end', function() {
			var data = Buffer.concat(chunks);

			callback(data);
		});
	}
}
describe('server', function() {
	it('http头正确返回无cache状态', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt',
			agent: false
		}, function(response) {
			if(response.headers['cache-control'] == 'max-age=0') {
				done();
			} else {
				done(false);
			}
		}).on('error', function() {
			done(false);
		}).end();
	});

	it('正确匹配url', function() {
		var result = jt.server.getMatchRule('github.com/wyicwx/jt');
		if(!result.length) {
			assert.ok(false);
		}
	});

	it('正确捕获正则匹配, string替换', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt/fs/a.js',
			agent: false
		}, getContent(function(data) {
			jt.fs.readFile('fs/a.js', function(file) {
				if(file.toString() == data.toString()) {
					done();
				} else {
					done(false);
				}
			});
		})).on('error', function() {
			done(false);
		}).end();
	});

	it('正确捕获正则匹配, file替换', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt/file/fs/a.js',
			agent: false
		}, getContent(function(data) {
			jt.fs.readFile('fs/a.js', function(file) {
				if(file.toString() == data.toString()) {
					done();
				} else {
					done(false);
				}
			});
		})).on('error', function() {
			done(false);
		}).end();
	});

	it('正确捕获正则匹配, value替换', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt/value/success',
			agent: false
		}, getContent(function(data) {
			if(data == 'success') {
				done();
			} else {
				done(false);
			}
		})).on('error', function() {
			done(false);
		}).end();
	});

	it('自定义statucCode', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt/statusCode',
			agent: false
		}, function(response) {
			if(response.statusCode == 404) {
				done();
			} else {
				done(false);
			}
		}).on('error', function() {
			done(false);
		}).end();
	});

	it('自定义header', function(done) {
		http.request({
			hostname: 'localhost',
			port: 8080,
			path: 'http://github.com/wyicwx/jt/headers',
			agent: false
		}, function(response) {
			if(response.headers.customadd == 'add' && response.headers.server == 'testServer') {
				done();
			} else {
				done(false);
			}
		}).on('error', function() {
			done(false);
		}).end();
	});

	it('help', function() {
		jt.commander.run(['server']);
	});

	it('urlChecker', function() {
		jt.commander.run(['server', '--url=http://github.com/wyicwx/jt/value/success']);
	})
});
