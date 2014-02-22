var config = {
	base: '../', 
	fs: {
		list: require('./fs.js'),
		ignorePath: []
	},
	project: require('./project.js'),
	server: require('./server.js'),
	compressor: {
		gzip: true
	}
};

module.exports = config;
