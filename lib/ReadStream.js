var path = require('path'),
	fs = require('fs'),
	origin = require('akostream').origin,
	aggre = require('akostream').aggre,
	combine = require('akostream').combine,
	config = jt.config.fs;

function ReadStream(filename, quote) {
	if(!filename) {
		return combine();
	}
	filename = jt.fs.pathResolve(filename);

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
		// 数组类型的file,对每一个都解析
		if(Array.isArray(item.file)) {
			var files = [];
			item.file.forEach(function(file) {
				var tmp = ReadStream.searchPath(file, item.dir);

				files = files.concat(tmp);
			});

			item.file = files;
		} else if(jt.utils.isString(item.file)) {
			// 正常路径，单独解析
			var tmp = ReadStream.searchPath(item.file, item.dir);
			item.file = tmp;
		}
	}
	// 支持task
	if(item.task) {
		var task = jt.task.getTask(item.task);

		if(task) {
			item.processor = jt.utils.clone(task.processor) || [];

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


module.exports = ReadStream;