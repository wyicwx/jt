var path = require('path');

function _escapeHtml(str) {
	str = str.toString()
			 .replace(/(\n|\r)/g, "") //del \n
			 .replace(/>([\x20\t]+)</g, "><") //del blank & tab
			 .replace(/<!--.+?-->/g, "") // del comment
			 .replace(/^\s+|\s+$/g, "") // trim blank
			 .replace(/'/g, "\\'") //
			 .replace(/"/g, '\\"');   
	return str;
}

function _compressCss(s) {
	s = s.replace(/\/\*(.|\n)*?\*\//g, ""); //删除注释
	s = s.replace(/\s*([\{\}\:\;\,])\s*/g, "$1");
	s = s.replace(/\,[\s\.\#\d]*\{/g, "{"); //容错处理
	s = s.replace(/;\s*;/g, ";"); //清除连续分号
	s = s.match(/^\s*(\S+(\s+\S+)*)\s*$/); //去掉首尾空白
	return (s == null) ? "" : s[1];
}
// 字符串支持
jt.pipe.hook('jt.fileGeter', function(data, next, done) {
	if(jt.utils.isObject(data)) {
		if(data.processor == 'string') {
			done(data.value);
			return;
		}
	}
	next(data);
});
// html2String
jt.pipe.hook('jt.fileGeter', function(data, next, done) {
	if(jt.utils.isObject(data)) {
		if(data.processor == 'Html2String') {
			var dir = path.join(data.dir, data.value);
			jt.builder.fileGeter(dir, function(data) {
				data = _escapeHtml(data.toString());
				done(data);
			});
			return;
		}
	}
	next(data);
});
// defineHtml
jt.pipe.hook('jt.fileGeter', function(data, next, done) {
	if(jt.utils.isObject(data)) {
		if(data.processor == 'defineHtml') {
			var dir = path.join(data.dir, data.value);
			jt.builder.fileGeter(dir, function(buffer) {
				html = _escapeHtml(buffer.toString());

				data = 'define("'+data.name+'", "'+html+'")';
				done(data);
			});
			return;
		}
	}
	next(data);
});
// defineCss
jt.pipe.hook('jt.fileGeter', function(data, next, done) {
	if(jt.utils.isObject(data)) {
		if(data.processor == 'defineCss') {
			var dir = path.join(data.dir, data.value);
			jt.builder.fileGeter(dir, function(buffer) {
				html = _compressCss(buffer.toString());

				data = 'define("'+data.name+'", "'+html+'")';
				done(data);
			});
			return;
		}
	}
	next(data);
});