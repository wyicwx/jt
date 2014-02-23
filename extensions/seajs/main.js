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

/**
 * define包装函数
 * example
 * {
 * 	  "processof": "seajs-define-function",
 * 	  "value": "xxx",
 * 	  "name": "abc"
 * }
 */
jt.fs.processorDefine('seajs-define-function', function(data, opt, done) {
	data = 'define("'+opt.name+'", function(require, export, module) {\n'+data+'\n});';
	done(data);
});