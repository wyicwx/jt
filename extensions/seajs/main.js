/**
 * define包装字符串
 * example
 * {
 * 	  "processof": "seajs-define-string",
 * 	  "value": "xxx",
 * 	  "name": "abc"
 * }
 */
jt.fs.processorDefine('seajs-define-string', function(data, opt, done) {
	data = data.replace(/'/g, "\\'").replace(/"/g, '\\"'); 
	data = 'define("'+opt.name+'", "'+data+'");';
	done(data);
});