var config = {
	base: null,
	fs: {
		list: {},
		ignorePath: []
	},
	task: {},
	project: {},
	server: require('./server.js'),
	compressor: {
		'js': {
			'jsmin': 'jt-jsmin',
			'uglify': 'jt-uglify'
		},
		'css': {
			'minicss': 'jt-cssminify'
		}
	},
	plugins: []
};

module.exports = config;