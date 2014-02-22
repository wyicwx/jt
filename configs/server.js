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

server.list['http://([^\\/]+)/(.*)js($)'] = {
	respond: [
		'$2.js'
	]
};

module.exports = server;