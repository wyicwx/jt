var http = require('http');
var url = require('url');
var path = require('path');
var mime = require('mime');
var delay = require('akostream').delay;
var trickle = require('akostream').trickle;

http.globalAgent.maxSockets = 240;

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
				} else if(o.value) {
					o.value = o.value.replace(/\$\d/g, function(value) {
						return REGEXP[value];
					});
				} else if(o.file) {
					o.file = o.file.replace(/\$\d/g, function(value) {
						return REGEXP[value];
					});
				}
				return o;
			});
			return provision;
		}
	}
	return false;
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

function forwardRequest(request, response, opt) {
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

		//容错，host带有port，dns.lookup host时会报错 
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

		request.on('error', function() {
			outRequest.destroy();
		});
		request.pipe(outRequest);
}

function headerHandler(provision, response, request) {
	var statusCode = provision.statusCode || 200;
	// 无cache的http头
	var headers = {
		'Cache-Control': 'max-age=0',
		'Content-Type': mime.lookup(path.extname(request.url)),
		'Transfer-Encoding': 'chunked',
		'Server': 'JT proxy server'
	};
	jt.utils.extend(headers, provision.headers || {});
	response.writeHead(statusCode, headers);
	if(statusCode == 404 || statusCode == 500 || statusCode == 302 || statusCode == 301) {
		response.end();
	}
}

function startServer() {
	var server = jt.config.server;
	http.createServer(function(request, response) {
		//只处理get和post请求
		if(request.method == 'GET' || request.method == 'POST') {
			//请求是否在可以命中匹配规则
			var provision = getProvision(request.url, server.list);

			if(provision) {
				// 匹配规则
				headerHandler(provision, response, request);
				if(response.ended) return;
				// 读取文件
				var fstream = jt.fs.createReadCombineStream(provision.respond);
				// 慢速模拟
				var slowSpeedSimulate = server.slowSpeedSimulate;
				if(slowSpeedSimulate && slowSpeedSimulate.enable) {
					// 桥接慢速流管道
					fstream.pipe(trickle(slowSpeedSimulate.highWaterMark)).pipe(delay(slowSpeedSimulate.interval)).pipe(response);
				} else {
					fstream.pipe(response);
				}
				return;
			}
		}
		if(request.headers.host.search(/127.0.0.1|localhost/) == -1) {
			// 转发请求
			forwardRequest(request, response, server);
		} else {
			response.destroy();
		}
	}).on('error', function(err) {
		if(err.code == 'EADDRINUSE') {
			console.log('  [error]'.red+' port ' + server.port + ' in use'); 
		} else {
			throw err;
		}
	}).listen(server.port);
}


jt.commander.command({
	cmd: 'server',
	description: 'start proxy server',
	handler: function(argv) {
		if(argv['-'] == 'start') {
			console.log('');
			console.log('    Server starting...');
			console.log('');
			console.log('    Usage:');
			console.log('        set your brower proxy through:	http://localhost:'+jt.config.server.port);
			console.log('');

			startServer();
		} else if(argv.url && argv.url[0]) {
			var url = argv.url[0];

			mathcs = jt.server.getMatchRule();

		
			console.log('');
			console.log('    port: '+jt.config.server.port);
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
			console.log('');
		}
	}
});
