'use strict';
var fsApi = module.exports = {};
var fs   = require('fs'),
	path = require('path'),
	glob = require('glob'),
	minimatch = require('minimatch'),
	aggre = require('akostream').aggre,
	combine = require('akostream').combine,
	ReadStream = require('../ReadStream.js'),
	_ = require('underscore'),
	config = jt.config.fs;

var matchs = [];


/**
 * 过滤忽略文件
 */
var _filterIgnore = function(files) {
	var ignore = [];

	config.ignorePath.forEach(function(value) {
		value = fsApi.pathResolve(value);

		ignore = ignore.concat(minimatch.match(matchs, value, {}));
		ignore = ignore.concat(glob.sync(value));
	});

	ignore = _.uniq(ignore);

	config.ignorePath = ignore;

	ignore = _.object(ignore, true);
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

/**
 * 读取文件流
 * @param  {String}   filePath 文件路径
 * @return {Stream} 
 */
fsApi.createReadStream = function(filename) {
	var stream = new ReadStream(filename);
	return stream;
};

/**
 * 读取合并文件流
 * @param  {String|Object|Array} options 合并对象
 * @return {Stream} 
 */
fsApi.createReadCombineStream = function(options) {
	if(!options) return;

	if(!Array.isArray(options)) 
		options = [options];

	var combines = [];
	options.forEach(function(file) {
		if(_.isString(file)) {
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
fsApi.readFile = function(filename, callback) {
	var	fileStream;
	if(!filename.pipe) {
		fileStream = fsApi.createReadStream(filename);
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
fsApi.readCombineFile = function(options, callback) {
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
fsApi.search = function(searchValue, callback) {

	var ret = this.searchVirtual(searchValue);

	glob(searchValue, {cwd: jt.config.base}, function(err, data) {
		data = data.map(function(value) {
			return path.resolve(jt.config.base, value);
		});
		data = _filterIgnore(data);
		ret = ret.concat(data);
		ret = _.uniq(ret);
		callback && callback(ret);
	});
};

fsApi.searchSync = function(searchValue) {
	searchValue = this.pathResolve(searchValue, jt.config.base);

	var ret = this.searchVirtual(searchValue);
	var data = glob.sync(searchValue);
	ret = ret.concat(data);
	ret = _.uniq(ret);
	ret = _filterIgnore(ret);
	return ret;
};

fsApi.searchVirtual = function(searchValue) {
	searchValue = this.pathResolve(searchValue, jt.config.base);
	var match = minimatch.match(matchs, searchValue, {});
	match = _filterIgnore(match);

	return match;
};

fsApi.map2local = function(filename, callback) {
	if(fsApi.isVirtual(filename)) {
		var writeStream = fsApi.createWriteStream(filename);
		var readStream = fsApi.createReadStream(filename);

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

fsApi.isVirtual = function(p) {
	return this.pathResolve(p) in config.list;
};

fsApi.existsSync = function(file) {
	file = this.pathResolve(file);
	if(this.isVirtual(file)) {
		return true;
	}
	if(fs.existsSync(file)) {
		return true;
	}
	return false;
};

fsApi.createWriteStream = function(filename) {
	filename = fsApi.pathResolve(filename);

	var fpath;

	fpath = path.dirname(filename);

	if(!fs.existsSync(fpath)) {
		jt.utils.mkdir(fpath);
	}

	return fs.createWriteStream(filename);
};

fsApi.writeFile = function(filename, data, callback) {
	var stream = this.createWriteStream(filename);
	stream.write(data, function() {
		stream.end();
		callback && callback();
	});
};

fsApi.pathResolve = function(filepath, dir) {
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

fsApi.assign = function(name, fn) {
	ReadStream.processor[name] = fn;
};

fsApi.formatPath = function(p) {
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
					p = fsApi.formatPath(p);
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

	function specialHandler() {

	}
	// 通配符处理
	// function specialHandler() {

	// 	special.forEach(function(specialData) {
	// 		// 通配符
	// 		if(specialData.type == 'wildcard' && specialData.config.file) {
	// 			var p = fsApi.pathResolve(specialData.config.file, specialData.dir);
	// 			p = fsApi.formatPath(p);
	// 			var searchDir = path.dirname(p);

	// 			var result = fsApi.searchSync(p);

	// 			result.forEach(function(originalFilePath) {
	// 				var targetFilePath = originalFilePath;
	// 				if(specialData.config.hasOwnProperty('rename')) {
	// 					var oldFileName = path.basename(originalFilePath);
	// 					var newFileName = specialData.config.rename.call(null, oldFileName);
						
	// 					if(!newFileName) return;
	// 					targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
	// 				}

	// 				targetFilePath = targetFilePath.replace(searchDir, specialData.dir);
	// 				targetFilePath = path.normalize(targetFilePath);

	// 				matchs.push(targetFilePath);

	// 				config.list[targetFilePath] = [_.extend({}, specialData.config, {file: originalFilePath})];
	// 			});
	// 		}
	// 	});
	// }


	jt.config.base = fsApi.formatPath(path.resolve(jt.configDir, jt.config.base));

	config.ignorePath = config.ignorePath || [];

	// 通配符情况处理
	config.list = flatten(config.list || []);
	specialHandler();
})();

