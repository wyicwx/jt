var fs 	   = require('fs'),
	path   = require('path'),
	util   = require('util'),
	zlib   = require('zlib'),
	through = require('through2'),
	config = jt.config.compressor;

var compressor = jt.compressor = {};

var processor = {};

jt.fs.assign('Minifyjs', function(options, info) {
	var compress = [];
	options = options || {};
	return through(function(buffer, encoding, callback) {
		jt.utils.each(config, function(module, name) {
			var item = {
				name: name,
				doned: false,
				data: null,
			}
			
			var serial = compress.push(item)-1;

			var handler = jt.require(module);
			var stream = handler();
			stream.pipe(through(function(buffer, encoding, callback) {
				if(options.gzip) {
					zlib.gzip(buffer, function(err, gzip) {
						if(err) {
							throw err;
						}
						item.data = {buffer: buffer, gzip: gzip};
					});
				} else {
					item.data = {buffer: buffer};
				}
			}));
			stream.write(buffer);
			stream.end();
			stream.on('end', function() {
				if(!item.data) {
					compress[serial] = null;
				}
				item.doned = true;
				end();
			});
		});

		function end() {
			var allDoned = true;
			compress.forEach(function(item) {
				if(item && !item.doned) {
					allDoned = false;
				}
			});
			if(allDoned) {
				compress = jt.utils.compact(compress);
				compress = compress.sort(function(a, b) {
					var property = 'buffer';
					if(config.gzip) {
						property = 'gzip';
					}
					
					return a.data[property].length > b.data[property].length;
				});
				callback(null, compress[0].data.buffer);
			}
		}
	});
});

(function() {
	function _compress(files, gzip, out) {
		var ret = [];
		files.forEach(function(file) {
			var result = jt.fs.searchSync(file);
			if(result.length) {
				ret = ret.concat(result);
			} else {
				console.log('    [%s] not found %s !', 'warning'.red, file);
			}
		});

		ret.forEach(function(file) {
			var ext = path.extname(file);
			if(ext == '.js') {
				input = file;
				output = file.replace(new RegExp(ext+'$'), '.min'+ext);

				if(out && out[0]) {
					output = path.join(jt.fs.pathResolve(out[0], path.basename(output)));
				}

				var stream = jt.fs.createReadCombineStream({
					processor: 'Minifyjs',
					file: input,
					Minifyjs: {
						gzip: !!gzip,
						log: true
					}
				});

				var destStream = jt.fs.createWriteStream(output);
				stream.pipe(destStream);
				destStream.on('finish', function() {
					console.log('    [%s] success write into %s', 'doned'.green, output);
				});
			} else {
				console.log('    [%s] not support compress for %s', 'warning'.red, file);
			}
		});
	}

	function _compressProject(projects) {
		projects.forEach(function(project) {
			var files = jt.builder.getFilesByProject(project);

			_compress(files);
		});
	}

	jt.commander.command({
		cmd: 'compress',
		description: 'js/css file minify compress',
		handler: function(argv) {
			if(argv.f) {
				if(argv.f && argv.f.length) {
					_compress(argv.f, argv.gzip, argv.out);
				} else {
					console.log('');
					console.log("    Usage: ");
					console.log("        jt compress -f file [,file1 [,file2 .....]] ");
					console.log('');
					console.log("    Example: ");
					console.log("        jt compress -f compress/file.js");
					console.log("        jt compress -f compress/file.js compress/new/file.js ");
					console.log("        jt compress -f compress/file.js --out=dest --gzip");
					console.log('');
				}
			} else if(argv['-'].length) {
				_compressProject(argv['-']);
			} else {
				console.log('');
				console.log("    Usage: ");
				console.log("        jt compress [-option] project [file....]");
				console.log('');
				console.log("    Example: ");
				console.log("        jt compress project [,project1 [,project2...]]");
				console.log("        jt compress -f file [,file1 [,file2 .....]] ");
				console.log("        jt compress -f file --out=dest --gzip");
				console.log('');
			}
		}
	});
})();
