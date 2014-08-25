var path = require('path'),
	minimatch = require('minimatch'),
	glob = require('glob'),
	_ = require('underscore');
	fs = require('fs'),
	origin = require('akostream').origin,
	aggre = require('akostream').aggre,
	combine = require('akostream').combine;


function _init(Self) {


	// Self.pathHashMap = _parseTree(Self.fileTree, Self.base, {}, Self.pathList, toBatch);
	// _parseBatch(Self, toBatch);
	// Self.pathList
	
	var parsed = _parse({
		tree: Self.fileTree,
		dir, Self.base,
		vfs: Self
	});

	Self.pathHashMap = parsed.result;
	Self.pathList = parsed.list;

}
// 解析入口
function _parse(option) {
	var toBatch = [];
	var result = {};

	_parseTree(option.tree, option.dir, toBatch, result);
	_parseBatch(toBatch, {
		dir: option.dir,
		existFile: result,
		vfs: option.vfs,
		result: result
	});

	return {
		result: result,
		list: _.keys(result)
	}
}
// 树解析
function _parseTree(tree, parentFolder, batch, result) {
	result || (result = {});
	_.each(tree, function(subtree, dir) {
		var currentPath = path.join(parentFolder, dir);

		if(_.isObject(subtree) && !_.isArray(subtree)) {
			_parseTree(subtree, currentPath, batch, result);
		} else {
			if(dir === '*') {
				// 批处理
				subtree.forEach(function(config) {
					if(config.file) {
						if(!_.isArray(config.file)) {
							config.file = [config.file];
						}
						_.each(config.file, function(file) {
							batch.push({
								dir: parentFolder,
								config: _.extend({}, config, {
									file: file
								})
							});
						});
					}
				});
			} else {
				currentPath = VFS.formatPath(currentPath);

				result[currentPath] = Array.isArray(subtree) ? subtree : [subtree];
			}
		}
	});

	return result;
}
// 通配符解析
function _parseBatch(toBatch, option) {
	var vfs = option.vfs;

	function _getPath(p) {
		var mmatch = minimatch.Minimatch(p);
		var result = [];
		var matchArray = mmatch.set[0];

		for(var i = 0, length = matchArray.length; i < length; i++) {
			if(_.isString(matchArray[i]) && (i < length - 1)) {
				result.push(matchArray[i]);
			} else {
				break;
			}
		}

		return result.join('/');
	}

	function _search(searchValue) {
		var existSearchResult = minimatch.match(vfs.pathList, searchValue, {});
		var searchResult = minimatch.match(_.keys(option.result), searchValue, {});
		var data = glob.sync(searchValue);
		var result = existSearchResult.concat(searchResult).concat(data);

		result = _.uniq(result);
		return result;
	}
	/**
	 * {
	 * 	 dir: '/xx/bb/aa',
	 * 	 config: {
	 * 	 	processor: '',
	 * 	 	file: ''
	 * 	 },
	 * 	 type: 'widcard'
	 * }
	 */
	toBatch.forEach(function(data) {
		// 通配符
		var fullPath = VFS.pathResolve(data.config.file, data.dir);
		var searchDir = _getPath(fullPath);
		var result = _search(fullPath);

		_.each(result, function(originalFilePath) {
			var targetFilePath = originalFilePath;

			if(data.config.hasOwnProperty('rename')) {
				var oldFileName = path.basename(originalFilePath);
				var newFileName;
				var rename = data.config.rename;

				if(_.isObject(rename)) {
					newFileName = data.config.rename[oldFileName] || oldFileName;
				} else if(_.isFunction(rename)) {
					newFileName = rename.call(null, oldFileName);
				}
				
				if(!newFileName) return;

				targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
			}

			// 替换文件夹
			targetFilePath = targetFilePath.replace(searchDir, '');
			targetFilePath = path.join(data.dir, targetFilePath);

			option.result[targetFilePath] = [_.extend({}, data.config, {file: originalFilePath})];
		});
	});
}



// 判断是否含有通配符
function _hasWildCard(str) {
	var match = new minimatch.Minimatch(str);
	var has = false;

	_.each(match.set[0], function(value) {
		if(!_.isString(value)) {
			has = true;
		}
	});
	return has;
}
function VFS(fileTree, option) {
	option || (option = {});

	this.base = option.base || jt.getConfig('base');
	this.pathHashMap = {};
	this.pathList = [];
	this.fileTree = fileTree;
	// 记录已经解析过的路径
	this.resolvedPath = {};
	_init(this);
}

