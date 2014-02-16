var cluster = require('cluster'),
	http = require('http'),
	path = require('path'),
	mime = require('mime'),
	url = require('url'),
	pwd = jt.extensions.server.path,
	TrickleStream = require('./TrickleStream.js');

http.globalAgent.maxSockets = 240;
// cluster.setupMaster({
// 	exec: path.join(pwd, 'request.js')
// });

// var workerManager = {
// 	worker: null,
// 	status: null,
// 	workQueue: [],
// 	retryCount: 0,
// 	sendToSetup: null,
// 	addWork: function(work) {
// 		this.workQueue.push(work);
// 		if(this.status == 'online') {
// 			this._addWork();
// 		}
// 	},
// 	_addWork: function() {
// 		var Self = this;
// 		this.workQueue.forEach(function(work) {
// 			Self.worker.send(work.msg, work.socket);
// 		});
// 		this.workQueue.length = 0;
// 	},
// 	createWorker: function() {
// 		var worker,	
// 			Self = this;

// 		if(Self.retryCount > 10) {
// 			console.log('retryTimes');
// 			return;
// 		}

// 		worker = this.worker = cluster.fork();
// 		worker.on('exit', function() {
// 			Self.status = 'exit';
// 			setTimeout(function() {
// 				Self.createWorker();
// 			}, 500);
// 		});
// 		worker.on('online', function() {
// 			if(Self.sendToSetup) {
// 				worker.send({'setup': JSON.stringify(Self.sendToSetup)});
// 			}
// 			Self.status = 'online';
// 			Self._addWork();
// 		});
// 	},
// 	setSetup: function(setup) {
// 		this.sendToSetup = setup;
// 		if(this.worker) {
// 			worker.send({'setup': JSON.stringify(setup)});
// 		}
// 	}
// };

function getProvision(u, list) {
	var parse = url.parse(u),
		provision,
		REGEXP;

	for (var i in list) {
		if (list[i].match.test(parse.href)) {
			provision = jt.utils.clone(list[i]);
			REGEXP = jt.utils.clone(RegExp);
			provision.respond = provision.respond.map(function(o) {
				if(jt.utils.isString(o)) {

					o = o.replace(/\$\d/g, function(value) {
						return REGEXP[value];
					});
				}
				return o;
			})
			return provision;
		}
	}
	return false;
}

function _getNotCacheHttpHeader(filename, ext) {
	ext = ext || path.extname(filename);
	var headers = {
		'Cache-Control': 'max-age=0',
		'If-Modified-Since': 'Thu, 16 Aug 1970 00:00:00 GMT',
		'Content-Type': mime.lookup(ext)
	};
	return headers;
}

function _prevSetup(options) {
	var ret = {};

	options.forEach(function(op) {
		ret[op.port] = {};
		ret[op.port].slowSpeedSimulate = op.slowSpeedSimulate;
		ret[op.port].proxy = op.proxy;
	});

	return ret;
}

function _firstWordUp(word) {
	return word.replace(/(\b.)/g, function(d) {
		if(d != '-' ) {
			return d.toUpperCase();
		} else {
			return '-';
		}
	});
}

function _formatHeaders(headers) {
	var Headers = {};
	for(var i in headers) {
		Headers[_firstWordUp(i)] = headers[i];
	}
	return Headers;
}

function _reRequest(request, response, opt) {
	var options,
		hosts = opt.hosts,
		proxy = opt.proxy,
		slowSpeedSimulate = opt.slowSpeedSimulate;

		options = url.parse(request.url);
		// port
		options.port = options.port || 80;
		// http method 
		options.method = request.method;
		// headers
		options.headers = _formatHeaders(request.headers);

		if(hosts[options.host]) { // host支持
			options.host = hosts[options.host];
			delete options.hostname;
		} else { // 转发请求
			if(proxy && proxy.host) { // 对另一个代理服务器的支持
				// path 指定完整url
				options.path = request.url;
				options.hostname = proxy.host;
				options.port = proxy.port || 80;
			} else {
				if(options.headers['Proxy-Connection']) {
					// options.headers.Connection = options.headers['Proxy-Connection'];
					delete options.headers['Proxy-Connection'];
				}
			}
		}

		request.pipe(
			http.request(options)
			.on('response', function(res) {
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
					// this.abort();
					response.end();
					return;
				}

				if(slowSpeedSimulate.enable) {
					var tStream = new TrickleStream({
						size: slowSpeedSimulate.highWaterMark,
						interval: slowSpeedSimulate.interval
					});
					res.pipe(tStream).pipe(response);
				} else {
					res.pipe(response);
				}
			})
			.on('error', function (e) {
				// console.log('  error:'+e.code);
				response.write('error:\n');
				response.write(JSON.stringify(e));
				// console.log(options);
				response.end();
			})
		);
}

