var fs   = require('fs'),
	util = require('util'),
	path = require('path'),
	stream = require('stream'),
	Pipe = require('./pipeline.js'),
	config = jt.config;


/**
 * 预处理,格式化配置文件内路径
 */
(function() {
	config.base = path.resolve(jt.cwd, config.base);

	function flatten(obj, prev, o) {
		prev = prev || '';
		o = o || {};

		jt.utils.each(obj, function(value, p) {
			p = path.join(prev, p);
			if(jt.utils.isArray(value)) {
				o[p] = value;
			} else if(jt.utils.isObject(value)) {
				flatten(value, p, o);
			} else {
				o[p] = value;
			}
		});

		return o;
	}

	config.fs = flatten(config.fs, config.base);
})();



util.inherits(VitrualFile, stream.Readable);
function VitrualFile(options) {
	stream.Readable.call(this, options);
}

VitrualFile.prototype._read = function() {

}


var vfs = new Pipe();

/**
 * 读取文件并合并文件
 * @param  {String|Array}   filePath 文件路径
 * @param  {Object}   option
 * @return {Buffer} file's buffer
 */
vfs.createReadStream = function(filepath) {
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

vfs.isVirtual = function() {

};

vfs.save = function(filePath, encoding) {

	var fpath = path.dirname(filePath),
		writeStream;

	if(!fs.existsSync(fpath)) {
		jt.utils.mkdir(fpath);
	}

	writeStream = fs.createWriteStream(filePath, {
		encoding: encoding || 'utf8'
	});

	return writeStream;
};
/**
 * 解析相对地址为绝对地址,根目录以jt.config.base计算
 * @param  {String} p 相对路径
 * @return {String}   绝对路径
 */
exports.realPath = function(p) {
	return path.resolve(jt.config.base, p);
}



/**
 * 文件读取
 * @return {Buffer}
 */
function _fileGeter(filePath, callback) {
	if(fs.existsSync(filePath)) {	//绝对路径文件
		fs.readFile(filePath, function(err, buffer) {
			callback(buffer);
		});
	} else {
		var rePath = jt.utils.realPath(filePath);
		if(fs.existsSync(rePath)) {	//相对路径文件
			fs.readFile(rePath, function(err, buffer) {
				callback(buffer);
			});
		} else {   //不存在这个文件,输出警告log
			console.log('['+'warnning'.yellow+'] not found "'+rePath+'", return "".');
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
vfs.fileGeter = function(filePaths, callback) {
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