VFS.prototype = {
	getFilePath: function(filePath) {
		filePath = this.pathResolve(filePath);

		return this.pathHashMap[filePath];
	},
	searchVirtual: function(search, option) {
		option || (option = {});

		search = VFS.pathResolve(search, option.dir || this.base);
		var match = minimatch.match(this.pathList, search, {});
		// match = _filterIgnore(match);

		return match;
	},
	search: function(search, callback, option) {
		var result = this.searchVirtual(search),
			Self = this;

		option || (option = {});

		glob(search, {cwd: this.base}, function(err, data) {
			if(err) {
				callback && callback(err, null);
			} else {
				data = data.map(function(value) {
					return path.resolve(Self.base, value);
				});
				// data = _filterIgnore(data);
				result = result.concat(data);
				result = _.uniq(result);
				callback && callback(null, result);
			}
		});
	},
	searchSync: function(search, option) {
		option || (option = {});

		search = this.pathResolve(search, option.dir || this.base);

		var result = this.searchVirtual(search);
		var data = glob.sync(search);
		result = result.concat(data);
		result = _.uniq(result);
		// 忽略？
		// result = _filterIgnore(result);
		return result;
	},
	/**
		解析文件路径
		string -> search -> string array
	 */
	resolveFile: function(filePath, option) {
		filePath = this.pathResolve(filePath);
		// 不解析已经解析过的文件
		option || (option = {});

		if(!this.hasFile(filePath)) {
			return [filePath];
		}
		if(!(filePath in this.resolvedPath)) {
			var rawContent = this.pathHashMap[filePath];
			var resolved = [];
			// 
			// 'xxxx': [
			// 		'file',
			// 		{
			// 			processor: 'xx',
			// 			file: ''
			// 		}
			// ]
			// 
			rawContent.forEach(function(item) {
				if(_.isString(item)) {
					if(_hasWildCard(item)) {
						resolved = resolved.concat(this.searchSync(item, {dir: option.dir}));
					} else {
						resolved.push(this.pathResolve(item, option.dir));
					}
					// 模糊搜索
				} else if(_.isObject(item)) {
					resolved.push(item);
					// item.dir = option.dir || this.base;
					//  = resolved.concat(this.resolveProcessor(item));
				}
			}, this);
			config.list[this.path] = resolved;
			ReadStream.resolvedPath[this.path] = true;
		}

		return this.resolvedPath[filePath];
	},
	/**
		processor ->  processor [file array]
	*/
	resolveProcessor: function(item) {
		option || (option = {});

		if(item.file) {
			if(_.isString(item.file)) {
				item.file = [item.file];
			}
			
			// 数组类型的file,对每一个都解析
			var files = [];
			_.each(item.file, function(file) {
				if(_hasWildCard(file)) {
					files = files.concat(this.searchSync(file, item.dir));
				} else {
					files.push(this.pathResolve(file, item.dir));
				}
			}, this);

			item.file = files;
		}
	},
	read: function(filePath) {
		if(!_.isArray(filePath)) {

		}
		filePath = this.filePath;
	},
	hasFile: function(filePath) {
		filePath = this.pathResolve(filePath);

		return filePath in this.pathHashMap;
	},
	addTree: function(tree, override) {
		var parsed = _parse({
			dir: this.base,
			tree: tree,
			vfs: this
		});

		if(override) {
			this.pathHashMap = _.extend({}, this.pathHashMap, parsed.result);
		} else {
			this.pathHashMap = _.extend({}, parsed.result, this.pathHashMap);
		}

		this.pathList = _.keys(this.pathHashMap);
	},
	pathResolve: VFS.pathResolve
};


VFS.formatPath = function(p) {
	return p.split(path.sep).join('/');
};

VFS.pathResolve = function(filepath, dir) {
	var first = filepath[0],
		result;
	if(!dir) {
		dir = jt.config.base;
	}
	// 相对于dir的相对路径
	if(first == '.') {
		result = path.resolve(dir, filepath);
	} else if(first == path.sep) {
		result = path.resolve('/', filepath);
	} else if(first == '~') {
		filepath = filepath.replace(/^~+/, '');
		result = path.resolve(path.join(jt.config.base, filepath));
	} else {
		result = path.resolve(dir, filepath);
	}

	return this.formatPath(result);
};

VFS.processor = {};

// build hash 也是一条路
// -> 预解析
// -> 搜索 from list
// -> getFile from hash
// 
// parse access
// -> 遍历
// -> 搜索 ***
// -> getFile search tree
// 
// 
// 
// path/* b/* 
// path/* b/*
// 
// 

// get all 

// 匹配 /a/*.js
// /a/*  -> /b/* -> /a/*.js -> rename ? 
// 
// 匹配目标文件夹,




