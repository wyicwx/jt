var fs   = require('fs'),
	util = require('util'),
	path = require('path'),
	stream = require('stream'),
	Pipe = require('./pipeline.js'),
	config = jt.config.fs;


var FILEPATHSEARCH = '',
	IGNOREPATH = {},
	EMPTYBUFFER = new Buffer('');

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

function _readSimpleFile(file, callback) {
	if(jt.utils.isString(file)) {
		fs.readFile(file, function(err, buffer) {
			if(err) {
				console.log('['+'warnning'.yellow+'] not found "'+file+'".');
				callback(EMPTYBUFFER);
			} else {
				callback(buffer);
			}
		});
	} else {
		vfs._dredge('__vfs_processor', file, function(data) {
			if(!data || (data == file)) {
				console.log('['+'warnning'.yellow+'] not found processor "'+file.processor+'".');
				callback(EMPTYBUFFER);
			} else {
				if(!Buffer.isBuffer(data)) {
					data = new Buffer(data);
				}
				callback(data);
			}
		});
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

function _search(filename, basePath, callback) {
	var app = jt.utils.do(),
		results = [];

	filename = path.normalize(filename);
	fs.readdir(basePath, function(err, dirs) {
		jt.utils.each(dirs, function(dir) {
			app.do(function(done) {
				var completePath = path.join(basePath, dir);

				// 忽略配置中ignore文件夹
				if(completePath in IGNOREPATH) {
					done();
				}

				fs.stat(completePath, function(err, stat) {
					if(stat.isDirectory()) {
						_search(filename, completePath, function(path) {
							if(path) {
								results = results.concat(path);
							}
							done();
						});
					} else {
						if(completePath.indexOf(filename) != -1) {
							results.push(completePath);
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
			Self.push(data);
			
		});
	} else {
		this.push(null);
	}
};

var vfs = new Pipe();

/**
 * 读取文件并合并文件
 * @param  {String|Array}   filePath 文件路径
 * @param  {Object}   option
 * @return {Buffer} file's buffer
 */
vfs.createReadStream = function(filename) {
	var combos = _map2combo(filename),
		vf;

	vf = new VitrualFile({
		combos: combos
	});

	return vf;
};
vfs.createReadComboStream = vfs.createReadStream;

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
	this._pushPipe('__vfs_processor', function(data, next) {
		if(data.processor == name) {
			handler.call(this, data, next);
		} else {
			this.next(data);
		}
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

	_search(searchValue, jt.config.base, function(data) {
		ret = ret.concat(data);
		callback(ret);
	});
};

vfs.searchVirtual = function(searchValue) {
	var regexp = "[^\\s]*?"+jt.utils.escapeRegExpExpress(searchValue)+"[^\\s]*",
		match;

	match = FILEPATHSEARCH.match(new RegExp(regexp, 'g'));
	return match ? match : [];
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
	filename = _FilenameConvertAndEnsurePathExist(filename);

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
	config.ignorePath.map(function(value, key) {
		config.ignorePath[key] = vfs.pathConverter(value);
	});

	IGNOREPATH = jt.utils.object(config.ignorePath, true);
	FILEPATHSEARCH = jt.utils.keys(config.list).join(' ');
})();

module.exports = vfs;