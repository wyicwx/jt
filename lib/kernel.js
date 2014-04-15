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
// jt runtime directory
jt.cwd = process.cwd();
// config
jt.config = require('../configs/config.js');
// confid file directory
jt.configDir; 
// setConfig
jt.setConfig = function(name, value) {
	var names = name.split('.');
	var config = jt.config;
	names.forEach(function(prop, key) {
		var def;
		if(key == (names.length-1)) {
			def = value;
		} else {
			def = {};
		}

		prop = prop.trim();
		if(!config[prop]) {
			config[prop] = def;
		} else {
			jt.utils.extend(config[prop], def);
		}

		config = config[prop];
	});

	return this;
};
// getConfig
jt.getConfig = function(name) {
	var names = name.split('.');
	var config = jt.config;

	names.forEach(function(prop, key) {
		if(!config) return;
		prop = prop.trim();
		config = config[prop];
	});

	return config;
};
// require for jt.configDir/node_modules
jt.require = function(name) {
	var por, res;
	
	try {
		res = require.resolve(name);
	} catch(e) {
		res = resolve.sync(name, { basedir: jt.configDir });
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

	if(!jt.config.base) {
		throw new Error('Must be set jt.config.base!');
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
