var assert = require('assert');

describe('kernel', function() {
	it('not throw error', function() {
		try {
			require('../lib/kernel.js');
		} catch(e) {
			assert.ok(false);
		}
		assert.ok(true);		
	});	
});
