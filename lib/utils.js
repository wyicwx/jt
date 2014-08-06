'use strict';
//colors support
require('colors');
var fs = require('fs'),
	path = require('path');

/**
 * 继承underscore
 */
(function(e) {
	var _ = require('underscore');

	_.extend(e, _);
})(exports);

(function(e) {
	function _mkdir(dirpath, mode) {
		dirpath = path.normalize(dirpath);

		var exists = fs.existsSync(dirpath);

		if (!exists) {
			//尝试创建父目录，然后再创建当前目录
			_mkdir(path.dirname(dirpath), mode);
			fs.mkdirSync(dirpath, mode);
		}
	};

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
