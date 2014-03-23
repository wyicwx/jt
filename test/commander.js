var assert = require('assert');

require('./_common.js');

describe('jt.commander', function() {
	it('执行info不报错', function() {
		assert.doesNotThrow(function() {
			jt.commander.run(['info']);
		});
	});
});