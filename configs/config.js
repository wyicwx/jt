var config = {
	base: '../', 
	fs: {
		list: require('./fs.js'),
		ignorePath: []
	},
	project: require('./project.js'),
	server: require('./server.js'),
	compressor: {
		'jsmin': 'jt-jsmin',
		'uglify': 'jt-uglify'
	},
	plugins: []
};

module.exports = config;