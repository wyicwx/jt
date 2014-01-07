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
	// http keep-live sockte 链接数
	// http.globalAgent.maxSockets = 100;

	function _firstWordUp(word) {
		return word.replace(/(\b.)/g, function(d) {
			if(d != '-' ) {
				return d.toUpperCase();
			} else {
				return '-';
			}
		});
	}

	// 格式化http头
	function _formatHeaders(headers) {
		var Headers = {};
		for(var i in headers) {
			Headers[_firstWordUp(i)] = headers[i];
		}
		return Headers;
	}

	exports.reply = function(request, response) {
		var urlParse = url.parse(request.url), req, options;

		options = urlParse;
		
		// setTimeout(function() {
		// 	console.log(options.agent.sockets);
		// }, 500);
		// path
		options.path = urlParse.path;
		// headers
		options.headers = _formatHeaders(request.headers);
		// http method
		options.method = request.method;
		// port
		options.port = urlParse.port || 80;

		// agent
		options.agent = new http.Agent({
			host: options.host,
			port: options.port,
			maxSockets: 100
		});

		/**
		 * host功能支持
		 */
		if(hosts[urlParse.host]) {
			// host支持
			options.host = hosts[urlParse.host];
			delete options.hostname;
		}


		req = http.request(options, function(res) {
			
			var statusCode = res.statusCode;

			if (request.httpVersion === '1.0') {
				if (request.headers.connection) {
					res.headers.connection = request.headers.connection
				} else {
					res.headers.connection = 'close'
				}
			} else if (!res.headers.connection) {
				if (request.headers.connection) {
					res.headers.connection = request.headers.connection
				} else {
					res.headers.connection = 'keep-alive'
				}
			}

			// Remove `Transfer-Encoding` header if client's protocol is HTTP/1.0
			// or if this is a DELETE request with no content-length header.
			// See: https://github.com/nodejitsu/node-http-proxy/pull/373
			if (request.httpVersion === '1.0' || (request.method === 'DELETE' && !request.headers['content-length'])) {
				delete res.headers['transfer-encoding'];
			}

			if ((res.statusCode === 301 || res.statusCode === 302) && typeof res.headers.location !== 'undefined') {
				location = url.parse(res.headers.location);
				if (location.host === request.headers.host) {
					if (self.source.https && !self.target.https) {
						res.headers.location = res.headers.location.replace(/^http\:/, 'https:');
					}
					if (self.target.https && !self.source.https) {
						res.headers.location = res.headers.location.replace(/^https\:/, 'http:');
					}
				}
			}

			response.writeHead(statusCode, res.headers);

			res.pipe(response);
			//304 : No `data` & `end` event
			// if(statusCode == 304) {
			// 	count--;
			// 	req.abort();
			// 	response.end();
			// 	return;
			// }

			// var stop = exports.slow(dataBuffers, function(data) {
			// 	if(data) {
			// 		response.write(data);
			// 	} else {
			// 		response.end();
			// 	}
			// });

			// res.on('data', function(chunk) {
			// 	if(config.slowLoad) {
			// 		dataBuffers.concat(chunk);
			// 	} else {
			// 		response.write(chunk);
			// 	}
			// 	return;
			// });

			// res.on('end', function() {
			// 	count--;
			// 	if(config.slowLoad) {
			// 		stop();
			// 	} else {
			// 		response.end();
			// 	}
			// 	return;
			// });
		});

		request.pipe(req);
		// //处理post的数据
		// request.on('data', function(chunk) {
		// 	req.write(chunk);
		// });

		// request.on('end', function() {
		// 	req.end();
		// 	// 设置超时
		// 	req.socket.setTimeout(60000, function() {
		// 		console.log('timeout');
		// 		// count--;
		// 		req.abort();
		// 	});
		// });

		//请求失败输出log
		req.on('error', function (e) {
			console.log('error');
			console.log(e);
			// count--;
			req.abort();
			if(e.code == 'ENOTFOUND') {
			// 404
			// utils.log('404 '.red + request.url);
			} else {
			//send flag of error 
			// utils.log('request error: '.red + request.url);
			}
			// response.write(JSON.stringify(options));
			response.end();
			return;
		});
	};
})();

exports.init = function(l, h) {
	list = l;
	hosts = h;
};
