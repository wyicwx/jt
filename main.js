#!/usr/bin/env node

var jt = module.exports = require('./lib/kernel.js');

jt.run = function(argv) {
	argv || (argv = process.argv);
	jt.commander.parse(argv);
}

jt.run();