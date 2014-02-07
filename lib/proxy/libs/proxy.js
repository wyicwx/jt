var config  = jt.config.proxy,
    url     = require('url'),
    http    = require('http'),
    path = require('path'),
    hosts, 
    list,
    // 用于保存正则匹配结果对象,结果替换用!
    regexp;

/**
 * 根据参数获取http头
 */
(function() {
	var mime = require('mime');
    // 返回无缓存头部文件
    function _getHttpHeader(opt) {
        var ext, headers;

            ext = path.extname(opt.filename);
            headers = {
                'Cache-Control' : 'max-age=0',
                'If-Modified-Since' : 'Thu, 16 Aug 1970 00:00:00 GMT',
                'Content-Type' : opt.ext || mime.lookup(ext)
            };

        return headers;
    }
    exports.getHttpHeader = _getHttpHeader;
})();

// 获取匹配数据
exports.getReplaceFileInfo = function(request) {
	var parse = url.parse(request.url),
		l;

	for (var i in list) {
		if (list[i].disable) continue;
		if (list[i].match.test(parse.href)) {
			l = jt.utils.clone(list[i]);
			l.url = request.url;
			regexp = jt.utils.clone(RegExp);
			return l;
		}
	}
	return false;
};

/**
 * 适用于proxy的fileGeter
 * @param  {String|Array|Object}   filesInfo 文件类型
 * @param  {Function} callback  回调函数，第一个参数为处理后文件buffer
 */
exports.fileGeter = function(filesInfo, callback) {
	var app = jt.utils.do();

	if(!jt.utils.isArray(filesInfo)) {
		filesInfo = [filesInfo];
	}

	filesInfo.forEach(function(value) {

		if(jt.utils.isString(value)) {
			var path = value;
			// 正则匹配 $ 替换
			path = path.replace(/\$\d/g, function(value) {
				return regexp[value];
			});

			app.do(function(done) {
				// search from project
				jt.builder.finder(path, {project: true, pathFile: false}, function(result) {
					var file = result.compile;

					if(!file || !file.length) {
						file = path;
					}

					jt.builder.fileGeter(file, function(data) {
						done(data);
					});

				});
			});
        } else if(jt.utils.isObject(value)) {
			var processor = value;

			app.do(function(done) {
				jt.builder.fileGeter(processor, function(data) {
					done(data);
				});
			});
		}
	});

	app.done(function() {
		var args = Array.prototype.slice.call(arguments),
			data;

		data = new jt.utils.BufferHelper(args);

		callback(data.toBuffer());
	});
};

exports.slow = function(buffer, callback) {
	var interval, 
		isStop = false;

	interval = setInterval(function() {
		var data = buffer.slice(config.slowBlockByte);
		if(data.length) {
			callback(data);
		} else {
			if(isStop) {
				callback(null);
				clearInterval(interval);
			}
		}
	}, config.slowTimeInterval);

	return function() {
		isStop = true;
	};
};
/**
 * 转发http请求,代理核心功能
 * 暴露reply函数
 */
(function() {
	// 针对对应的host和port维护专门的链接池
	// function getAgent(host, port) {
	// 	var key = host+":"+port,
	// 		agent;
	// 	getAgent.agents || (getAgent.agents={});
	// 	agent = getAgent.agents[key];
	// 	if(!agent) {
	// 		agent = new http.Agent({
	// 			maxSockets: 5
	// 		});
	// 		getAgent.agents[key] = agent;
	// 	}
	// 	return agent;
	// }

	http.globalAgent.maxSockets = 240;

	exports.reply = function(request, response) {
		var urlParse = url.parse(request.url), req, options;

		options = jt.utils.clone(urlParse);

		// port
		options.port = urlParse.port || 80;
		// http method 
		options.method = request.method;
		// headers
		options.headers = jt.utils.formatHttpHeader(request.headers);

		if(hosts[urlParse.host]) {
			// host支持
			options.host = hosts[urlParse.host];
			delete options.hostname;
		} else {
			// 对另一个代理服务器的支持
			if(jt.config.proxy.agent && jt.config.proxy.agent.host) {
				// path 指定完整url
				options.path = request.url;
				options.hostname = jt.config.proxy.agent.host;
				options.port = jt.config.proxy.agent.port || 80;
			} else {
				// 我会告诉你我是最后一个节点么？作为代理服务器我这么牛逼我家里人是不知道的.
				if(options.headers['Proxy-Connection']) {
					options.headers.Connection = options.headers['Proxy-Connection'];
					delete options.headers['Proxy-Connection'];
				}
			}
		}

		req = http.request(options, function(res) {
			var statusCode = res.statusCode;

			// 1.0的http协议，用自定义的connection来持续化链接
			if (request.httpVersion === '1.0') {
				if (request.headers.connection) {
					res.headers.connection = request.headers.connection;
				} else {
					res.headers.connection = 'close';
				}
			// 1.1的http协议，没有定义connection的话，默认是keep-live
			} else if (!res.headers.connection) {
				if (request.headers.connection) {
					res.headers.connection = request.headers.connection;
				} else {
					res.headers.connection = 'keep-live';
				}
			}

			// Remove `Transfer-Encoding` header if client's protocol is HTTP/1.0
			// or if this is a DELETE request with no content-length header.
			// See: https://github.com/nodejitsu/node-http-proxy/pull/373
			if (request.httpVersion === '1.0' || (request.method === 'DELETE' && !request.headers['content-length'])) {
				delete res.headers['transfer-encoding'];
			}

			response.writeHead(statusCode, res.headers);

			// 304 : No `data` & `end` event
			if(statusCode == 304) {
				req.abort();
				response.end();
				return;
			}

			// res.pipe(response);
			// console.log(res);
			if(config.slowLoad) {
				// res.connection.bufferSize = config.slowBlockByte;
				// res.connection.bytesRead = res.connection.bytesWritten = config.slowBlockByte;
				// console.log(res.socket);
			}
			res.on('socket', function(sk) {
				console.log(sk);
			});

			res.on('data', function(chunk) {
				response.write(chunk);
				console.log(chunk.length);
				// 慢速模拟，通过控制stream对event'data'的触发间隔实现
				if(config.slowLoad) {
					res.pause();
					setTimeout(function() {
						res.resume();
					}, config.slowTimeInterval);
				}
			});

			res.on('end', function() {
				response.end();
			});
		});

		req.on('socket', function(socket) {
			// socket.bytesRead = socket.bytesWritten = config.slowBlockByte;
		});

		req.on('close', function(e) {
		});

		req.on('error', function (e) {
			// console.log('  error:'+e.code);
			// response.write('error:\n');
			// response.write(JSON.stringify(e));
			response.end();
		});

		request.pipe(req);
	};

})();

exports.init = function(l, h) {
	list = l;
	hosts = h;
};
