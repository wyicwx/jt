var Pipe = require('./pipeline.js'),
	commander = module.exports = new Pipe();

var prev,
	option = {},
	optionParse = {},
	command = {},
	commandParse = {},
	cmdMap = {};

commander.define = function(opt) {
	var cmd = opt.cmd,
		description = opt.description,
		handler = opt.handler;

	// define option 
	if(~cmd.indexOf('-')) {
		option[cmd] = {
			description: description,
			handler: handler
		};
	} else { // define command
		command[cmd] = {
			description: description,
			handler: handler
		};
	}
};

commander.trigger = function(name, cmd) {
	var argv = jt.utils.clone(jt.argv);

	name = cmdMap[name];
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
	// command
	commander.define({
		cmd: 'init', 
		description: 'init jt config file', 
		handler: function(opt, argv) {
			var fs = require('fs'),
				path = require('path');

			jt.utils.mkdir('.jt/extensions', './');

			function cpFile() {
				['config.js', 'builder.js', 'proxy.js'].forEach(function(file) {
					var defaultConfig = fs.createReadStream(path.join(jt.root, 'configs/'+file));
					var targetConfig = fs.createWriteStream('./.jt/'+file);
					defaultConfig.pipe(targetConfig, {
						flags: 'w',
						encoding: 'utf-8',
						mode: '755'
					});
				});
			}
			if(!fs.existsSync('./.jt/config.js')) {
				cpFile();
			} else {
				jt.utils.read('  config was existed.\n  Are you want override config.js by default? yes(Y) or no(N)', function(reply) {
					if(reply == 'Y') {
						cpFile();
						console.log('  override.');
					}
				});
			}
		}
	});

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
			console.log('  [jt buider]'.green);
			console.log('  base path:');
			console.log('    '+jt.config.builder.base);
			console.log('  ignore path:');
			jt.utils.each(jt.config.builder.ignorePath, function(path) {
				console.log('    '+path);
			});
			console.log('  [jt proxy]'.green);
			console.log('  port:');
			var proxyConfig = jt.getConfig('proxy');
			jt.utils.each(jt.config.proxy.port, function(name, port) {
				console.log('    '+jt.utils.fill(port, 7, ' ', true)+': '+ proxyConfig[name].description);
			});
			console.log('  [jt compressor]'.green);
			console.log('    gzip   : '+!!jt.config.compressor.gzip);
			console.log('  [jt extension]'.green);
			jt.utils.each(jt.extensions, function(pkg, name) {
				console.log('    name   : '+pkg.name);
				if(pkg.description) {
					console.log('    description: '+pkg.description);
				}
				console.log('    version: '+pkg.version);
				console.log('    path   : '+pkg.path);
				console.log('');
			});
			console.log('');
		}
	});

	commander.define({
		cmd: 'list [project]',
		description: 'show project',
		handler: function(project) {
			if(jt.utils.size(project)) {

				jt.utils.each(project, function(project, key) {
					if(project in jt.getConfig('builder')) {
						console.log('');
						console.log('  ' + project + ':');
						jt.utils.each(jt.getConfig('builder')[project].files, function(value, key) {
							console.log('        ' + key.yellow);
						});
					} else {
						console.log('');
						console.log('  not found '+project);
					}
				});
				console.log('');
			} else {
				console.log('');
				console.log('  Projects:');
				console.log('');
				jt.utils.each(jt.getConfig('builder'), function(value, key) {
					console.log('    ' + jt.utils.fill(key, 40, ' ', true).yellow + (value.description||''));
				});
				console.log('');
			}
		}
	});

	commander.define({
		cmd: 'clear',
		description: 'clean output and tmp file',
		handler: function() {
			jt.compressor.clear(function() {
				console.log('tmp folder clean done!');
			});
		}
	});

	commander.define({
		cmd: 'check [port],[url]',
		description: 'rule test',
		handler: function(argv) {
			var port = argv[0],
				url = argv[1];

			if(!port) {
				console.log('');
				console.log("    error: command `%s' argument missing", 'check');
				console.log('');
			} else if(port in jt.config.proxy.port) {
				var rule = jt.proxy.formatRule(port);

				if(!url) { // shoe rule list
					console.log('  list:');
					if(jt.utils.size(rule.lists)) {
						jt.utils.each(rule.lists, function(list) {
							console.log('    '+list.originalMatch);
							console.log('    '+list.match);
							console.log('');
						});
					} else {
						console.log('    not list was defined.');
					}

					console.log('  host:');
					if(jt.utils.size(rule.hosts)) {
						jt.utils.each(rule.hosts, function(ip, host, list) {
							var con = '    '+jt.utils.fill(host, 30, ' ', true)+ip;
							console.log(con);
						});
					} else {
						console.log('    not host was defined.');
					}
				} else { // check url
					console.log('');
					if(jt.utils.size(rule.lists)) {
						jt.utils.each(rule.lists, function(list) {
							if(list.match.test(url)) {
								console.log('    '+list.originalMatch);
								console.log('    hit'.green);
							} else {
								console.log(('    '+list.originalMatch).grey);
								console.log('    pass'.grey);
							}
						});
						console.log('');
					} else {
						console.log('    not list was defined.');
					}
				}
			} else {
				console.log('  not found proxy config of '+port);
			}
		}
	});

	// option
	commander.define({
		cmd: '-b, --build [project1],[project2],...',
		description: 'build project',
		handler: function(projects) {
			if(projects.length) {
				jt.builder.build(projects);
			} else {
				console.log('');
				console.log("    error: option `%s' argument missing", '-b, --build');
				console.log('');
			}
		}
	});

	commander.define({
		cmd: '-p, --proxy [log]',
		description: 'start proxy server',
		handler: function() {
			jt.proxy.start();
		}
	});

	commander.define({
		cmd: '-c, --compress [file1],[file2],...',
		description: 'js/css file minify compress',
		handler: function() {
			if(jt.utils.size(jt.argv.compress)) {
				jt.builder.finder(jt.argv.compress, {
					project: false,
					pathFile: true
				},function(filePaths) {
					if(filePaths.pathFile.length) {
						console.log('');
						console.log('  查找到以下文件:');
						filePaths.pathFile.forEach(function(value, key) {
								console.log(('    ['+key+'] ').red+ value.green);
						});
						jt.utils.read('  输入需要压缩的文件，使用","分割', function(data) {
							if(!data) {
								console.log('');
								console.log('  压缩中断!');
								return;
							}
							var index = data.split(','),
								files;

							files = jt.utils.pick(filePaths.pathFile, index);
							files = jt.utils.values(files);
							
							if(!files.length) return;
							jt.pipe.trigger('jt.compress.before', files,function() {
								jt.compressor.compress(files, function(data) {
									var saveInfo = {};
									jt.utils.each(files, function(path, key) {
										// 重命名
										var aliasnName = path.replace(/(\w+?)$/, 'min.$1');

										if(data[key] && data[key].code) {
											saveInfo[aliasnName] = data[key].code;
										} else {
											saveInfo[aliasnName] = null;
										}
									});
									// 保存下来
									jt.builder.save(saveInfo, {
										endCallback: function() {
										}
									});
								});
							});
						});
					} else {
						console.log('sorry,没有找到任何文件!');
					}
				});
			} else {
				console.log('');
				console.log("    error: option `%s' argument missing", '-c, --compress');
				console.log('');
			}
		}
	});

	commander.define({
		cmd: '-v, --version',
		description: 'show version',
		handler: function() {
			console.log('');
			console.log('  version: '+jt.v);
			console.log('');
		}
	});

	commander.define({
		cmd: '-h, --help',
		description: 'help',
		handler: function() {
			str = [];

			str.push('');
			str.push('  Usage: jt [options] <arguments>');
			str.push('');
			str.push('  Command:');
			str.push('');
			jt.utils.each(command, function(item, key) {
				str.push('    ' + jt.utils.fill(key, 40, ' ', true) + item.description);
			});
			str.push('');
			str.push('  Option:');
			str.push('');
			jt.utils.each(option, function(item, key) {
				str.push('    ' + jt.utils.fill(key, 40, ' ', true) + item.description);
			});
			str.push('');
			str = str.join('\n');
			console.log(str);
		}
	});

	// option['-u, --upload [file1],[file2],...'] = 'compress andy upload file';
})();