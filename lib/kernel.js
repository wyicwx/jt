var jt = {};
//register global variable
Object.defineProperty(global, 'jt', {
    enumerable : true,
    writable : false,
    value : jt
});

var fs = require('fs'),
	path = require('path');
//colors support
require('colors');
// version
jt.v = '0.0.1';
// root path
jt.root = path.normalize(__dirname + '/../');
// config
jt.config = require(jt.root + '/configs/base.js');
jt.getConfig = function(name) {
	return require(jt.root + '/configs/' + name + '.js');
};
// load utils include underscore
jt.utils = require('./utils.js');
// process arguments
jt.argv = {};
jt.commander = require('./commander.js');
// load compressor
jt.compressor = require('./compressor');
// load builder
jt.builder = require('./builder');
// load proxy
jt.proxy = require('./proxy');
// load pipeline
jt.pipe = require('./pipeline');

// plugin scaner
var files = fs.readdirSync(jt.root + '/plugin');
files.forEach(function(value) {
	try {
		require(jt.root + '/plugin/' + value);
	} catch(e) {
		jt.utils.log('加载插件: ' + jt.utils.fill(value, 40, '.') + ' [失败]'.red);
	}
});

module.exports = jt;
