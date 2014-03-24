var fs 	   = require('fs'),
	path   = require('path'),
	util   = require('util'),
	zlib   = require('zlib'),
	through = require('through2'),
	config = jt.config.compressor;

var compressor = jt.compressor = {};

var processor = {};

/**
 * 最佳压缩最小化压缩js，传入buffer保存为临时文件，压缩后读 取文件buffer，删除临时文件
 * @param {Buffer} buffer file buffer
 * @param {Object} 
 *        {
 *        	
 *        }
 */
jt.fs.assign('Minifyjs', function(options, info) {
	var objStream = through.obj();
	var compress = [];
	objStream.on('data', function(obj) {
		obj.push(obj);
		if(compress.length == jt.utils.size(config)) {
			objStream.end();
		}
		console.log(obj);
	});
	options = options || {};
	return through(function(buffer, encoding, callback) {
		jt.utils.each(config, function(module, name) {
			var handler = jt.require(module);
			var stream = handler();
			stream.pipe(through(function(buffer, encoding, callback) {
				if(options.gzip) {
					zlib.gzip(buffer, function(err, data) {
						if(err) {
							throw err;
						}
						callback(null, {name: name, buffer: buffer, gzip: gzip});
					});
				} else {
					callback(null, {name: name, buffer: buffer});
				}
			})).pipe(objStream);
			stream.write(buffer, function() {
				stream.end();
			});
		});

		objStream.on('end', function() {

		});
	});           
});
function bestJs(buffer, callback) {
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

	jt.commander.command({
		cmd: 'compress',
		description: 'js/css file minify compress',
		handler: function(argv) {
			if(argv['f']) {
				if(argv['f'] && argv['f'].length) {

				} else {

				}
			} else if(argv['-'].length) {
				if(argv['-'].length > 0) {

				} else {

				}
			} else {
				console.log('');
				console.log("    help: -c[--compress] file [file1]... ");
				console.log('');
			}
		}
	});
})();
