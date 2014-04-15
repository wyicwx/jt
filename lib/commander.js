var Commander = require('cmd-interface').Commander,
	CommanderUtil = require('cmd-interface').util,
	commander = module.exports = new Commander({
		name: 'jt'
	});

jt.utils.extend(commander, CommanderUtil);
commander.choose = function(options, callback) {
	if(!Array.isArray(options)) {
		options = [options];
	}

	options.forEach(function(value, key) {
		console.log('    [%s] %s', (key+1).toString().green, value);
	});
	commander.read('    Type the number to choose files! (split by "," and type "all")', function(data) {
		var ret = [];
		if(data == 'all') {
			ret = options;
		} else {
			var choose = jt.utils.object(data.split(','), true);
			ret = options.filter(function(file, key) {
				if((key+1) in choose) {
					return true;
				} else {
					return false;
				}
			});
		}

		callback && callback(ret);
	});
};
// 重写commander.run
commander.run = function(argv) {
	jt.argv = commander.parseArgv(argv);
	Commander.prototype.run.apply(this, jt.utils.toArray(arguments));
};

(function() {
	commander.command({
		cmd: 'info', 
		description: 'show jt config infomation',
		handler: function(opt, argv) {
			console.log('');
			console.log('    [jt]'.green);
			console.log('    version:');
			console.log('        %s', jt.v);
			console.log('    config path:');
			console.log('        %s', jt.configDir);
			console.log('    [jt fs]'.green);
			console.log('    base path:');
			console.log('        %s', jt.config.base);
			console.log('    search ignore path:');

			jt.utils.each(jt.config.fs.ignorePath, function(path) {
				console.log('        %s', path);
			});

			console.log('    [jt server]'.green);
			console.log('    port:');

			jt.utils.each(jt.config.server, function(server) {
				console.log(jt.commander.printfFormat('    %s7: %s', server.port, server.description));
			});
		}
	});

	commander.version(jt.v);
})();