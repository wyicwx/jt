var Pipe = require('./pipeline.js'),
	commander = module.exports = new Pipe();

var prev,
	option = {},
	optionParse = {},
	command = {},
	commandParse = {},
	cmdMap = {};

commander.define = function(opt) {
	var cmd = opt.cmd;
		description = opt.description,
		handler = opt.handler,
		notShow = opt.notShow;

	// define option 
	if(~cmd.indexOf('-')) {
		option[cmd] = {
			description: description,
			handler: handler,
			notShow: notShow
		};
	} else { // define command
		command[cmd] = {
			description: description,
			handler: handler,
			notShow: notShow
		};
	}
};

commander.trigger = function(name, cmd) {
	var argv = jt.utils.clone(jt.argv);

	name = cmdMap[name];

	cmd = cmd || [];
	if(option[name]) {
		option[name].handler(cmd, argv);
	} else {
		command[name].handler(cmd, argv);
	}
};

commander.parse = function(argv) {
	argv = argv || process.argv;
	/**
	 * resolv argv
	 * @example
	 * 	 argv from 
	 * 	 	-b a.js b.js c.js -s -t
	 * 	 to
	 * 	 	{
	 * 	 		'-b': ['a.js', 'b.js', 'c.js'],
	 * 	 		'-s': [],
	 * 	 		'-t': []
	 * 	 	}
	 * 	  	  
	 */
	// command
	jt.utils.each(command, function(value, key) {
		var cmd = key.split(/\s/);

		commandParse[cmd[0]] = cmd[0];
		cmdMap[cmd[0]] = key;
	});

	// option
	jt.utils.each(option, function(value, key) {
		opt = key.match(/--?\w*/g);

		optionParse[opt[0]] = opt[1];
		optionParse[opt[1]] = opt[1];

		opt[1] = opt[1].replace(/^--?/, '');
		cmdMap[opt[1]] = key;
	});

	//remove previous two argv: "node" and "main.js"
	argv = argv.slice(2);

	// command high level
	if(argv[0] in commandParse) {
		jt.argv[argv.shift()] = argv;
	} else {	
		argv.forEach(function(value, key) {
			if(~value.indexOf('-')) {
				var key = optionParse[value] || value;

				key = key.replace(/-*/, '');
				jt.argv[key] || (jt.argv[key] = []);
				prev = key;
			} else if(prev) {
				jt.argv[prev].push(value);
			} else { // default
				// nothing
			}
		});
	}
};

/**
 * controller
 */
commander.run = function() {

	for(var i in jt.argv) {
		if(i in cmdMap) {
			commander.trigger(i, jt.argv[i]);
			return;
		}
	}

	commander.trigger('help');
	return;
};

(function() {
	commander.define({
		cmd: 'info', 
		description: 'show jt config infomation',
		handler: function(opt, argv) {
			console.log('');
			console.log('  [jt]'.green);
			console.log('  version:');
			console.log('    '+jt.v);
			console.log('  config path:');
			console.log('    '+jt.cwd);
			console.log('  [jt fs]'.green);
			console.log('  base path:');
			console.log('    '+jt.config.base);
			console.log('  search ignore path:');

			jt.utils.each(jt.config.fs.ignorePath, function(path) {
				console.log('    '+path);
			});

			console.log('  [jt server]'.green);
			console.log('  port:');

			jt.utils.each(jt.config.server, function(server) {
				console.log('    '+jt.utils.fill(server.port, 7, ' ', true)+': '+ server.description);
			});
			console.log('  [jt compressor]'.green);
			console.log('    gzip   : '+!!jt.config.compressor.gzip);
			console.log('  [jt extension]'.green);
			jt.utils.each(jt.extensions, function(pkg, name) {
				if(!!pkg.path.indexOf(jt.root)) {
					console.log('    name   : '+pkg.name);
					if(pkg.description) {
						console.log('    description: '+pkg.description);
					}
					console.log('    version: '+pkg.version);
					console.log('    path   : '+pkg.path);
					console.log('');
				}
			});
			console.log('');
		}
	});

	commander.define({
		cmd: '-v, --version',
		description: 'show version',
		notShow: true,
		handler: function() {
			console.log('');
			console.log('  version: '+jt.v);
			console.log('');
		}
	});

	commander.define({
		cmd: '-h, --help',
		description: 'help',
		notShow: true,
		handler: function() {
			str = [];

			str.push('');
			str.push('  Usage: jt [options] <arguments>');
			str.push('');
			str.push('  Command:');
			str.push('');
			jt.utils.each(command, function(item, key) {
				if(!item.notShow) {
					str.push('    ' + jt.utils.fill(key, 40, ' ', true) + item.description);
				}
			});
			str.push('');
			str.push('  Option:');
			str.push('');
			jt.utils.each(option, function(item, key) {
				if(!item.notShow) {
					str.push('    ' + jt.utils.fill(key, 40, ' ', true) + item.description);
				}
			});
			str.push('');
			str = str.join('\n');
			console.log(str);
		}
	});

	// option['-u, --upload [file1],[file2],...'] = 'compress andy upload file';
})();