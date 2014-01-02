/**
 * 提供自定义builder函数的支持
 * @param  {Builder} builder Builder对象
 */
function exSupport(builder) {
	var processor = builder.processor = {},
		_processor = {};

	processor.define = function(name, handler) {
		_processor[name] = handler;
	}
	processor.do = function(name, option, callback) {
		if(!_processor[name]) {
			console.log('warning: '.red + '没有' + (name).yellow + '这个处理函数');
			process.exit(0);
		}
		var st = Date.now();
		_processor[name](option, function(data) {
			// 统一插件返回格式，格式化成buffer
			if(jt.utils.isString(data)) {
				data = new jt.utils.BufferHelper(data);
				data = data.toBuffer();
			}
			callback(data)
		});
	}
}

module.exports = exSupport;


