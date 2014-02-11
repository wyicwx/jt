var util	= require('util'),
	events	= require('events'),
	fs		= require('fs'),
	zlib	= require('zlib'),
	http	= require('http'),
	path	= require('path'),
	netFileCache = {},
	config  = jt.config.builder;

var builder = module.exports = {};

var list = jt.getConfig('builder'),
	projects = {}, comboFiles = {}, comboFilesString = [],
	// 输出目录映射
	outputAlias = {};

// 格式化配置文件内路径
(function() {
	config.base = path.resolve(jt.cwd, jt.config.base);
	config.ignorePath = config.ignorePath ? config.ignorePath.map(function(p) {
		return jt.utils.realPath(p);
	}) : [];
})();

(function() {
	/**
	 * 预处理build规则
	 * item:
	 * {
	 *		project: 'xxx',
	 *		dir: 'xxx/xxx',
	 *		file: {
	 *			'xxx': 'xx',
	 *			'yyy': [
	 *				'xy',
	 *				'yx'
	 *			]
	 *		},
	 *		output: './'
	 * }
	 */
	jt.utils.each(list, function(project, key) {
		project.dir = jt.utils.realPath(project.dir || '');
		projects[key] = [];

		jt.utils.each(project.files, function(toCombo, fileName) {
			if(jt.utils.isString(toCombo)) {
				// 格式化绝对路径
				toCombo = path.join(project.dir, toCombo);
			} else if(jt.utils.isArray(toCombo)) {
				toCombo = toCombo.map(function(file) {
					if(jt.utils.isString(file)) {
						return path.join(project.dir, file);
					} else {
						// processor添加dir
						file.dir = project.dir;
						return file;
					}
				});
			} else if(jt.utils.isObject(toCombo)) {
				toCombo.dir = project.dir;
				toCombo = [toCombo];
			}

			var fullpath, outPath;

			fullpath = path.join(project.dir, fileName);
			if(project.output) {
				project.output = jt.utils.realPath(project.output);
				outputAlias[fullpath] = path.join(project.output, fileName);
			} else {
				outputAlias[fullpath] = fullpath;
			}
			
			comboFiles[fullpath] = toCombo;
			comboFilesString.push(fullpath);

			projects[key].push(fullpath);
		});
	});

	comboFilesString = comboFilesString.join(' ');
})();


// 以下是公开的api 

/**
 * 文件读取
 * @return {Buffer}
 */
function _fileGeter(filePath, callback) {
	if(fs.existsSync(filePath)) {					//绝对路径文件
		fs.readFile(filePath, function(err, buffer) {
			callback(buffer);
		});
	} else {
		var rePath = jt.utils.realPath(filePath);
		if(fs.existsSync(rePath)) {	//相对路径文件
			fs.readFile(rePath, function(err, buffer) {
				callback(buffer);
			});
		} else {   //不存在这个文件,使用其他方式
			console.log('  not found "'+filePath+'", return by "".');
			callback('');
		}
	}
}

/**
 * 读取文件并合并文件
 * @param  {String|Array}   filePath 文件路径
 * @param  {Object}   option
 * @return {Buffer} file's buffer
 */
builder.fileGeter = function(filePaths, callback) {
	// 管道最后流到这里的话就当作普通路径处理
	jt.pipe.hook('jt.fileGeter', function(data, next, done) {
		if(jt.utils.isString(data)) {
			_fileGeter(data, function(data) {
				done(data);
			});
			return;
		}
		done();
	});

	builder.fileGeter = function(filePaths, callback) {
		var app = jt.utils.do();

		if(!jt.utils.isArray(filePaths)) {
			filePaths = [filePaths];
		}
		if(!filePaths.length) {
			callback(['']);
		}

		filePaths.forEach(function(value) {
			app.do(function(done) {
				if(jt.utils.isArray(value)) {
					builder.fileGeter(value, function(buffer) {
						done(buffer);
					});
				} else {
					// 格式化所有返回值为buffer类型
					jt.pipe.trigger('jt.fileGeter', value, function(data) {
						if(jt.utils.isString(data)) {
							data = new jt.utils.BufferHelper(data);
							data = data.toBuffer();
						}
						var wrap = new Buffer('\r\n');

						done([data, wrap]);
					});
				}
			});
		});

		app.done(function() {
			var args = Array.prototype.slice.call(arguments),
				data;

			args = jt.utils.flatten(args);
			data = new jt.utils.BufferHelper(args);
			data = data.toBuffer();
			callback(data);
		});
	};

	builder.fileGeter(filePaths, callback);
};


/**
 * 给定文件名搜索文件路径
 * @param  {String}   basePath 文件路径
 * @param  {String}   filename 文件名
 * @param  {Function} callback callback
 */
function _searchFile(basePath, filename, callback) {
	var app = jt.utils.do(),
		results = [];

	filename = path.normalize(filename);
	fs.readdir(basePath, function(err, files) {
		jt.utils.each(files, function(file) {
			app.do(function(done) {
				var fullPath = path.normalize(basePath + '/' + file);

				//忽略配置中ignore文件夹
				if(config.ignorePath) {
					for(var i in config.ignorePath) {
						if(fullPath == path.normalize(config.basePath + '/' + config.ignorePath[i])) {
							done();
							return;
						}
					}
				}

				fs.stat(fullPath, function(err, stat) {
					if(stat.isDirectory()) {
						_searchFile(fullPath, filename, function(path) {
							if(path) {
								results = results.concat(path);
							}
							done();
						});
					} else {
						if(fullPath.indexOf(filename) != -1) {
							results.push(fullPath);
						}
						done();
					}
				});
			});
		});

		app.done(function() {
			callback(results);
		});
	});
}

