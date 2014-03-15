var fs   = require('fs'),
	util = require('util'),
	path = require('path'),
	stream = require('stream'),
	Pipe = require('./pipeline.js'),
	minimatch = require('minimatch'),
	combine = require('akoStream').combine,
	through = require('through2'),
	glob = require('glob'),
	gulp = require('gulp'),
	vinyl = require('vinyl'),
	config = jt.config.fs;


var EMPTYBUFFER = new Buffer('');
var FILES;

var vfsPipe = new Pipe();

function _flatten(obj, prev, o) {
	prev = prev || '';
	o = o || {};

	jt.utils.each(obj, function(value, p) {
		p = path.join(prev, p);
		var dir = path.dirname(p);
		if(jt.utils.isArray(value)) {
			o[p] = [];
			jt.utils.each(value, function(file) {
				if(jt.utils.isString(file)) {
					var realpath = vfs.pathConverter(dir, file);
					o[p].push(realpath);
					return;
				}
				if(file.file) {
					file.file = vfs.pathConverter(dir, file.file);
				}
				o[p].push(file);
			});
		} else if(jt.utils.isObject(value)) {
			_flatten(value, p, o);
		} else {
			value = vfs.pathConverter(dir, value);
			o[p] = [value];
		}
	});

	return o;
}

function _map2combo(paths, ignore) {
	var ret = [];

	ignore = ignore || {};
	if(!jt.utils.isArray(paths)) {
		paths = [paths];
	}
	jt.utils.each(paths, function(combo) {
		if(jt.utils.isString(combo)) {
			combo = vfs.pathConverter(combo);
			if(combo in config.list) {
				if(ignore[combo]) {
					ret.push(combo);
				} else {
					ignore[combo] = true;
					_map2combo(config.list[combo], ignore).forEach(function(item) {
						if(jt.utils.isObject(item)) {
							item.dir = item.dir || path.dirname(combo);
						}
						ret.push(item);
					});
				}
				return;
			}
		}
		ret.push(combo);
	});
	return ret;
}

function _(options) {
	var processors = [];
	if(!Array.isArray(options.processor)) {
		options.processor = [options.processor];
	}

	options.processor.forEach(function(value) {
		try {
			processors.push([value, require(value)]);
		} catch(e) {
			console.log('  ['+'warnning'.yellow+'] not find module "'+value+'".');
		}
	});

	var src = options.file;
	var ret = src;
	processors.forEach(function(p) {
		var handler = p[1],
			name = p[0];

		if(!ret) {
			ret = handler(options[name]);
		} else {
			ret = ret.pipe(handler(options[name]));
		}
	});

	return ret;
}

function _readSimpleFile(file) {
	if(jt.utils.isString(file)) {
		return gulp.src(file);
		// fs.readFile(file, function(err, buffer) {
		// 	if(err) {
		// 		console.log('['+'warnning'.yellow+'] not found "'+file+'".');
		// 		callback(EMPTYBUFFER);
		// 	} else {
		// 		callback(buffer);
		// 	}
		// });
	} else {
		var option = jt.utils.clone(file);

		if(option.file) { //data, opt, done
			option.file = vfs.createReadStream(option.file);
		}
		return _(option);
		// 	vfs.readFile(option.file, function(buffer) {
		// 		option.value = buffer;
		// 		_(option.processor, option, callback);
		// 	});
		// } else {
		// 	_(option.processor, option, callback);
		// }
	}
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

util.inherits(VitrualFile, stream.Readable);
function VitrualFile(options) {
	this._queueFile = options.combos || [];
	stream.Readable.call(this, options);
}

VitrualFile.prototype._read = function() {
	var file,
		Self = this;
	file = this._queueFile.shift();
	if(file) {
		_readSimpleFile(file, function(data) {
			// 空数据push到会导致不再次触发readable，手动跳过
			if(!data.length) {
				Self._read();
				return;
			}
			if(Self._queueFile.length) {
				data = Buffer.concat([data, new Buffer('\n')]);
			}
			Self.push(data);
			
		});
	} else {
		this.push(null);
	}
};

function _combine(combines) {
	var toCombine = [];

	combines.forEach(function(file) {
		toCombine.push(_readSimpleFile(file).pipe(through.obj(function(file, encoding, callback) {
			callback(null, file.contents);
		})));
	});

	return combine(toCombine);
}
var vfs = {};

/**
 * 读取文件并合并文件
 * @param  {String|Array}   filePath 文件路径
 * @param  {Object}   option
 * @return {Buffer} file's buffer
 */
vfs.createReadStream = function(filename) {
	var combines = _map2combo(filename),
		vf;

	return _combine(combines);
	// vf = new VitrualFile({
	// 	combos: combos
	// });

	// return vf;
};

vfs.readStream = function(stream, callback) {
	var rets = [];

	stream.on('data', function(data) {
		rets.push(data);
	});

	stream.on('end', function() {
		callback(Buffer.concat(rets));
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

vfs.processorDefine = function(name, handler) {
	vfsPipe._pushPipe(name, function(data, next) {
		handler.call(this, data.value.toString(), data, function(buffer) {
			if(!Buffer.isBuffer(buffer)) {
				buffer = new Buffer(buffer);
			}
			data.value = buffer;
			next(data);
		});
	});
};

vfs.pathConverter = function(p) {
	if(arguments.length > 1) {
		return path.resolve.apply(path, arguments);
	} else {
		return path.resolve(jt.config.base, p);
	}
};

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

function _filterIgnore(files) {
	return files.filter(function(file) {
		for(var i in jt.config.fs.ignorePath) {
			if(files.indexOf(jt.config.fs.ignorePath[i]) !== -1) return false;
		}
		return true;
	});
}


vfs.searchVirtual = function(searchValue) {
	var match = minimatch.match(FILES, searchValue, {});
	match = _filterIgnore(match);

	match = jt.utils.uniq(match);
	return match;
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

vfs.find = function() {
};

vfs.findVirtual = function(filename) {

};

/**
 * 判断是否在虚拟文件系统内
 * @param  {string}  p 路径，相对的或者绝对的
 * @return {Boolean}   [description]
 */
vfs.isVirtual = function(p) {
	return this.pathConverter(p) in config.list;
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


/**
 * 预处理,格式化配置文件内路径
 */
(function() {
	jt.config.base = vfs.pathConverter(jt.cwd, jt.config.base);

	config.list = config.list || [];
	config.ignorePath = config.ignorePath || [];

	config.list = _flatten(config.list, jt.config.base);
	config.ignorePath = config.ignorePath.map(function(value, key) {
		return vfs.pathConverter(value);
	});

	jt.config.fs = config;

	FILES = jt.utils.keys(config.list);
})();

// fs处理器扩展
(function() {
	// 字符串支持
	vfs.processorDefine('string', function(data, opt, next) {
		next(data);
	});
	
})();

module.exports = vfs;