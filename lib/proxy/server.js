var utils = require('./libs/utils.js'),
	config = jt.config.proxy,
	app = require('express')(),
	server = require('http').Server(app),
	proxy, pac, list, host, dealList;

function start(port, log) {
	var cfg = config.port[port],
		requestHandler;

	cfg = jt.getConfig('proxy')[cfg];

	// 预处理规则
	(function() {
		//格式化规则
		list = cfg.list;
		hosts = cfg.hosts;

		dealList = utils.dealList(list);
	})();

	requestHandler = require('./libs/proxy.js');
	requestHandler.init(dealList, hosts);

	// hold 所有请求
	app.all('*', function(request, response) {
		if(request.headers.host.search(/127.0.0.1|localhost/) != -1) {
			response.end('^o^');

			return false;
		}
		
		if(log) {
			console.log('http: ' + request.url);	
		}
		//请求是否在替换list内
		var fileInfo = requestHandler.getReplaceFileInfo(request);

		if(fileInfo) {

			requestHandler.fileGeter(fileInfo.respond, function(data) {
				var headers, dataBuffers;

				headers = requestHandler.getHttpHeader({
					ext: fileInfo.ext,
					filename: fileInfo.url
				});

				response.writeHead(200, headers);

				if(config.slowLoad) {
					dataBuffers = new utils.bufferHepler(data);
						var stop = proxy.slow(dataBuffers, function(data) {
						if(data) {
							response.write(data);
						} else {
							response.end();
						}
					});
					stop();
				} else {
					// utils.log('respond for ' + request.url);
					response.write(data);
					response.end();
				} 
			});
		} else {
			// 发起http请求并返回给本机
			requestHandler.reply(request, response);
		}
	});

	server.on('error', function(err) {
		if(err.code == 'EADDRINUSE') {
			console.log('');
			console.log(('    port ' + port + ' in use').red); 
		} else {
			throw err;
		}
	});
	server.listen(port);
}

module.exports = start;
