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
compressor.js = function(buffer, callback) {
	var connect = jt.utils.connect(),
		filepath = path.join(jt.cwd, '/tmp/');
		filename = ['file', Math.random()*1000000000000000000 + '.js'],
		fullname = filepath + filename.join('_');

	jt.utils.mkdir(filepath);
	console.log(' '+jt.utils.fill('开始压缩'.green, 60, '=', 'center'));
	//创建临时文件
	connect.use(function(data, next) {
		fs.writeFile(fullname, buffer, function(err) {
			if(err) {
				throw err;
			}
			next(buffer);
		});
	});

	// //压缩开始
	connect.use(function(data, next) {
		var app = jt.utils.do();
		// google closure
		app.do(function(done) {
			var outputFile = filepath + filename.join('_closure_');
			var command = 'java -jar "' + path.normalize(jt.root + '/lib/compressor/libs/goolge-closure-compiler-v20130823.jar"') + ' --js="' + fullname + '" --language_in="ECMASCRIPT3" --js_output_file="' + outputFile + '"';
			exec(command, function(err, data) {
				if(err) {
					throw err;
				}
				fs.readFile(outputFile, function(err, data) {
					if(err) {
						throw err;
					}
					fs.unlink(outputFile);
					console.log(' '+jt.utils.fill('end compress by ' + 'closure'.green, 40 , '.', true) + jt.utils.fill(data.length + 'byte', 20, '.'));
					if(config.gzip) {
						zlib.gzip(data, function(err, gzip) {
							if(err) {
								throw err;
							}
							done({source: data, gzip: gzip});
						});
					} else {
						done(data);
					}
				});
			});
		});
		// jsmin
		app.do(function(done) {
			var data = jsmin(buffer.toString());
			data = new Buffer(data.code);
			console.log(' '+jt.utils.fill('end compress by ' + 'jsmin'.green, 40 , '.', true) + jt.utils.fill(data.length + 'byte', 20, '.'));
			if(config.gzip) {
				zlib.gzip(data, function(err, gzip) {
					if(err) {
						throw err;
					}
					done({source: data, gzip: gzip});
				});
			} else {
				done(data);
			}
		});
		// uglify
		app.do(function(done) {
			var data = uglify(buffer.toString(), {fromString: true});
			data = new Buffer(data.code);
			console.log(' '+jt.utils.fill('end compress by ' + 'uglify'.green, 40 , '.', true) + jt.utils.fill(data.length + 'byte', 20, '.'));
			if(config.gzip) {
				zlib.gzip(data, function(err, gzip) {
					if(err) {
						throw err;
					}
					done({source: data, gzip: gzip});
				});
			} else {
				done(data);
			}
		});
		// yui
		app.do(function(done) {
			yui.compress(fullname, function(err, data, extra) {
				if(err) {
					throw err
				}
				data = new Buffer(data);
				console.log(' '+jt.utils.fill('end compress by ' + 'yui'.green, 40 , '.', true) + jt.utils.fill(data.length + 'byte', 20, '.'));
				if(config.gzip) {
					zlib.gzip(data, function(err, gzip) {
						if(err) {
							throw err;
						}
						done({source: data, gzip: gzip});
					});
				} else {
					done(data);
				}
			});
		});
		app.done(function(closure, jsmmin, uglify, yui) {
			fs.unlink(fullname);
			var datas = [
				{
					name: 'closure',
					code: closure
				},
				{
					name: 'jsmmin',
					code: jsmmin
				},
				{
					name: 'uglify',
					code: uglify
				},				
				{
					name: 'yui',
					code: yui
				}
			];
			if(config.gzip) {
				datas.map(function(value) {
					if(config.gzip) {
						value.gzipSize = value.code.gzip.length;
						value.code = value.code.source;
						value.size = value.code.length;
					} else {
						value.size = value.code.length;
					}
				});
				console.log(' '+jt.utils.fill('compare file size by gzip'.red, 60, '-', 'center'));
			} else {
				console.log(' '+jt.utils.fill('compare file size'.red, 60, '-', 'center'));
			}

			datas.sort(function(a, b) {
				if(config.gzip) {
					return a.gzipSize > b.gzipSize;
				} else {
					return a.size > b.size
				}
			});
			console.log('  最好压缩方式: ' + (datas[0].name).yellow + ', 极限压缩大小: ' + (datas[0].gzipSize || datas[0].size).toString().green + ' byte');
			next(datas[0]);
		});
	});

	connect.fire(function(data) {
		console.log(' '+jt.utils.fill('压缩结束'.green, 60, '=', 'center'));
		console.log('');
		callback(data);
	});
}

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

	buffer = new jt.utils.BufferHelper(s);

	return buffer.toBuffer();
}

/**
 * 清理tmp文件夹
 * @param  {Function} callback 回掉
 */
compressor.clear = function(callback) {
	jt.utils.rmdir(path.join(jt.cwd, 'tmp'), true, function() {
		callback && callback();
	});
}

/**
 * 智能压缩，根据后缀自动判断压缩，不支持类型则返回null
 * @param  {String|Array|Object}   files    压缩文件的路径 or to builder object
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
compressor.compress = function(files, callback) {
	var app = jt.utils.connect(),
		result = [];

	jt.utils.each(files, function(file) {
		app.use(function(data, done) {
			var fileName = path.basename(file);
			if(path.extname(fileName) == '.js') {
				console.log(' '+jt.utils.fill('读取文件'.green, 60, '=', 'center'));
				console.log('   '+file);
				jt.builder.fileGeter(file, function(buffer) {
					compressor.js(buffer, function(buffer) {
						result.push(buffer);
						done();
					});
				});
			} else if(path.extname(fileName) == '.css'){
				console.log(' '+jt.utils.fill('读取文件'.green, 60, '=', 'center'));
				console.log('   '+file);
				jt.builder.fileGeter(file, function(buffer) {
					compressor.css(buffer, function(buffer) {
						result.push(buffer);
						done();
					});
				});
			} else {
				var extend = path.extname(file);
				// 不支持的类型
				console.log('');
				console.log('  压缩文件 "' + file + '" 时发生错误！');
				console.log('  警告:'.yellow + ' 不支持压缩 "' + extend + '" 类型文件!');
				result.push(null);
				done();
			}
		});
	});

	app.fire(function() {
		callback && callback(result);
	});
}
