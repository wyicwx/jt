'use strict';
var fs   = require('fs'),
	path = require('path'),
	minimatch = require('minimatch'),
	combine = require('akostream').combine,
	origin = require('akostream').origin,
	aggre = require('akostream').aggre,
	glob = require('glob'),
	_ = require('underscore'),
	config = jt.config.fs;

// instance
var vfs = {};
// path list
var matchs = [];

/**
 * 创建文件夹
 */
function _mkdir(filename) {
	var fpath;

	fpath = path.dirname(filename);

	if(!fs.existsSync(fpath)) {
		jt.utils.mkdir(fpath);
	}
}
/**
 * 过滤忽略文件
 */
var _filterIgnore = function(files) {
	var ignore = [];

	config.ignorePath.forEach(function(value) {
		value = vfs.pathResolve(value);

		ignore = ignore.concat(minimatch.match(matchs, value, {}));
		ignore = ignore.concat(glob.sync(value));
	});

	ignore = jt.utils.uniq(ignore);

	config.ignorePath = ignore;

	ignore = jt.utils.object(ignore, true);
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
};

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
	// 实现buffer
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
				files.push(vfs.pathResolve(file, item.dir));
			} else {
				files = files.concat(ReadStream.searchPath(file, item.dir));
			}

		});

		item.file = files;
	}

	return item;
};
ReadStream.prototype.read = function() {
	if(!this.virtual || this.quote[this.path]) {
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
	if(vfs.isVirtual(this.path)) {
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
ReadStream.searchPath = function(item, dir) {
	item = vfs.pathResolve(item, dir || jt.config.base);
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
			combines.push(ReadStream.processStream(file, null, false));
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
		if(callback) {
			callback(buffer);
		}
	});
};

/**
 * 读取合并文件
 * @param  {String|Object|Array} options 合并对象
 * @param  {Function} callback 
 */
vfs.readCombineFile = function(options, callback) {
	var fileStream = this.createReadCombineStream(options);
	_readStream(fileStream, function(buffer) {
		callback && callback(buffer);
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
		callback && callback(ret);
	});
};

vfs.searchSync = function(searchValue) {
	searchValue = this.pathResolve(searchValue, jt.config.base);

	var ret = this.searchVirtual(searchValue);
	var data = glob.sync(searchValue);
	ret = ret.concat(data);
	ret = jt.utils.uniq(ret);
	ret = _filterIgnore(ret);
	return ret;
};

vfs.searchVirtual = function(searchValue) {
	searchValue = this.pathResolve(searchValue, jt.config.base);
	var match = minimatch.match(matchs, searchValue, {});
	match = _filterIgnore(match);

	return match;
};

vfs.map2local = function(filename, callback) {
	if(vfs.isVirtual(filename)) {
		var writeStream = vfs.createWriteStream(filename);
		var readStream = vfs.createReadStream(filename);

		readStream.pipe(writeStream, { end: false });
		readStream.on('end', function() {
			writeStream.end();
			callback && callback();
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

	_mkdir(filename);

	return fs.createWriteStream(filename);
};

vfs.writeFile = function(filename, data, callback) {
	var stream = this.createWriteStream(filename);
	stream.write(data, function() {
		stream.end();
		callback && callback();
	});
};

vfs.pathResolve = function(filepath, dir) {
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

vfs.assign = function(name, fn) {
	ReadStream.processor[name] = fn;
};

vfs.formatPath = function(p) {
	return p.split(path.sep).join('/');
};
/**
 * 预处理,格式化配置文件内路径
 */
(function() {
	// 特殊文件规则处理
	var special = [];
	// //  key-value store path to config
	// var list = {};
	// 格式化
	function flatten(obj, prev, o) {
		prev = prev || jt.config.base;
		o = o || {};

		jt.utils.each(obj, function(value, key) {
			var p = path.join(prev, key);

			if(jt.utils.isObject(value) && !Array.isArray(value)) {
				flatten(value, p, o);
			} else {
				if(key === '*') {
					value.forEach(function(config) {
						if(Array.isArray(config.file)) {
							config.file.forEach(function(file) {
								special.push({
									dir: prev,
									config: _.extend({}, config, {
										file: file
									}),
									type: 'wildcard'
								});
							});
						} else {	
							special.push({
								dir: prev,
								config: config,
								type: 'wildcard'
							});
						}
					});
				} else {
					p = vfs.formatPath(p);
					matchs.push(p);
					if(Array.isArray(value)) {
						o[p] = value;
					} else {
						o[p] = [value];
					}
				}
			}
		});

		return o;
	}
	// 通配符处理
	function specialHandler() {

		special.forEach(function(specialData) {
			// 通配符
			if(specialData.type == 'wildcard' && specialData.config.file) {
				var p = vfs.pathResolve(specialData.config.file, specialData.dir);
				p = vfs.formatPath(p);
				var searchDir = path.dirname(p);

				var result = vfs.searchSync(p);

				result.forEach(function(originalFilePath) {
					var targetFilePath = originalFilePath;
					if(specialData.config.hasOwnProperty('rename')) {
						var oldFileName = path.basename(originalFilePath);
						var newFileName = specialData.config.rename.call(null, oldFileName);
						
						if(!newFileName) return;
						targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
					}

					targetFilePath = targetFilePath.replace(searchDir, specialData.dir);
					targetFilePath = path.normalize(targetFilePath);

					if(!config.list[targetFilePath]) {					
						matchs.push(targetFilePath);

						config.list[targetFilePath] = [_.extend({}, specialData.config, {file: originalFilePath})];
					}
				});
			}
		});
	}


	jt.config.base = vfs.formatPath(path.resolve(jt.configDir, jt.config.base));

	config.ignorePath = config.ignorePath || [];

	// 通配符情况处理
	config.list = flatten(config.list || []);
	specialHandler();

})();

module.exports = vfs;