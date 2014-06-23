'use strict';
//colors support
require('colors');
/**
 * 继承underscore
 */
(function(e) {
	// var _ = require('underscore');

	// _.extend(e, _);
	var mutils = require('mutils');
	
	mutils.extend(e, mutils);
})(exports);

(function(e) {
	var fs = require('fs'),
		p = require('path');
	function _mkdir(path, basePath) {
		var dirs = path.split(p.sep),
			connect = e.connect();
			
		e.each(dirs, function() {
			connect.use(function(data, next) {
				if(!data) {
					// default root
					basePath || (basePath = '/');
					data = p.normalize(basePath);
				}

				data = p.join(data, dirs.shift());

				if(!fs.existsSync(data)) {
					fs.mkdirSync(data);
				}
				next(data);
			});
		});
		connect.fire();
	}

	// function _rmdir(path, reserve, callback) {
	// 	if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) return;
	// 	var files = fs.readdirSync(path);

	// 	if (files.length) {
	// 		files.forEach(function(file) {
	// 			var fullName = p.join(path, file);
	// 			if (fs.statSync(fullName).isDirectory()) {
	// 				_rmdir(fullName);
	// 			} else {
	// 				fs.unlinkSync(fullName);
	// 			}
	// 		});
	// 	}
	// 	if(!reserve) {
	// 		fs.rmdirSync(path);
	// 	}
	// 	if(callback) {
	// 		callback();
	// 	}
	// 	callback && callback();
	// 	return;
	// }

	function _escapeRegExpExpress(str) {
		var match = ['\\\\','\\.','\\?','\\+','\\$','\\^','\\/','\\{','\\}','\\,','\\)','\\(','\\=','\\!','\\*'].join('|');
		str = str.replace(new RegExp(match, 'gi'), function(value) {
			return '\\' + value;
		});
		return str;
	}

	e.escapeRegExpExpress = _escapeRegExpExpress;
	// e.rmdir = _rmdir;
	e.mkdir = _mkdir;
})(exports);