// 		// get hash
// 		if(this.pathHashMap[filePath]) {
// 			return this.pathHashMap[filePath];
// 		// parse
// 		} else if(_parseTree(this, filePath)) {
// 			return this.pathHashMap[filePath];
// 		// wildcard match
// 		// 虚拟文件先映射，真实文件也没办法获取
// 		// 
// 		} else if(_wildcardmatch(this, filePath)) {
// 			return this.pathHashMap[filePath];
// 		// null
// 		} else {
// 			return null;
// 		}
// 	},
// 	hasFile: function() {

// 	}
// };


// processor 
// 	// value    (没有依赖)
// 	// file     (有依赖)
// file string  (有依赖) 


// 只读取单个
function newReadStream(filecontent, option) {
	this.vfs = option.vfs;
	
	// 保存对真实文件的依赖
	this.dependentFile = [];
	// 对引用过的文件，防止重复引用
	this.quote = option.quote || {};
	// 原生数据
	this.rawContent = filecontent;

	// 记录类型  processor or file string
	this.type;
	
	// file type 所有字段
	// 文件夹
	this.dir = null;
	// 文件名
	this.basename = null;
	// 文件完整路径
	this.path = null;	
	// 是否虚拟文件
	this.isVirtual = false;
	// 是否被引用过
	this.quoted = false;

	this.combines = [];
	this.readStreams = [];

	this._init();
}
newReadStream.prototype._init = function() {
	this._setupInfo();
}
newReadStream.prototype._setupInfo = function() {
	if(_.iString(this.rawContent)) { // file string
		this.type = newReadStream.TYPE_FILE;

		this.dir = path.dirname(this.rawContent);
		this.basename = path.basename(this.rawContent);
		this.path = this.rawContent;
		this.isVirtual = this.vfs.hasFile(this.path);
		this.quoted = this.path in this.quote;

		this.rawContent = this.vfs.resolveFile(this.path);
	} else { // processor
		this.type = newReadStream.TYPE_PROCESS;
	}

	this._resolveDependentFile();
};
newReadStream._resolveDependentFile = function() {
	var files = [];
	if(this.type == newReadStream.TYPE_FILE) {	
		files = this.rawContent;
	} else {
		files = this.rawContent.file;
	}

	_.each(this.rawContent, function(file) {
		var readStream = new newReadStream(file, {
			quote: this.quote,
			vfs: this.vfs
		});

		this.readStreams.push(readStream);

		// 依赖收集
		if(!readStream.isVirtual) {
			this.dependentFile.push(readStream.path);
		} else {
			this.dependentFile = this.dependentFile.concat(readStream.dependentFile);
		}
	}, this);

	this.dependentFile = _.uniq(this.dependentFile);
};
newReadStream.prototype._readFile = function() {
	if(this.isVirtual) {
		if(this.quoted) { // over references.
			console.log('    [%s] File %s over references.', 'warning'.yellow, this.path);
		} else {
			this.quote[this.path] = true;
		}
		if(!fs.existsSync(this.path)) { // not exist.
			console.log('    [%s] File %s not exist.', 'warning'.yellow, this.path);
		} else {
			this.combines.push(fs.createReadStream(this.path));
		}
	} else {
		_.each(this.readStreams, function(readStream) {
			this.combines.push(readStream.toStream());
		}, this);
	}
};
newReadStream.prototype._readProcessor = function() {
	var item = this.rawContent;
	var processor = item.processor || [];

	if(_.isString(processor)) {
		processor = processor.split(/\s*,\s*/);
	}

	var handlers = [];

	_.each(processor, function(key) {
		handlers.push([ key, 
			ReadStream.processor[value] ? ReadStream.processor[value] : jt.require(value)
		]);
	});

	var result = [];
	// 文件合并处理
	if(item.merge == 'before') {

		_.each(this.readStreams, function(readStream) {
			this.combines.push(readStream.toStream());
		}, this);

		result.push(aggre(combines(this.combine)));

		_.each(processor, function(p) {
			var handler = p[1],
				name = p[0];

			result.push(handler(_.result(item, name) || {}, {
				dir: item.dir,
				filePath: options.file,
				ext: path.extname(options.file)
			}));
		}, this);
	} else { // 文件单独处理后再合并
		_.each(this.readStreams, function(readStream) {
			var o = origin(readStream.toStream());

			_.each(processor, function(p) {
				var handler = p[1],
					name = p[0];

				o = o.pipe(handler(jt.utils.result(options, name) || {}, {
					dir: options.dir,
					filePath: options.file,
					ext: path.extname(options.file)
				}));
			}, this);

			result.push(o);
		}, this);
	}

	return combine(result);
};
ReadStream.prototype.toStream = function() {
	if(this.type == newReadStream.TYPE_FILE) {
		this._readFile();
	} else {
		this._readProcessor();
	}

	return combines(this.combines);
}

newReadStream.TYPE_PROCESS = 1;
newReadStream.TYPE_FILE = 0;


