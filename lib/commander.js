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
	jt.argv = commander.parseArgv(argv || process.argv);
	Commander.prototype.run.apply(this, jt.utils.toArray(arguments));
};
