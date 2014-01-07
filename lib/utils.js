/**
 * 继承underscore
 */
(function(e) {
	var mutils = require('mutils');
	
	mutils.extend(e, mutils);
})(exports);
/** 
 * 辅助函数
 */
(function(e) {
	var fs = require('fs'),
		path = require('path');

	function _fill(str, length, ch, left) {
		str = str.toString();
		ch == undefined ? (ch = '') : ch;
		if(str.length < length) {
			var array = new Array(length - str.length);
			if(left == 'center') {
				var l = array.splice((length - str.length)/2);
				array = array.concat([str]);
				array = array.concat(l);
			} else if(left) {
				array.unshift(str);
			} else {
				array.push(str);
			}
			str = array.join(ch);
		}
		return str;
	}

	function _log(str) {
		if(!jt.argv['--slient']) {
			console.log(str);
		}
	}

	// 计算相对地址和绝对地址,当前路径按jt.config.builder.basePath计算
	function realPath(p) {
		return path.resolve(jt.config.builder.base, p);
	}

	e.realPath = realPath;
	e.log = _log;
	e.fill = _fill;
})(exports);

(function(e) {
	var fs = require('fs'),
		p = require('path');
	function _mkdir(path, basePath) {
		var dirs = path.split(p.sep),
			connect = e.connect();
			
		e.each(dirs, function(value) {
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

	
	function _rmdir(path, reserve, callback) {
		if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) return;
		var files = fs.readdirSync(path);

		if (files.length) {
			files.forEach(function(file) {
				var fullName = p.join(path, file);
				if (fs.statSync(fullName).isDirectory()) {
					_rmdir(fullName);
				} else {
					fs.unlinkSync(fullName);
				}
			});
		}
		if(!reserve) {
			fs.rmdirSync(path);
		}
		callback && callback();
		return;
	}

	e.rmdir = _rmdir;
	e.mkdir = _mkdir;
})(exports);
