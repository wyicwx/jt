var jt = {};
//register global variable
Object.defineProperty(global, 'jt', {
    enumerable : true,
    writable : false,
    value : jt
});

var path = require('path'),
	fs = require('fs');
//colors support
require('colors');
// version
jt.v = '0.0.1';
// root path
jt.root = path.resolve(__dirname, '../');
// load utils 
jt.utils = require('./utils.js');
// process arguments
jt.argv = {};
jt.commander = require('./commander.js');
jt.cwd = process.cwd();

// init
jt.init = function() {

// config
	jt.config = require(jt.cwd + '/config.js');
// getConfig 
	jt.getConfig = function(module) {
		return require(jt.cwd + '/' + module);
	};
// load compressor
	jt.compressor = require('./compressor');
// load builder
	jt.builder = require('./builder');
// load proxy
	jt.proxy = require('./proxy');
// load pipeline
	jt.pipe = require('./pipeline.js');

// plugin scaner
	var extensions, files;
	files = fs.readdirSync(path.join(jt.root, 'extensions'));
	extensions = files.map(function(name) {
		return path.join(jt.root, 'extensions', name);
	});
	files = fs.readdirSync(path.join(jt.cwd, 'extensions'));
	files = files.map(function(name) {
		return path.join(jt.root, 'extensions', name);
	});
	extensions = extensions.concat(files);
	extensions.forEach(function(value) {
		try {
			require(value);
		} catch(e) {
			jt.utils.log('加载插件: ' + jt.utils.fill(value, 40, '.') + ' [失败]'.red);
		}
	});

// process argv
	jt.commander.parse();

};


module.exports = jt;
