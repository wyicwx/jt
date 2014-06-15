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

	function _load(p) {
		return require(path.join(jt.root, p));
	}

	//load virtual file system
	jt.fs = _load('lib/fs.js');
	jt.builder = _load('lib/builder.js');
	jt.compressor = _load('lib/compressor.js');
	jt.server = _load('lib/server.js');
	//load inner apps
	_load('lib/apps/commander/cmd.js');
	_load('lib/apps/builder/cmd.js');
	_load('lib/apps/compressor/cmd.js');
	_load('lib/apps/server/cmd.js');

	if(jt.config.plugins) {
		jt.config.plugins.forEach(function(module) {
			jt.require(module);
		});
	}
};

module.exports = jt;