/**
 * 项目文件搜索
 * @param  {String}   files    文件名
 * @param  {Object}   config   
 * @config project	{boolean}  true   搜索项目内文件,default false 
 * @config pathFile	{boolean}  true   搜索目录下文件,default false
 * @config searchOther		{Array}   添加其他搜索路径
 * @param  {Function} callback callback
 * @return 
 * {
 *     pathFile:  //for search pathFile result
 *     [
 *         '/data/statics/js/js1.js',
 *         '/data/statics/js/js2.js'
 *     ],
 *     comboFile: ['data/js.js'], //below for search project result
 *     compile: [{
 *         'js_a.js',
 *         'js_b.js'
 *     }]
 * }
 */
builder.finder = function(files, cfg, callback) {
	if(!files || !files.length) return;

	var paths = [],
		result = {
			comboFile: [],
			pathFile: [],
			compile: []
		},
		app = jt.utils.do();

	// cfg 处理
	if(!callback) {
		callback = cfg;
		cfg = {};
	}
	// find combo file
	if(!jt.utils.isArray(files)) {
		files = [files];
	}
	if(cfg.searchOther) {
		if(!jt.utils.isArray(cfg.searchOther)) {
			cfg.searchOther = [cfg.searchOther];
		}
	}
	cfg.project = (!cfg.project) ? false : true;
	cfg.pathFile = (!cfg.pathFile) ? false : true;

	jt.utils.each(files, function(file) {
		if(cfg.project) {
			app.do(function(done) {
				var match = comboFilesString.match("[^\\s]*?"+file+"[^\\s]*");
				// find it at combo file
				if(match) {
					result.comboFile.push(match[0]);
					result.compile = comboFiles[match[0]];
				}
				done();
			});
		}
		if(cfg.pathFile) {
			app.do(function(done) {
				_searchFile(config.base, file, function(files) {
					result.pathFile = result.pathFile.concat(files);
					done();
				});
			});
		}
		if(cfg.searchOther) {
			app.do(function(done) {
				jt.utils.each(cfg.searchOther ,function(p) {
					_searchFile(p, file, function(files) {
						result.pathFile = result.pathFile.concat(files);
						done();
					});
				});
			});
		}
	});

	app.done(function() {
		callback(result);
	});
	return files;
};

/**
 * build脚本
 * @param  {Array|String}  project       项目
 * @return {[type]}             [description]
 */
builder.build = function(project) {
	if(!jt.utils.isArray(project)) {
		project = [project];
	}

	// 处理队列
	var fnQueue = new jt.utils.FnQueue();
	// 遍历项目 fileGeter
	jt.utils.each(project, function(project) {
		fnQueue.add(function(done) {
			console.log('');
			if(!projects[project]) {
				console.log('  not found project:' + project);
				console.log('');
				return;
			}
			console.log('  start building project: ' + (project).green);
			console.log('');
			var app = jt.utils.do();

			jt.utils.each(projects[project], function(file) {

				app.do(function(done) {
					var combo = comboFiles[file];
					builder.fileGeter(combo, function(data) {
						done(data);
					});
				});
			});

			app.done(function() {
				var info = jt.utils.object(projects[project], jt.utils.toArray(arguments));

				jt.pipe.trigger('jt.buider.saveBefore', '', function() {				
					// save
					builder.save(info, {
						endCallback: function(paths) {
							done();
						}
					});
				});

			});
		});
	});
};

/**
 * 清除output文件夹
 * @param {Function} callback 回掉函数
 * @return {} 
 */
// builder.clear = function(callback) {
// 	jt.utils.rmdir(jt.root + config.outputPath, true,function() {
// 		if(callback) {
// 			callback();
// 		}
// 	});
// };

/**
 * 保存文件
 * @param  {Object} info ｛文件名:文件buffer}
 * @param  {Object} cfg   参数
 * @config {Object} outputAlias 自定义文件地址映射
 * @config {Function} endCallback save done回调
 */
builder.save = function(info, cfg) {
	if(!cfg) {
		cfg = {};
	}

	var app = jt.utils.do(),
		// 打log计数
		num = 1;

	// 地址映射
	if(!cfg.outputAlias) {
		cfg.outputAlias = {};
	}
	console.log('');
	console.log('  output:');
	console.log('');

	jt.utils.each(info, function(fileBuffer, filePath) {
		if(!Buffer.isBuffer(fileBuffer)) {
			console.log('  '+('['+(num++)+'] ').red +filePath);
			console.log('  无法读取该文件内容,无法保存!'.red);
			return;
		}
		// 参数定义的地址映射
		if(cfg.outputAlias[filePath]) {
			filePath = cfg.outputAlias[filePath];
		// builder内定义的文件地址映射
		} else if(outputAlias[filePath]) {
			filePath = outputAlias[filePath];
		}

		app.do(function(done) {
			var filename = path.basename(filePath),
				fpath = path.dirname(filePath);

			if(!fs.existsSync(fpath)) {
				jt.utils.mkdir(fpath);
			}
			fs.writeFileSync(filePath, fileBuffer);
			console.log('  '+('['+(num++)+'] ').green + filePath);
			done(filePath);
		});
	});

	app.done(function() {
		var argv = jt.utils.toArray(arguments);
		if(cfg.endCallback) {
			cfg.endCallback(argv);
		}
	});
};
