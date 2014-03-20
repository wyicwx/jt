var fs   = require('fs'),
	path = require('path'),
	minimatch = require('minimatch'),
	resolve = require('resolve'),
	combine = require('akoStream').combine,
	origin = require('akoStream').origin,
	aggre = require('akoStream').aggre,
	through = require('through2'),
	glob = require('glob'),
	config = jt.config.fs;

var vfs = {};

/**
 * 格式化
 */
function _flatten(obj, prev, o) {
	prev = prev || jt.config.base;
	o = o || {};

	jt.utils.each(obj, function(value, p) {
		p = path.join(prev, p);
		if(jt.utils.isArray(value)) {
			o[p] = value;
		} else if(jt.utils.isObject(value)) {
			_flatten(value, p, o);
		} else {
			o[p] = [value];
		}
	});

	return o;
}
/**
 * 创建文件夹
 */
function _mkdir(filename) {
	var fpath;

	fpath = path.dirname(filename);

	if(!fs.existsSync(fpath)) {
		jt.utils.mkdir(fpath);
	}

	return filename;
}
/**
 * 过滤忽略文件
 */
function _filterIgnore(files) {
	config.ignorePath = config.ignorePath.map(function(value, key) {
		return vfs.pathResolve(value, jt.config.base);
	});

	var ignore = [];
	config.ignorePath.forEach(function(value) {
		ignore = ignore.concat(glob.sync(value));
	});
	config.ignorePath = ignore;
	ignore = jt.utils.keys(ignore);
	_filterIgnore = function(files) {
		return files.filter(function(file) {
			if(file in ignore) {
				return false;
			} else {
				return true;
			}
		});
	};

	return _filterIgnore(files);
}

