var config = module.exports = {},
	path = require('path');
// config for builder
config.builder = {
	basePath: '/',
	// builder 
	outputPath: 'output/',
	// for builder's finder ignore folder
	ignorePath: []
};

// config for proxy
config.proxy = {
	slowLoad: false,
	slowBlockByte: 10240,
	slowTimeInterval: 100,
	pacFile: "proxy.pac",
	proxy: {
		enable: false,
		ip: '',
		port: 8888
	},
	port: {
		"8080": "port8080"
	}
};
// config for processor
config.processor = {
	gzip: true
};
