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

function _processStream(options, quote) {
	options = jt.utils.clone(options);
	// 实现buffer
	if(options.file) {
		options.file = new ReadStream(options.file, quote);
	} else if(options.value) {
		options.file = origin(new Buffer(options.value));
	} else {
		console.log('  ['+'warning'.yellow+'] carrier does not exist! you must be set option "file" or "value" !');
		return false;
	}
	var processors = [];
	if(!Array.isArray(options.processor)) {
		options.processor = [options.processor];
	}
	options.processor.forEach(function(value) {
		try {
			var res = resolve.sync(value, { basedir: jt.cwd });
			processors.push([value, require(res)]);
		} catch(e) {
			console.log('  ['+'warning'.yellow+'] '+value+' module does not exist!');
		}
	});

	var ret = aggre(options.file);
	processors.forEach(function(p) {
		var handler = p[1],
			name = p[0];

		ret = ret.pipe(handler(jt.utils.result(options, name)));
	});

	return ret;
}

function _FilenameConvertAndEnsurePathExist(filename) {
	var fpath;

	filename = vfs.pathConverter(filename);
	fpath = path.dirname(filename);

	if(!fs.existsSync(fpath)) {
		jt.utils.mkdir(fpath);
	}

	return filename;
}

function _filterIgnore(files) {
	return files.filter(function(file) {
		for(var i in jt.config.fs.ignorePath) {
			if(files.indexOf(jt.config.fs.ignorePath[i]) !== -1) return false;
		}
		return true;
	});
}

function ReadStream(filename, quote) {
	if(!filename) {
		return combine([]);
	}
	filename = vfs.pathConverter(filename);

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
				this.combines.push(_processStream(item, this.quote));
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
					if(!item.value && !item.file) return;
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
 * 读取文件并合并文件
 * @param  {String}   filePath 文件路径
 * @param  {Object}   option
 * @return {Buffer} file's buffer
 */
vfs.createReadStream = function(filename) {
	var stream = new ReadStream(filename);
	return stream;
};

vfs.createReadCombineStream = function(options) {
	if(!options) return;

	if(!Array.isArray(options)) 
		options = [options];

	var combines = [];
	options.forEach(function(file) {
		if(jt.utils.isString(file)) {
			combines.push(new ReadStream(file));
		} else {
			combines.push(_processStream(file));
		}
	});
	return combine(combines);
};

vfs.readStream = function(stream, callback) {
	var emited = false;
	aggre(stream).on('data', function(chunk) {
		callback(chunk);
		emited = true;
	}).on('end', function() {
		if(!emited)	callback(new Buffer(''));
	});
};

vfs.readFile = function(filename, callback) {
	var	fileStream;

	fileStream = vfs.createReadStream(filename);
	vfs.readStream(fileStream, function(buffer) {
		callback(buffer);
	});
};

vfs.readComboFile = vfs.readFile;

vfs.search = function(searchValue, callback) {
	var ret = this.searchVirtual(searchValue);

	glob(searchValue, {cwd: jt.config.base}, function(err, data) {
		data = _filterIgnore(data);
		data = data.map(function(value) {
			return vfs.pathConverter(value);
		});
		ret = ret.concat(data);
		ret = jt.utils.uniq(ret);
		callback(ret);
	});
};

vfs.searchSync = function(searchValue) {
	var ret = this.searchVirtual(searchValue);

	var data = glob.sync(searchValue, {cwd: jt.config.base});

	data = _filterIgnore(data);
	data = data.map(function(value) {
		return vfs.pathConverter(value);
	});
	ret = ret.concat(data);
	ret = jt.utils.uniq(ret);

	return ret;
};

vfs.searchVirtual = function(searchValue) {
	var matchs = jt.utils.keys(config.list);

	this.searchVirtual = function(searchValue) {
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

/**
 * 判断是否在虚拟文件系统内
 * @param  {string}  p 路径，相对的或者绝对的
 * @return {Boolean}   [description]
 */
vfs.isVirtual = function(p) {
	return this.pathConverter(p) in config.list;
};

vfs.existsSync = function(file) {
	if(this.isVirtual(file)) {
		return true;
	}
	if(fs.existsSync(file)) {
		return true;
	}
	return false;
};

vfs.createWriteStream = function(filename) {
	filename = vfs.pathConverter(filename);

	writeStream = fs.createWriteStream(filename);

	return writeStream;
};

vfs.writeFile = function(filename, data, callback) {
	filename = _FilenameConvertAndEnsurePathExist(filename);

	fs.writeFile(filename, data, callback);
};

vfs.pathResolve = function(filepath, dir) {
	var first = filepath[0];

	// 相对于dir的相对路径
	if(first == '.') {
		return path.resolve(dir, filepath);
	} else if(first == path.sep) {
		filepath = filepath.replace(path.sep, '');
		return path.resolve(jt.config.base, filepath);
	} else if(first == '!') {
		filepath = filepath.slice(1, filepath.length);
		return path.resolve('/', filepath);
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

/**
 * 预处理,格式化配置文件内路径
 */
(function() {
	jt.config.base = vfs.pathConverter(jt.cwd, jt.config.base);

	config.list = config.list || [];
	config.ignorePath = config.ignorePath || [];

	config.list = _flatten(config.list);

	config.ignorePath = config.ignorePath.map(function(value, key) {
		return vfs.pathConverter(value);
	});

})();

module.exports = vfs;