function ReadStream(filename, quote) {
	if(!filename) {
		return combine();
	}
	filename = VFS.pathResolve(filename);

	this.dir = path.dirname(filename);
	this.basename = path.basename(filename);
	this.path = filename;

	this.quote = quote || {};
	this.virtual = false;
	this.resolved = ReadStream.resolvedPath[filename];

	this.combines = [];

	this.resolve();
	this.read();

	return combine(this.combines);
}

ReadStream.prototype.read = function() {
	if(!this.virtual || this.quote[this.path]) {

		if(this.quote[this.path]) {
			console.log('    [%s] File %s over references.', 'warning'.yellow, this.path);
		}
		if(fs.existsSync(this.path)) {
			this.combines.push(fs.createReadStream(this.path));
		} else {
			console.log('    [%s] File %s not exist.', 'warning'.yellow, this.path);
		}
	} else {
		this.quote[this.path] = true;
		var content = config.list[this.path];
		content.forEach(function(item) {
			if(jt.utils.isString(item)) {
				this.combines.push(new ReadStream(item, this.quote));
			} else {
				item.path = this.path;
				this.combines.push(ReadStream.processStream(item, this.quote, true));
			}
		}, this);
	}
};
ReadStream.prototype.resolve = function() { // 解析配置
	if(jt.fs.isVirtual(this.path)) {
		if(!this.resolved) {
			var content = config.list[this.path];
			var resolved = [];

			content.forEach(function(item) {
				if(jt.utils.isString(item)) {
					// 模糊搜索
					resolved = resolved.concat(ReadStream.searchPath(item, this.dir));
				} else if(jt.utils.isObject(item)) {
					item.dir = this.dir;
					resolved = resolved.concat(ReadStream.resolveProcessor(item));
				}
			}, this);
			config.list[this.path] = resolved;
			ReadStream.resolvedPath[this.path] = true;
		}

		this.virtual = true;
	}
};




ReadStream.resolvedPath = {};
ReadStream.processor = {};

ReadStream.processStream = function(options, quote, isResolveFile) {
	options = jt.utils.clone(options);
	if(!options.dir) {
		options.dir = jt.config.base;
	}

	if(!isResolveFile && options.file) {
		options = ReadStream.resolveProcessor(options);
	}
	var files = [];
	var filesName;
	// 标志是否不为file类型
	var isValue = false;
	// buffer实现
	if(options.file) {
		options.file.forEach(function(file) {
			files.push(new ReadStream(file, quote));
		});
		filesName = options.file;
	} else if(options.value) {
		isValue = true;
		files = [origin(new Buffer(options.value))];
	} else {
		// 没有value或者file报错
		throw new Error('Must be set option "file" or "value" for processor !');
	}

	var processors = [];
	if(options.processor) {
		if(typeof options.processor == 'string') {
			options.processor = options.processor.split(/\s*,\s*/);
		} else if(!Array.isArray(options.processor)) {
			throw new Error('processor must be string or array!');
		}
		options.processor.forEach(function(value) {
			var por;
			if(ReadStream.processor[value]) {
				por = ReadStream.processor[value];
			} else {
				por = jt.require(value);
			}

			processors.push([value, por]);
		});
	}

	var result = [];
	files.forEach(function(origin, key) {
		if(filesName) {
			options.file = filesName[key];
		}

		var o = aggre(origin);
		processors.forEach(function(p) {
			var handler = p[1],
				name = p[0];

			o = o.pipe(handler(jt.utils.result(options, name) || {}, {
				dir: options.dir,
				type: isValue ? 'value' : 'file',
				filePath: options.file,
				ext: isValue ? 'Buffer' : path.extname(options.file)
			}));
		});
		result.push(o);
	});
	return combine(result);
};
ReadStream.resolveProcessor = function(item) {
	if(item.file) {
		if(_.isString(item.file)) {
			item.file = [item.file];
		}
		
		// 数组类型的file,对每一个都解析
		var files = [];
		item.file.forEach(function(file) {
			// wildcard ? 
			if(!/\*/.test(file)) {
				files.push(VFS.pathResolve(file, item.dir));
			} else {
				files = files.concat(ReadStream.searchPath(file, item.dir));
			}

		});

		item.file = files;
	}
	// 支持task
	if(item.task) {
		var task = jt.task.getTask(item.task);

		if(task) {
			item.processor = _.clone(task.processor) || [];

			item.processor.forEach(function(processorName) {
				item[processorName] = task[processorName];
			});
		}
	}

	return item;
};

ReadStream.searchPath = function(item, dir) {
	item = jt.fs.pathResolve(item, dir || jt.config.base);
	return jt.fs.searchSync(item);
};



module.exports = VFS;