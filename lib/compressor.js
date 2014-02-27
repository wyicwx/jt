var fs 	   = require('fs'),
	path   = require('path'),
	util   = require('util'),
	zlib   = require('zlib'),
	Pipe   = require('./pipeline.js'),
	config = jt.config.compressor;

var pipe = new Pipe();
var compressor = module.exports = {};

compressor.defineJsProcessor = function(name, handler) {
	pipe._pushPipe(name, function(data, done) {
		handler(data, function(result) {
			var ret;

			if(!Buffer.isBuffer(result)) {
				result = new Buffer(result);
			}

			ret = {
				name: name,
				buffer: result,
				size: result.length
			};

			if(config.gzip) {
				zlib.gzip(result, function(err, gzip) {
					if(err) {
						throw err;
					}
					ret.gzip = gzip;
					ret.gzipSize = gzip.length;
					done(ret);
				});
				return;
			}
			done(ret);
		});
	});
};

/**
 * 最佳压缩最小化压缩js，传入buffer保存为临时文件，压缩后读 取文件buffer，删除临时文件
 * @param {Buffer} buffer file buffer
 * @param {Object} 
 *        {
 *        	
 *        }
 */
compressor.bestJs = function(buffer, callback) {
	var c = jt.utils.keys(pipe._pipes);
	pipe._multiPipe(c, buffer, function(rets) {
		var result = rets.sort(function(a, b) {
			if(config.gzip) {
				return a.gzipSize > b.gzipSize;
			} else {
				return a.size > b.size
			}
		});
		callback(result[0].buffer, result[0], result);
	});
};

/**
 * 使用uglify压缩js
 * @param  {[type]}   buffer   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
compressor.js = function(buffer, callback) {
	var now = Date.now();
	pipe._flowPipe('uglify', buffer, function(result) {
		callback(result[0].buffer);
	});
	
};
/**
 * 压缩css
 * @return {[type]} [description]
 */
compressor.css = function(buffer, callback) {
	var s = buffer.toString();

	s = s.replace(/\/\*(.|\n|\r)*?\*\//g, ""); //删除注释
	s = s.replace(/\s*([\{\}\:\;\,])\s*/g, "$1");
	s = s.replace(/\,[\s\.\#\d]*\{/g, "{"); //容错处理
	s = s.replace(/;\s*;/g, ";"); //清除连续分号
	s = s.trim(); //去掉首尾空白

	buffer = new Buffer(s);
	callback(buffer);
};
/**
 * 压缩html(去空格，换行)
 * @return {[type]} [description]
 */
compressor.html = function(buffer, callback) {
	var str = buffer.toString();

	str = str.toString()
			 .replace(/(\n|\r)/g, "") //del \n
			 .replace(/>([\x20\t]+)</g, "><") //del blank & tab
			 .replace(/<!--.+?-->/g, "") // del comment
			 .replace(/^\s+|\s+$/g, "") // trim blank
	
	buffer = new Buffer(str);

	callback(buffer);
};

// fs处理器扩展
(function() {
	jt.fs.processorDefine('compressCss', function(data, opt, done) {
		compressor.css(data, function(result) {
			done(result);
		});
	});

	jt.fs.processorDefine('compressHtml', function(data, opt, done) {
		compressor.html(data, function(result) {
			done(result);
		});
	});

	jt.fs.processorDefine('compressJs', function(data, opt, done) {
		compressor.js(data, function(result) {
			done(result);
		});
	});
})();

(function() {
	function _COMMAND_Search(files) {
		var app = jt.utils.do();

		files.forEach(function(file) {
			app.do(function(done) {
				jt.fs.search(files[0], function(rets) {
					done(rets);
				});
			});
		});

		app.done(function() {
			var results = jt.utils.toArray(arguments);

			results = jt.utils.flatten(results);
			results = jt.utils.uniq(results);

			_askToCompress(results);
		});
	}

	function _askToCompress(files) {
		if(files.length) {
			console.log('');
			console.log('  将要开始压缩以下文件:');
			files.forEach(function(value, key) {
				console.log(('    ['+(key+1)+'] ').red+ value.green);
			});
			jt.utils.read('  输入序号取消压缩相应文件用","分割 or 取消压缩(n)', function(data) {
				var ignore = {};

				if(data) {
					if(data.toLowerCase() == 'n') return;
					ignore = jt.utils.object(data.split(','), true);
				}
				console.log('');
				console.log('  开始压缩.');
				console.log('');
				var app = jt.utils.do();

				files.forEach(function(file, key) {
					if((key+1) in ignore) return;
					app.do(function(done) {
						var ext = path.extname(file);
						if(ext == '.js') {						
							_compressJs(file);
						} else if(ext == '.css') {
							_compressCss(file);
						}
					});
				});
			});
		} else {
			console.log('');
			console.log('  没有找到相关文件！');
		}
	}

	function _compressJs(file, callback) {
		jt.fs.readFile(file, function(buffer) {
			compressor.bestJs(buffer, function(buffer, best, all) {
				console.log('  压缩文件 '+file);
				console.log('');
				var wenan;

				wenan = '  极限压缩方式: ';
				wenan+= best.name;
				console.log(wenan.green);
				wenan = '  极限压缩大小' + (config.gzip?'(gzip)':'') + ': ';
				wenan+= config.gzip? best.gzipSize : best.size;
				console.log(wenan.green);
				// console.log('');
				console.log(jt.utils.fill('  +[压缩详情]', 50, '-', true));
				all.forEach(function(item) {
					wenan = jt.utils.fill('  +  压缩方式: '+item.name, 30, ' ', true);
					wenan+= '压缩大小' + (config.gzip?'(gzip)':'') + ': ';
					wenan+= config.gzip? item.gzipSize : item.size;
					console.log(wenan);
				});
				console.log(jt.utils.fill('  +[正在写入]', 50, '-', true));
				file = _write(file, buffer);
				console.log('  +  '+file);
				console.log(jt.utils.fill('  +[压缩结束]', 50, '-', true));
			});
		});
	}

	function _compressCss(file, callback) {
		jt.fs.readFile(file, function(buffer) {
			compressor.css(buffer, function(buffer) {
				console.log('  压缩文件 '+file);
				console.log('');
				console.log('  压缩大小 '+buffer.length);
				console.log(jt.utils.fill('  +[正在写入]', 50, '-', true));
				file = _write(file, buffer);
				console.log('  +  '+file);
				console.log(jt.utils.fill('  +[压缩结束]', 50, '-', true));
			});
		});
	}
	function _write(file, buffer) {
		var ext, writeStream;

		ext = path.extname(file);
		file = file.replace(new RegExp(ext+'$'), '.min'+ext);
		
		writeStream = jt.fs.createWriteStream(file);
		writeStream.write(buffer);
		writeStream.end();

		return file;
	}

	jt.commander.define({
		cmd: '-c, --compress [file]...',
		description: 'js/css file minify compress',
		handler: function(files) {
			if(files.length) {
				_COMMAND_Search(files);
			} else {
				console.log('');
				console.log("    error: option `%s' argument missing", '-c, --compress');
				console.log('');
			}
			return;
		}
	});
})();
