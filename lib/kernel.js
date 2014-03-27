var jt = {},
	path = require('path'),
	resolve = require('resolve'),
	fs = require('fs');

//register global variable
Object.defineProperty(global, 'jt', {
    enumerable : true,
    writable : false,
    value : jt
});

// root path
jt.root = path.resolve(__dirname, '../');
// version
jt.v = require(path.join(jt.root, '/package')).version;
// load utils 
jt.utils = require('./utils.js');
// load commander
jt.commander = require('../lib/commander.js');
// process arguments store
jt.argv = {};
// default command run at process.cwd()
jt.cwd = process.cwd();

jt.require = function(name) {
	var por, res;
	
	try {
		res = require.resolve(name);
	} catch(e) {
		res = resolve.sync(name, { basedir: jt.cwd });
	}
	
	por = require(res);

	return por;
};
// init
jt.init = function() {
	if(jt.inited) {
		throw new Error('Don\'t initialize again!');
	}

	jt.inited = true;
// config!
	if(!jt.config) {
		throw new Error('Must set jt.config!');
	}
//load virtual file system
	jt.fs = require(path.join(jt.root, 'lib/fs.js'));

	jt.builder = require(path.join(jt.root, 'lib/builder.js'));

	jt.compressor = require(path.join(jt.root, 'lib/compressor.js'));
	
	jt.server = require(path.join(jt.root, 'lib/server.js'));

	if(jt.config.plugins) {
		jt.config.plugins.forEach(function(module) {
			jt.require(module);
		});
	}
};

module.exports = jt;
