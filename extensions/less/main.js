var less = require('less');
/**
 * less格式化函数
 * example
 * {
 * 	  "processof": "less",
 * 	  "value": "xxx"
 * }
 */
jt.fs.processorDefine('less', function(data, opt, done) {
	less.render(data, function (e, css) {
		if(e) throw e;

		done(css);
	});
});


