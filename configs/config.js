var jtconfig = {

	builder: {
		// develop path
		base: '../',
		// folds path for ignore
		ignorePath: []
	},

	proxy: {
		slowLoad: false,
		slowBlockByte: 10240,
		slowTimeInterval: 100,
		slient: true,
		port: {
			"8080": "default"
		}
	},
	
	processor: {
		gzip: true
	}
};

module.exports = jtconfig;
