var assert = require('assert');

require('./_common.js');

describe('kernel', function() {
	it('重复初始化报错显示', function() {
		assert.throws(function() {
			jt.init();
		});
	});	
});
