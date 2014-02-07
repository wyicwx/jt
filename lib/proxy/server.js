var utils = require('./libs/utils.js'),
	http = require('http'),
	hosts, dealList;

function start(port, log) {
	var requestHandler = require('./libs/proxy.js'),
		formatRule = jt.proxy.formatRule(port);

	requestHandler.init(formatRule.lists, formatRule.hosts);

	http.createServer(function(request, response) {
		// hold 所有请求
		if(request.headers.host.search(/127.0.0.1|localhost/) == -1) {
			//请求是否在可以命中匹配规则
			var fileInfo = requestHandler.getReplaceFileInfo(request);

			if(fileInfo) {

				requestHandler.fileGeter(fileInfo.respond, function(data) {
					var headers, dataBuffers;

					headers = requestHandler.getHttpHeader({
						ext: fileInfo.ext,
						filename: fileInfo.url
					});

					response.writeHead(200, headers);

					// if(config.slowLoad) {
					// 	dataBuffers = new utils.bufferHepler(data);
					// 		var stop = proxy.slow(dataBuffers, function(data) {
					// 		if(data) {
					// 			response.write(data);
					// 		} else {
					// 			response.end();
					// 		}
					// 	});
					// 	stop();
					// } else {
						// utils.log('respond for ' + request.url);
						response.write(data);
						response.end();

					// } 
				});
			} else {
				// 发起http请求并返回给本机
				requestHandler.reply(request, response);
			}
		}
	}).on('error', function(err) {
		if(err.code == 'EADDRINUSE') {
			console.log('');
			console.log(('    port ' + port + ' in use').red); 
		} else {
			throw err;
		}
	}).listen(port);
}

module.exports = start;
