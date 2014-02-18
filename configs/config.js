var jtconfig = {
	base: '../',
	fs: {
		list: {},
		ignorePath: []
	},
	project: {
		list: []
	},
	server: {
		slowSpeedSimulate: {
			enable: false,
			highWaterMark: 100,
			interval: 10,
		},
		port: 8080,
		description: 'description',
		list: {},
		hosts: {}
	},
	processor: {
		gzip: true
	}
};

module.exports = jtconfig;
