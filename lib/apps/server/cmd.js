var http = require('http');
var url = require('url');
var path = require('path');
var mime = require('mime');
var delay = require('akostream').delay;
var trickle = require('akostream').trickle;

http.globalAgent.maxSockets = 240;

function _getProvision(u, list) {
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
				} else if(o.value) {
					o.value = o.value.replace(/\$\d/g, function(value) {
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

		//容错，host带有port，dns.lookup host时h会报错 
		if(!options.hostname) {
			options.hostname = options.host.split(':')[0];
		}
		var conenction = options.headers['Proxy-Connection'] || options.headers['Connection'];

		if(!proxy || !proxy.host) {		
			if(options.headers['Proxy-Connection']) {
				options.headers['Connection'] = conenction;
				delete options.headers['Proxy-Connection'];
			}
		}
		if(conenction && conenction.indexOf('keep-alive') === -1) {
			options.agent = false;
		}
		
		if(hosts[options.hostname]) { // host支持
			options.hostname = hosts[options.hostname];
		} else if(proxy && proxy.host) { // 对另一个代理服务器的支持
			options.hostname = proxy.host;
			options.port = proxy.port || options.port;
			// path
			options.path = request.url;
		}

		var outRequest = http.request(options)
			.on('response', function(res) {
				response.writeHead(res.statusCode, res.headers);

				if(slowSpeedSimulate.enable) {
					res.pipe(trickle(slowSpeedSimulate.highWaterMark)).pipe(delay(slowSpeedSimulate.interval)).pipe(response);
				} else {
					res.pipe(response);
				}
			})
			.on('error', function (e) {
				console.log('  http error:'.red, e.syscall||'', e.code);
				response.destroy();
			})
			.on('close', function() {
				response.destroy();
			});

		request.pipe(outRequest);
		request.on('error', function() {
			outRequest.destroy();
		});
}

function _startServer(option) {
	http.createServer(function(request, response) {
		// hold 所有请求
		if(request.headers.host.search(/127.0.0.1|localhost/) == -1) {
			//请求是否在可以命中匹配规则
			var provision = _getProvision(request.url, option.list);

			if(provision) {
				if(provision.headers && provision.headers.status == 404) {
					response.writeHead(404);
					response.end();
					return;
				}
				// 返回无cache的http头
				response.writeHead(200, _getNotCacheHttpHeader(request.url, provision.ext));
				// 读取文件
				var fstream = jt.fs.createReadCombineStream(provision.respond);
				// 慢速模拟
				var slowSpeedSimulate = option.slowSpeedSimulate;
				if(slowSpeedSimulate && slowSpeedSimulate.enable) {
					// 桥接慢速流管道
					fstream.pipe(trickle(slowSpeedSimulate.highWaterMark)).pipe(delay(slowSpeedSimulate.interval)).pipe(response);
				} else {
					fstream.pipe(response);
				}
			} else {
				_reRequest(request, response, option);
			}
		} else {
			response.destroy();
		}
	}).on('error', function(err) {
		if(err.code == 'EADDRINUSE') {
			console.log('  [error]'.red+' port ' + option.port + ' in use'); 
		} else {
			throw err;
		}
	}).listen(option.port);
}

// support for commander
(function() {
	jt.commander.command({
		cmd: 'server',
		description: 'start proxy server',
		handler: function(argv) {
			if(argv['-'] == 'start') {
				console.log('');
				console.log('    Server starting...');
				console.log('');
				console.log('    Usage:');
				console.log('        set your brower proxy through:	http://localhost:[port]');
				console.log('');

				var ports = [];
				OPTIONS.forEach(function(option) {
					ports.push(option.port);
					_startServer(option);
				});
				console.log('    port: '+ports.join(','));
			} else if(argv.url && argv.url[0]) {
				var url = argv.url[0];
				var port = (argv.port && argv.port.length) ? argv.port[0] : OPTIONS[0].port;

				mathcs = server.getMatchRule(port);

				if(!mathcs) {
					console.log('');
					console.log('    Not found port '+port+' in config');
					console.log('');
					return;
				}
				console.log('');
				console.log('    port: '+port);
				console.log('    url: '+url);
				console.log('    result:');
				mathcs.forEach(function(regexp) {
					if(regexp.exec(url)) {
						console.log('    '+regexp.toString().green);
					} else {
						console.log('    '+regexp.toString().red);
					}
				});
				console.log('');
			} else {
				console.log('');
				console.log("    Usage: ");
				console.log("        jt server [option]");
				console.log('');
				console.log("    Example: ");
				console.log("        jt server start");
				console.log("        jt server --url=http://wyicwx.github.io/jt");
				console.log("        jt server --url=http://wyicwx.github.io/jt --port=8080");
				console.log('');
			}
		}
	});
})();