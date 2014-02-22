var fs 	   = require('fs'),
	path   = require('path'),
	jsmin  = require('jsmin2'),
	uglify = require('uglify-js').minify,
	util   = require('util'),
	events = require('events'),
	exec   = require('child_process').exec,
	yui    = require('yuicompressor'),
	zlib   = require('zlib'),
	config = jt.config.compressor;

function Compressor() {
	events.EventEmitter.call(this);
}
util.inherits(Compressor, events.EventEmitter);

var compressor = module.exports = new Compressor();
/**
 * 最小化压缩js，传入buffer保存为临时文件，压缩后读 取文件buffer，删除临时文件
 * @param {Buffer} buffer file buffer
 * @param {Object} 
 *        {
 *        	
 *        }
 */
compressor.bestjs = function(buffer, callback) {

	var app = jt.utils.do();
	// // google closure
	// app.do(function(done) {
	// 	var outputFile = filepath + filename.join('_closure_');
	// 	var command = 'java -jar "' + path.normalize(jt.root + '/lib/compressor/libs/goolge-closure-compiler-v20130823.jar"') + ' --js="' + fullname + '" --language_in="ECMASCRIPT3" --js_output_file="' + outputFile + '"';
	// 	exec(command, function(err, data) {
	// 		if(err) {
	// 			throw err;
	// 		}
	// 		fs.readFile(outputFile, function(err, data) {
	// 			if(err) {
	// 				throw err;
	// 			}
	// 			fs.unlink(outputFile);
	// 			console.log(' '+jt.utils.fill('end compress by ' + 'closure'.green, 40 , '.', true) + jt.utils.fill(data.length + 'byte', 20, '.'));
	// 			if(config.gzip) {
	// 				zlib.gzip(data, function(err, gzip) {
	// 					if(err) {
	// 						throw err;
	// 					}
	// 					done({source: data, gzip: gzip});
	// 				});
	// 			} else {
	// 				done(data);
	// 			}
	// 		});
	// 	});
	// });
	// jsmin
	app.do(function(done) {
		var data = jsmin(buffer.toString()),
			ret;

		data = new Buffer(data.code);
		ret = {
			name: 'jsmin',
			buffer: data,
			size: data.length
		};
		if(config.gzip) {
			zlib.gzip(data, function(err, gzip) {
				if(err) {
					throw err;
				}
				ret.gzip = gzip;
				ret.gzipSize = gzip.length;
				done(ret);
			});
		} else {
			done(ret);
		}
	});
	// uglify
	app.do(function(done) {
		var data = uglify(buffer.toString(), {fromString: true}),
			ret;

		data = new Buffer(data.code);
		ret = {
			name: 'uglify',
			buffer: data,
			size: data.length
		};
		if(config.gzip) {
			zlib.gzip(data, function(err, gzip) {
				if(err) {
					throw err;
				}
				ret.gzip = gzip;
				ret.gzipSize = gzip.length;
				done(ret);
			});
		} else {
			done(ret);
		}
	});
	// yui
	app.do(function(done) {
		yui.compress(buffer.toString(), function(err, data, extra) {
			if(err) {
				throw err
			}
			data = new Buffer(data);

			var ret = {
				name: 'yui',
				buffer: data,
				size: data.length
			};
			
			if(config.gzip) {
				zlib.gzip(data, function(err, gzip) {
					if(err) {
						throw err;
					}
					ret.gzip = gzip;
					ret.gzipSize = gzip.length;
					done(ret);
				});
			} else {
				done(ret);
			}
		});
	});

	app.done(function() {
		var result = jt.utils.toArray(arguments);

		result.sort(function(a, b) {
			if(config.gzip) {
				return a.gzipSize > b.gzipSize;
			} else {
				return a.size > b.size
			}
		});		
		callback(result[0].buffer, result[0], result);
	});
};

compressor.js = function(buffer, callback) {
	var ret = uglify(buffer.toString(), {fromString: true});

	buffer = new Buffer(ret);

	callback(buffer);
};
/**
 * 最小化压缩css
 * @return {[type]} [description]
 */
compressor.css = function(buffer, callback) {
	var s = buffer.toString();

	s = s.replace(/\/\*(.|\n)*?\*\//g, ""); //删除注释
	s = s.replace(/\s*([\{\}\:\;\,])\s*/g, "$1");
	s = s.replace(/\,[\s\.\#\d]*\{/g, "{"); //容错处理
	s = s.replace(/;\s*;/g, ";"); //清除连续分号
	s = s.match(/^\s*(\S+(\s+\S+)*)\s*$/); //去掉首尾空白
	s = (s == null) ? "" : s[1];

	buffer = new Buffer(s);
	callback(buffer);
};

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
	jt.commander.define({
		cmd: '-c, --compress [file/project]...',
		description: 'js/css file minify compress',
		handler: function() {
			console.log(arguments);
			return;
			if(jt.utils.size(jt.argv.compress)) {
				jt.builder.finder(jt.argv.compress, {
					project: false,
					pathFile: true
				},function(filePaths) {
					if(filePaths.pathFile.length) {
						console.log('');
						console.log('  查找到以下文件:');
						filePaths.pathFile.forEach(function(value, key) {
								console.log(('    ['+key+'] ').red+ value.green);
						});
						jt.utils.read('  输入需要压缩的文件，使用","分割', function(data) {
							if(!data) {
								console.log('');
								console.log('  压缩中断!');
								return;
							}
							var index = data.split(','),
								files;

							files = jt.utils.pick(filePaths.pathFile, index);
							files = jt.utils.values(files);
							
							if(!files.length) return;
							jt.pipe.trigger('jt.compress.before', files,function() {
								jt.compressor.compress(files, function(data) {
									var saveInfo = {};
									jt.utils.each(files, function(path, key) {
										// 重命名
										var aliasnName = path.replace(/(\w+?)$/, 'min.$1');

										if(data[key] && data[key].code) {
											saveInfo[aliasnName] = data[key].code;
										} else {
											saveInfo[aliasnName] = null;
										}
									});
									// 保存下来
									jt.builder.save(saveInfo, {
										endCallback: function() {
										}
									});
								});
							});
						});
					} else {
						console.log('sorry,没有找到任何文件!');
					}
				});
			} else {
				console.log('');
				console.log("    error: option `%s' argument missing", '-c, --compress');
				console.log('');
			}
		}
	});
})();
