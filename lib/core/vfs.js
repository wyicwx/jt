var path = require('path'),
	minimatch = require('minimatch'),
	glob = require('glob'),
	_ = require('underscore');
	fs = require('fs'),
	origin = require('akostream').origin,
	aggre = require('akostream').aggre,
	combine = require('akostream').combine;


function _init(Self) {
	var toBatch = [];
	Self.pathHashMap = _parseTree(Self.fileTree, Self.base, {}, Self.pathList, toBatch);
	_parseBatch(Self, toBatch);
}

// 通配符处理
function _parseBatch(Self, toBatch) {
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
		if(data.type == 'wildcard' && data.config.file) {
			var p = VFS.pathResolve(data.config.file, data.dir);
			p = VFS.formatPath(p);
			var searchDir = _getPath(p);

			var result = Self.searchSync(p);

			result.forEach(function(originalFilePath) {
				var targetFilePath = originalFilePath;
				if(data.config.hasOwnProperty('rename')) {
					var oldFileName = path.basename(originalFilePath);
					var newFileName = data.config.rename.call(null, oldFileName);
					
					if(!newFileName) return;
					targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
				}

				targetFilePath = targetFilePath.replace(searchDir, data.dir);
				targetFilePath = path.normalize(targetFilePath);

				Self.pathList.push(targetFilePath);

				Self.pathHashMap[targetFilePath] = [_.extend({}, data.config, {file: originalFilePath})];
			});
		}
	});
}
// function flatten(obj, prev, o) {
// 	prev = prev || jt.config.base;
// 	o = o || {};

// 	jt.utils.each(obj, function(value, key) {
// 		var p = path.join(prev, key);

// 		if(jt.utils.isObject(value) && !Array.isArray(value)) {
// 			flatten(value, p, o);
// 		} else {
// 			if(key === '*') {
// 				value.forEach(function(config) {
// 					if(Array.isArray(config.file)) {
// 						config.file.forEach(function(file) {
// 							special.push({
// 								dir: prev,
// 								config: _.extend({}, config, {
// 									file: file
// 								}),
// 								type: 'wildcard'
// 							});
// 						});
// 					} else {	
// 						special.push({
// 							dir: prev,
// 							config: config,
// 							type: 'wildcard'
// 						});
// 					}
// 				});
// 			} else {
// 				p = fsApi.formatPath(p);
// 				matchs.push(p);
// 				if(Array.isArray(value)) {
// 					o[p] = value;
// 				} else {
// 					o[p] = [value];
// 				}
// 			}
// 		}
// 	});

// 	return o;
// }

function _parseTree(tree, parentFolder, result, pathQueue, batch) {
	_.each(tree, function(subtree, dir) {
		var currentPath = path.join(parentFolder, dir);

		if(_.isObject(subtree) && !_.isArray(subtree)) {
			_parseTree(subtree, currentPath, result, pathQueue, batch);
		} else {
			if(dir === '*') {
				// 批处理
				subtree.forEach(function(config) {
					if(Array.isArray(config.file)) {
						_.each(config.file, function(file) {
							batch.push({
								dir: parentFolder,
								config: _.extend({}, config, {
									file: file
								}),
								type: 'wildcard'
							});
						});
					} else {	
						batch.push({
							dir: parentFolder,
							config: config,
							type: 'wildcard'
						});
					}
				});
			} else {
				currentPath = VFS.formatPath(currentPath);
				pathQueue.push(currentPath);
				if(Array.isArray(subtree)) {
					result[currentPath] = subtree;
				} else {
					result[currentPath] = [subtree];
				}
			}
		}
	});

	return result;
}

function VFS(fileTree, option) {
	option || (option = {});

	this.base = option.base || jt.getConfig('base');
	this.pathHashMap = null;
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
		processor ->  processor [file array] -> 
	 */
	resolveFile: function(filePath, option) {
		filePath = this.pathResolve(filePath);

		option || (option = {});

		if(!this.hasFile(filePath)) {
			return false;
		}
		if(!(filePath in this.resolvedPath)) {
			var rawContent = this.pathHashMap[this.path];
			var resolved = [];

			rawContent.forEach(function(item) {
				if(_.isString(item)) {
					// 模糊搜索
					resolved = resolved.concat(this.searchSync(item, option.dir || this.base));
				} else if(_.isObject(item)) {
					item.dir = option.dir || this.base;
					resolved = resolved.concat(this.resolveProcessor(item));
				}
			}, this);
			config.list[this.path] = resolved;
			ReadStream.resolvedPath[this.path] = true;
		}

		return this.resolvedPath[filePath];
	},
	resolveProcessor: function(item) {
		option || (option = {});

		if(item.file) {
			if(_.isString(item.file)) {
				item.file = [item.file];
			}
			
			// 数组类型的file,对每一个都解析
			var files = [];
			_.each(item.file, function(file) {
				// wildcard ? 
				if(!/\*/.test(file)) {
					files.push(this.pathResolve(file, item.dir));
				} else {
					files = files.concat(this.searchSync(file, item.dir));
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

	this.rawContent = filecontent;
	// 记录类型  processor or file string
	this.type;
	// 文件所在文件夹   processor 无
	this.dir = null;
	// 文件名
	this.basename = null;
	// 文件完整路径
	this.path = null;	
	// 是否虚拟文件
	this.isVirtual = false;
	// 文件类型是否解析
	this.isResolved = false;

	// 保存对真实文件的依赖
	this.dependentFile = [];
	// 对引用过的文件，防止重复引用
	this.quote = option.quote || {};

	this.combines = [];

	this._init();
}
newReadStream.prototype._init = function() {
	this._setupInfo();
	if(this.type == newReadStream.TYPE_FILE) {
		this._readFile();
	} else {
		this._readProcess();
	}
}
newReadStream.prototype._setupInfo = function() {
	if(_.iString(filecontent)) { // file string
		this.type = newReadStream.TYPE_FILE;

		this.dir = path.dirname(this.rawContent);
		this.basename = path.basename(this.rawContent);
		this.path = this.rawContent;
		this.isVirtual = this.vfs.hasFile(this.path);
		this.isResolved = this.vfs.isResolve(this.path);
	} else { // processor
		this.type = newReadStream.TYPE_PROCESS;
	}
};
newReadStream.prototype._readFile = function() {
	if(!this.resolved) {
		this._resolveFile();
	}


};
newReadStream.prototype._readProcess = function() {

};
ReadStream.prototype._resolveFile = function() { // 解析配置	

};
ReadStream.prototype.toStream = function() {
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