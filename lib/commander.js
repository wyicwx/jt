var commander = module.exports = {};

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
var argv = process.argv,
	prev,
	option = {},
	optionParse = {},
	command = {},
	commandParse = {};

// command
command['init '] = 'init jt config file';
command['list [project]'] = 'show project';
command['clear '] = 'clean output and tmp file';

jt.utils.each(command, function(value, key) {
	key = key.split(/\s/);

	commandParse[key[0]] = key[0];
});

// option
option['-b, --build [project1],[project2],...'] = 'build project';
option['-p, --proxy [log]'] = 'start proxy server';
option['-c, --compress [file1],[file2],...'] = 'js/css file minify compress';
option['-u, --upload [file1],[file2],...'] = 'compress andy upload file';
option['-v, --version'] = 'show version';
option['-h, --help'] = 'help';

jt.utils.each(option, function(value, key) {
	key = key.match(/--?\w*/g);

	optionParse[key[0]] = key[1];
	optionParse[key[1]] = key[1];
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
// 删除引用，防止内存泄漏
optionParse = null;

commander.help = function() {
	str = [];

	str.push('');
	str.push('  Usage: node main.js [options] <arguments>');
	str.push('');
	str.push('  Command:');
	str.push('');
	jt.utils.each(command, function(value, key) {
		str.push('    ' + jt.utils.fill(key, 40, ' ', true) + value);
	});
	str.push('');
	str.push('  option:');
	str.push('');
	jt.utils.each(option, function(value, key) {
		str.push('    ' + jt.utils.fill(key, 40, ' ', true) + value);
	});
	str.push('');
	str = str.join('\n');
	console.log(str);
};

/**
 * controller
 */
commander.parse = function() {
	//command
	if(jt.argv.list) {
		if(jt.utils.size(jt.argv.list)) {
			var list = jt.argv.list;
	
			jt.utils.each(list, function(project, key) {
				if(project in jt.getConfig('builder')) {
					console.log('');
					console.log('  ' + project + ':');
					jt.utils.each(jt.getConfig('builder')[project].files, function(value, key) {
						console.log('        ' + key.yellow);
					});
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
		return;
	} else if(jt.argv.clear) {
		jt.builder.clear(function() {
			console.log('output folder clean done!');
			jt.compressor.clear(function() {
				console.log('tmp folder clean done!');
			});
		})
	}


	// option
	if(jt.argv.build) {
		if(jt.argv.build.length) {
			jt.builder.build(jt.argv.build);
		} else {
			console.log('');
			console.log("    error: option `%s' argument missing", '-b, --build');
			console.log('');
		}
		return;
	}

	if(jt.argv.proxy) {
		jt.proxy.start();
		return;
	}

	if(jt.argv.compress) {
		if(jt.utils.size(jt.argv.compress)) {
			jt.builder.finder(jt.argv.compress, {
				project: false,
				pathFile: true,
				searchOther: [
					jt.root + '/output'
				]
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
									if(data[key] && data[key].code) {
										saveInfo[path] = data[key].code;
									} else {
										saveInfo[path] = null;
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
		return;
	}

	if(jt.argv.version) {
		console.log('');
		console.log('  version: 0.1');
		console.log('');
		return;
	}
	// help
	if(jt.argv.help || !jt.utils.size(jt.argv)) {
		commander.help();
	}
	return;
};

/**
 * create config for current project
 */
commander.createConfig = function() {
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
};
