var jt = {},
	path = require('path'),
	fs = require('fs');

//register global variable
Object.defineProperty(global, 'jt', {
    enumerable : true,
    writable : false,
    value : jt
});

//colors support
require('colors');
// root path
jt.root = path.resolve(__dirname, '../');
// version
jt.v = require(path.join(jt.root, '/package')).version;
// load utils 
jt.utils = require('./utils.js');
// load pipeline
jt.pipe = require('./pipeline.js');
// process arguments store
jt.argv = {};
// load commander
jt.commander = require('./commander.js');
// default command run at process.cwd()
jt.cwd = process.cwd();
// extension store
jt.extensions = {};

// init
jt.init = function() {
// config, compatible!
	jt.config = jt.config || require(path.join(jt.cwd, '/config.js'));
// getConfig 
	jt.getConfig = function(module) {
		if(!jt.getConfig[module]) {
			jt.getConfig[module] = require(path.join(jt.cwd, module))
		}
		return jt.getConfig[module];
	};
// load compressor
	jt.compressor = require('./compressor');
// load builder
	jt.builder = require('./builder');
// load proxy
	jt.proxy = require('./proxy');

// plugin scaner
	var extensions, files;
	files = fs.readdirSync(path.join(jt.root, 'extensions'));
	extensions = files.map(function(name) {
		return path.join(jt.root, 'extensions', name);
	});
	files = fs.readdirSync(path.join(jt.cwd, 'extensions'));
	files = files.map(function(name) {
		return path.join(jt.cwd, 'extensions', name);
	});
	extensions = extensions.concat(files);
	extensions.forEach(function(value) {
		var pkg;
		try {
			pkg = require(value+'/package.json');
		} catch(e) {
			console.log('  not found '.red+value+'/package.json, check extensions!');
			return;
		}

		try {	
			require(value);
			pkg.path = value;
			jt.extensions[pkg.name] = pkg;
		} catch(e) {
			throw e;
		}
	});
};

jt.run = function(argv) {
// parse commander
	jt.commander.parse(argv);
	jt.commander.run();
}

module.exports = jt;
