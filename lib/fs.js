var fs   = require('fs'),
	util = require('util'),
	path = require('path'),
	stream = require('stream'),
	Pipe = require('./pipeline.js'),
	config = jt.config;


var FILEPATHSEARCH = '';

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
			if(combo in config.fs) {
				if(ignore[combo]) {
					ret.push(combo);
				} else {
					ignore[combo] = true;
					ret = ret.concat(_map2combo(config.fs[combo], ignore));
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
				console.log('['+'warnning'.yellow+'] not found "'+file+'", return "".');
				callback(new Buffer(' '));
			} else {
				callback(buffer);
			}
		});
	} else {
		vfs._dredge('__vfs_processor', file, function(data) {
			if(!data || (data == file)) {
				console.log('['+'warnning'.yellow+'] not found processor "'+file.processor+'", return "".');
				data = ' ';
			}
			if(!Buffer.isBuffer(data)) {
				data = new Buffer(data);
			}
			callback(data);
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
			Self.push(data);
		});
	} else {
		this.push(null);
	}
}

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

vfs.readFile = function(filename, callback) {
	var readStream,
		rets = [];

	readStream = vfs.createReadStream(filename);

	readStream.on('data', function(data) {
		rets.push(data);
	});

	readStream.on('end', function() {
		callback(Buffer.concat(rets));
	});
};
vfs.readComboFile = vfs.readFile;

vfs.processorDefine = function(name, handler) {
	this._pushPipe('__vfs_processor', function(data, next) {
		if(data.processor == name) {
			handler.apply(this, arguments);
		} else {
			// next();
			this.next(data);
		}
	});
};

vfs.pathConverter = function(p) {
	if(arguments.length > 1) {
		return path.resolve.apply(path, arguments);
	} else {
		return path.resolve(config.base, p);
	}
};


/**
 * 判断是否在虚拟文件系统内
 * @param  {string}  p 路径，相对的或者绝对的
 * @return {Boolean}   [description]
 */
vfs.isVirtual = function(p) {
	return this.pathConverter(p) in config.fs;
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
	config.base = vfs.pathConverter(jt.cwd, config.base);
	config.fs = _flatten(config.fs, config.base);
})();

module.exports = vfs;