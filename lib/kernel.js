var jt = {},
	path = require('path'),
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
// extension store
jt.extensions = {};

// init
jt.init = function() {
	if(jt.inited) 
		return;

	jt.inited = true;
// config!
	if(!jt.config) {
		throw new Error('  must set jt.config!');
	}
//load virtual file system
	jt.fs = require(path.join(jt.root, 'lib/fs.js'));

	jt.builder = require(path.join(jt.root, 'lib/builder.js'));

	jt.compressor = require(path.join(jt.root, 'lib/compressor.js'));
	
	jt.server = require(path.join(jt.root, 'lib/server.js'));

	// loadExtensions();
};

function loadExtensions() {
	var files,
		extensions;

	if(fs.existsSync(path.join(jt.cwd, 'extensions'))) {	
		extensions = fs.readdirSync(path.join(jt.cwd, 'extensions')).map(function(name) {
			return path.join(jt.cwd, 'extensions', name);
		});

		extensions.forEach(function(value) {
			var pkg;
			try {
				pkg = require(value+'/package.json');
			} catch(e) {
				console.log('  ['+'warning'.red+'] '+value+'/package.json not exist! check please.');
				return;
			}

			try {
				pkg.path = value;
				pkg.exports = require(value);
				jt.extensions[pkg.name] = pkg;
			} catch(e) {
				throw e;
			}
		});
	}
}

module.exports = jt;
