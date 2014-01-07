var proxy = module.exports = {};
// start proxy
proxy.start = function() {
	require('./main.js');
};

// 预处理规则
proxy.formatRule = function(port) {
	var cfg = jt.config.proxy.port[port],
		utils = require('./libs/utils.js'),
		list, hosts, dealList;

	cfg = jt.getConfig('proxy')[cfg];


	list = cfg.list;
	hosts = cfg.hosts;

	//格式化规则
	return {
		lists: utils.dealList(list),
		hosts: cfg.hosts
	};
};