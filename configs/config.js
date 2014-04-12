var config = {
	base: null, 
	fs: {
		list: {},
		ignorePath: []
	},
	project: {},
	server: require('./server.js'),
	compressor: {
		'jsmin': 'jt-jsmin',
		'uglify': 'jt-uglify'
	},
	plugins: []
};

module.exports = config;