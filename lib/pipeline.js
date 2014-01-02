var pipe = module.exports = {};
var hooks = {};

pipe.hook = function(hook, handler) {
	if(!hooks[hook]) {
		hooks[hook] = [];
	}

	hooks[hook].push(handler);
};

pipe.trigger = function(hook, data, callback) {
	if(jt.utils.size(arguments) <= 2) {
		callback = data;
	}
	if(!callback) {
		callback = function() {};
	}
	if(!hooks[hook]) {
		callback(data);
		return;
	}
	var connect = jt.utils.connect();

	connect.use(function(d, next) {
		next(data);
	});

	jt.utils.each(hooks[hook], function(handler) {
		connect.use(handler);
	});

	connect.fire(function(data) {
		callback(data);
	});
};