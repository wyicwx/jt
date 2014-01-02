var cluster = require('cluster'),
	fs = require('fs'),
	config = jt.config.proxy,
	list = jt.getConfig('proxy');

if(cluster.isMaster) {
	// 指定子进程参数
	cluster.setupMaster({
		args:[
			'--proxy'
		]
	});

	console.log('');
	console.log('  server starting...');
	console.log('');
	console.log('  usage:');
	console.log('    set you brower proxy through:	http://localhost:[port]');
	console.log('');
	if(jt.argv.proxy.length) {
		console.log('  enabled proxy log');
		console.log('');
	}

	for(var i in config.port) {
		worker({port: i, first: true, log: jt.argv.proxy.length});
	}

	function worker(cfg) {
		var workerProcess = cluster.fork();
		workerProcess.send(cfg);
		workerProcess.on('exit', function() {
			setTimeout(function() {
				worker({port: cfg.port, log: jt.argv.proxy.length});
			}, 500);
		});
	};
} else {

	process.on('message', function(cfg) {
		if(!cfg.first) {
			console.log(('proxy server [' + config.port[cfg.port] + '] was restart.').green);
		} else {
			console.log('    port[' + cfg.port + ']: ' + list[config.port[cfg.port]].description||'');
		}
		require('./server.js')(cfg.port, cfg.log);
		// 监视文件改动
		fs.watchFile(jt.root + 'configs/', function() {
			cluster.worker.kill();
		});
	});
}

