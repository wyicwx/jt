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
		throw new Error('  master set jt.config!');
	}
//init virtual file system
	jt.fs = require(path.join(jt.root, 'lib/fs.js'));

// // load compressor
// 	jt.compressor = require(path.join(jt.root, 'lib/compressor'));
// // load builder
// 	jt.builder = require(path.join(jt.root, 'lib/builder'));
// // load proxy
// 	jt.proxy = require(path.join(jt.root, 'lib/proxy'));
};

function loadExtensions() {
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
}
jt.run = function(argv) {
// parse commander
	jt.commander.parse(argv);
	jt.commander.run();
};

module.exports = jt;
