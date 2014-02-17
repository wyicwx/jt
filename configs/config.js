var jtconfig = {
	base: '../',
	fs: {
		list: [],
		ignorePath: []
	},
	builder: {
		list: []
	},
	proxy: {
		slowLoad: false,
		slowBlockByte: 10240,
		slowTimeInterval: 100,
		agent: {
			host: null,
			port: null
		},
		port: {
			"8080": "default"
		}
	},
	server: {
			slowSpeedSimulate: {
				enable: false,
				highWaterMark: 100,
				interval: 10,
			},
			port: 8081,
			description: '81 host only',
			list: {},
			hosts: {}
	},
	processor: {
		gzip: true
	}
};

module.exports = jtconfig;
