'use strict';
var zlib   = require('zlib'),
	through = require('through2');

function _compress(type) {
	var config = jt.config.compressor[type];
	return function(options) {
		if(!config || !jt.utils.size(config)) {
			throw new Error('Not found compress for '+type);
		}
		var compress = [];
		options = options || {};
		return through(function(buffer, encoding, callback) {
			jt.utils.each(config, function(module, name) {
				var item = {
					name: name,
					doned: false,
					data: null,
				};
				
				compress.push(item);
				var handler = jt.require(module);
				var stream = handler();
				var dest = through(function(buffer, encoding, callback) {
					if(options.gzip) {
						zlib.gzip(buffer, function(err, gzip) {
							if(err) {
								throw err;
							}
							item.data = {buffer: buffer, gzip: gzip};
							callback(null, null);
						});
					} else {
						item.data = {buffer: buffer};
						callback(null, null);
					}
				});
				stream.pipe(dest);
				stream.write(buffer);
				stream.end();
				dest.resume();
				dest.on('end', function() {
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
						if(!a.data) {
							return true;
						}
						if(!b.data) {
							return false;
						}
						return a.data[property].length > b.data[property].length;
					});
					callback(null, compress[0].data.buffer);
				}
			}
		});
	};
}

jt.fs.assign('Minifyjs', _compress('js'));
jt.fs.assign('Minifycss', _compress('css'));