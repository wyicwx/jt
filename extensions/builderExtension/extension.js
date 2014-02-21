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
// 字符串支持
jt.fs.processorDefine('string', function(data, next) {
	next(data.value);
});
// html2String
jt.fs.processorDefine('Html2String', function(data, next, done) {
	var filename = path.join(data.dir, data.value);
	jt.fs.readFile(filename, function(data) {
		data = _escapeHtml(data.toString());
		next(data);
	});
});

// defineHtml
jt.fs.processorDefine('defineHtml', function(data, done) {
	var dir = path.join(data.dir, data.value);
	jt.fs.readFile(dir, function(buffer) {
		html = _escapeHtml(buffer.toString());

		data = 'define("'+data.name+'", "'+html+'");';
		done(data);
	});
});