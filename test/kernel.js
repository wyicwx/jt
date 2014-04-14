var assert = require('assert');

require('./_common.js');

describe('kernel', function() {
	it('重复初始化报错显示', function() {
		assert.throws(function() {
			jt.init();
		});
	});

	it('jt.setConfig', function() {
		jt.setConfig('a.b.c.d.e.f', 1);

		if(jt.config.a.b.c.d.e.f == 1) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});

	it('jt.getConfig', function() {
		var config = jt.getConfig('test.get.config');

		if(config == 1) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});
});
