var server = {
	slowSpeedSimulate: {
		enable: false,
		highWaterMark: 100,
		interval: 10,
	},
	port: 8080,
	description: 'default',
	list: {},
	hosts: {}
};

var config = {
	base: null,
	fs: {
		list: {},
		ignorePath: []
	},
	task: {},
	project: {},
	server: server,
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