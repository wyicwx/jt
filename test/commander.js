var assert = require('assert');

require('./_common.js');

describe('jt.commander', function() {
	it('执行info不报错', function() {
		assert.doesNotThrow(function() {
			jt.commander.run(['info']);
		});
	});

	it('choose 选择某一项', function(done) {
		var count = parseInt(Math.random() * 100);
		var ar = [];

		for(var i = 0; i < count; i++) {
			ar[i] = Math.random();
		}

		var select = parseInt(Math.random() * count);
		jt.commander.choose(ar, function(data) {
			if(data.length == 1 && data[0] == ar[select-1]) {
				done();
			} else {
				done(false);
			}
		});

		process.stdin.emit('data', select.toString());
	});

	it('choose all', function(done) {
		var count = parseInt(Math.random() * 50);
		var ar = [];

		for(var i = 0; i < count; i++) {
			ar[i] = Math.random();
		}

		jt.commander.choose(ar, function(data) {
			if(data == ar) {
				done();
			} else {
				done(false);
			}
		});

		process.stdin.emit('data', 'all');
	});

	it('choose simple', function(done) {
		jt.commander.choose('test', function(data) {
			if(Array.isArray(data) && data.length == 1 && data[0] == 'test') {
				done();
			} else {
				done(false);
			}
		});
		process.stdin.emit('data', '1');
	});
});