function ReadStream(filename, quote) {
	if(!filename) {
		return combine();
	}
	filename = vfs.pathResolve(filename);

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
ReadStream.resolvedPath = {};
ReadStream.processor = {};
ReadStream.processStream = function(options, quote) {
	options = jt.utils.clone(options);
	if(!options.dir) {
		options.dir = jt.config.base;
	}
	// 实现buffer
	if(options.file) {
		options.file = new ReadStream(options.file, quote);
	} else if(options.value) {
		options.file = origin(new Buffer(options.value));
	} else {
		throw new Error('must be set option "file" or "value" for processor !');
	}
	var processors = [];
	if(options.processor) {
		if(!Array.isArray(options.processor)) {
			options.processor = [options.processor];
		}
		options.processor.forEach(function(value) {
			var por;

			try {
				if(ReadStream.processor[value]) {
					por = ReadStream.processor[value];
				} else {
					por = require(value);
				}
			} catch(e) {
				try {
					var res = resolve.sync(value, { basedir: jt.cwd });
					por = require(res);
				} catch(e) {
					throw new Error('  ['+'warning'.yellow+'] '+value+' module does not exist!');
				}
			}

			processors.push([value, por]);
		});
	}

	var ret = aggre(options.file);
	processors.forEach(function(p) {
		var handler = p[1],
			name = p[0];

		ret = ret.pipe(handler(jt.utils.result(options, name), {dir: options.dir}));
	});

	return ret;
};
ReadStream.prototype.read = function() {
	if(!this.virtual || this.quote[this.path]) {
		if(fs.existsSync(this.path)) {
			this.combines.push(fs.createReadStream(this.path));
		} else {
			console.log('  ['+'warning'.yellow+'] file "'+this.path+'" not exist!');
		}
	} else {
		this.quote[this.path] = true;
		var content = config.list[this.path];
		content.forEach(function(item) {
			if(jt.utils.isString(item)) {
				this.combines.push(new ReadStream(item, this.quote));
			} else {
				this.combines.push(ReadStream.processStream(item, this.quote));
			}
		}, this);
	}
};
ReadStream.prototype.resolve = function() { // 解析配置
	if(vfs.isVirtual(this.path)) {
		if(!this.resolved) {
			var content = config.list[this.path];
			var resolved = [];
			var Self = this;

			content.forEach(function(item) {
				if(jt.utils.isString(item)) {
					// 模糊搜索
					resolved = resolved.concat(Self.searchPath(item));
				} else if(jt.utils.isObject(item)) {
					// 过滤掉没有processor
					if(!item.value && !item.file) {
						throw new Error('must be set option "file" or "value" for processor!');
					}
					item.dir = this.dir;
					if(item.file) {
						// 数组类型的file,对每一个都解析
						if(Array.isArray(item.file)) {
							item.file.forEach(function(file) {
								var tmp = Self.searchPath(file);
								tmp.forEach(function(file) {
									var obj = jt.utils.clone(item);
									obj.file = file;
									resolved.push(obj);
								});
							});
						} else if(jt.utils.isString(item.file)) {
							// 正常路径，单独解析
							var tmp = Self.searchPath(item.file);

							tmp.forEach(function(file) {
								var obj = jt.utils.clone(item);
								obj.file = file;
								resolved.push(obj);
							});
						}
					} else {
						resolved.push(item);
					}
				}
			}, this);
			config.list[this.path] = resolved;
			ReadStream.resolvedPath[this.path] = true;
		}

		this.virtual = true;
	}
};
ReadStream.prototype.searchPath = function(item) {
	item = vfs.pathResolve(item, this.dir);
	return vfs.searchSync(item);
};

/**
 * 读取文件流
 * @param  {String}   filePath 文件路径
 * @return {Stream} 
 */
vfs.createReadStream = function(filename) {
	var stream = new ReadStream(filename);
	return stream;
};

/**
 * 读取合并文件流
 * @param  {String|Object|Array} options 合并对象
 * @return {Stream} 
 */
vfs.createReadCombineStream = function(options) {
	if(!options) return;

	if(!Array.isArray(options)) 
		options = [options];

	var combines = [];
	options.forEach(function(file) {
		if(jt.utils.isString(file)) {
			combines.push(new ReadStream(file));
		} else {
			combines.push(ReadStream.processStream(file));
		}
	});
	return combine(combines);
};

function _readStream(stream, callback) {
	var emited = false;
	aggre(stream).on('data', function(chunk) {
		callback(chunk);
		emited = true;
	}).on('end', function() {
		if(!emited)	callback(new Buffer(''));
	});
}

/**
 * 读取文件
 * @param  {String}   filename 文件路径
 * @param  {Function} callback 回调
 */
vfs.readFile = function(filename, callback) {
	var	fileStream;
	if(!filename.pipe) {
		fileStream = vfs.createReadStream(filename);
	} else {
		fileStream = filename;
	}
	_readStream(fileStream, function(buffer) {
		callback(buffer);
	});
};

/**
 * 读取合并文件
 * @param  {String|Object|Array} options 合并对象
 * @param  {Function} callback 
 */
vfs.readComboFile = function(options, callback) {
	var fileStream = this.readComboFile(options);
	_readStream(fileStream, function(buffer) {
		callback(buffer);
	});
};

/**
 * 搜索文件,支持glob语法
 * @param  {String}   searchValue 模糊搜索
 * @param  {Function} callback    [description]
 * @return {[type]}               [description]
 */
vfs.search = function(searchValue, callback) {

	var ret = this.searchVirtual(searchValue);

	glob(searchValue, {cwd: jt.config.base}, function(err, data) {
		data = data.map(function(value) {
			return path.resolve(jt.config.base, value);
		});
		data = _filterIgnore(data);
		ret = ret.concat(data);
		ret = jt.utils.uniq(ret);
		callback(ret);
	});
};

vfs.searchSync = function(searchValue) {
	searchValue = this.pathResolve(searchValue, jt.config.base);

	var ret = this.searchVirtual(searchValue);
	var data = glob.sync(searchValue);
	data = _filterIgnore(data);
	ret = ret.concat(data);
	ret = jt.utils.uniq(ret);

	return ret;
};

vfs.searchVirtual = function(searchValue) {
	var matchs = jt.utils.keys(config.list);
	
	this.searchVirtual = function(searchValue) {
		searchValue = this.pathResolve(searchValue, jt.config.base);
		var match = minimatch.match(matchs, searchValue, {});
		match = _filterIgnore(match);

		return match;
	};

	return this.searchVirtual(searchValue);
};

vfs.map2local = function(filename, callback) {
	if(vfs.isVirtual(filename)) {
		var writeStream = vfs.createWriteStream(filename);
		var readStream = vfs.createReadStream(filename);

		readStream.pipe(writeStream, { end: false });
		readStream.on('end', function() {
			writeStream.end();
			callback();
		});
		return true;
	} else {
		return false;
	}
};

vfs.isVirtual = function(p) {
	return this.pathResolve(p) in config.list;
};

vfs.existsSync = function(file) {
	file = this.pathResolve(file);
	if(this.isVirtual(file)) {
		return true;
	}
	if(fs.existsSync(file)) {
		return true;
	}
	return false;
};

vfs.createWriteStream = function(filename) {
	filename = vfs.pathResolve(filename);

	writeStream = fs.createWriteStream(filename);

	return writeStream;
};

vfs.writeFile = function(filename, data, callback) {
	filename = this.pathResolve(filename);
	filename = _mkdir(filename);

	fs.writeFile(filename, data, callback);
};

vfs.pathResolve = function(filepath, dir) {
	var first = filepath[0];
	if(!dir) {
		dir = jt.config.base;
	}
	// 相对于dir的相对路径
	if(first == '.') {
		return path.resolve(dir, filepath);
	} else if(first == path.sep) {
		return path.resolve('/', filepath);
	} else if(first == '~') {
		filepath = filepath.replace(/^~+/, '');
		return path.resolve(path.join(jt.config.base, filepath));
	} else {
		return path.resolve(dir, filepath);
	}
};

vfs.pathConverter = function(p) {
	if(arguments.length > 1) {
		return path.resolve.apply(path, arguments);
	} else {
		return path.resolve(jt.config.base, p);
	}
};

vfs.assign = function(name, fn) {
	ReadStream.processor[name] = fn;
};

/**
 * 预处理,格式化配置文件内路径
 */
(function() {
	jt.config.base = vfs.pathConverter(jt.cwd, jt.config.base);

	config.list = config.list || [];
	config.ignorePath = config.ignorePath || [];

	config.list = _flatten(config.list);
})();

module.exports = vfs;