function main(options) {
	if(options.length) {
		// workerManager.setSetup(_prevSetup(options));
		// workerManager.createWorker();

		console.log('');
		console.log('  server starting...');
		console.log('');
		console.log('  usage:');
		console.log('    set your brower proxy through:	http://localhost:[port]');
		console.log('');
		options.forEach(function(option) {
			startServer(option);
		});
	}
}

function startServer(option) {
	http.createServer(function(request, response) {
		// hold 所有请求
		if(request.headers.host.search(/127.0.0.1|localhost/) == -1) {
			//请求是否在可以命中匹配规则
			var provision = getProvision(request.url, option.list);

			if(provision) {
				// 返回无cache的http头
				response.writeHead(200, _getNotCacheHttpHeader(request.url, provision.ext));
				// 读取文件
				var fstream = jt.fs.createReadComboStream(provision.respond);
				// 慢速模拟
				var slowSpeedSimulate = option.slowSpeedSimulate;
				if(slowSpeedSimulate && slowSpeedSimulate.enable) {
					// 桥接慢速流管道
					var trickleStream = new TrickleStream({
						size: slowSpeedSimulate.highWaterMark,
						interval: slowSpeedSimulate.interval
					});
					fstream.pipe(trickleStream).pipe(response);
				} else {
					fstream.pipe(response);
				}
			} else {
				_reRequest(request, response, option);
				// var opt = url.parse(request.url);
				// opt.headers = request.headers;
				// // 转发请求
				// workerManager.addWork({
				// 	request: JSON.stringify(opt)
				// });
			}
		}
	}).on('error', function(err) {
		if(err.code == 'EADDRINUSE') {
			console.log('');
			console.log(('    port ' + port + ' in use').red); 
		} else {
			throw err;
		}
	}).listen(option.port);
}

module.exports = main;

// var cluster = require('cluster'),
// 	fs = require('fs'),
// 	config = jt.config.proxy,
// 	list = jt.getConfig('proxy');

// if(cluster.isMaster) {
// 	// 指定子进程参数
// 	cluster.setupMaster({
// 		args:[
// 			'--proxy'
// 		]
// 	});

// 	console.log('');
// 	console.log('  server starting...');
// 	console.log('');
// 	console.log('  usage:');
// 	console.log('    set you brower proxy through:	http://localhost:[port]');
// 	console.log('');
// 	if(jt.argv.proxy.length) {
// 		console.log('  enabled proxy log');
// 		console.log('');
// 	}

// 	for(var i in config.port) {
// 		worker({port: i, first: true, log: jt.argv.proxy.length});
// 	}

// 	function worker(cfg) {
// 		var workerProcess = cluster.fork();
// 		workerProcess.send(cfg);
// 		workerProcess.on('exit', function() {
// 			setTimeout(function() {
// 				worker({port: cfg.port, log: jt.argv.proxy.length});
// 			}, 500);
// 		});
// 	};
// } else {

// 	process.on('message', function(cfg) {
// 		if(!list[config.port[cfg.port]]) {
// 			console.log('  not found '.red+(config.port[cfg.port]).toString().yellow+' proxy rule in .jt/proxy.js'.red);
// 			return;
// 		}
// 		if(!cfg.first) {
// 			console.log(('proxy server [' + config.port[cfg.port] + '] was restart.').green);
// 		} else {
// 			console.log('    port[' + cfg.port + ']: ' + list[config.port[cfg.port]].description||'');
// 		}
// 		require('./server.js')(cfg.port, cfg.log);
// 		// 监视文件改动
// 		fs.watchFile(jt.cwd, function() {
// 			cluster.worker.kill();
// 		});
// 	});
// }
