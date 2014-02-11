var util = require('util');

function Pipe() {
	this._pipes = {};
}

Pipe.prototype.define = function() {
	this._pushPipe.apply(this, arguments);
};

Pipe.prototype._pushPipe = function(name, handler) {
	if(!this._pipes[name]) {
		this._pipes[name] = [];
	}
	this._pipes[name].push(handler);
};

Pipe.prototype._dredge = function(name, data, callback) {
	var Self = this,
		pipes = this._pipes[name];

	if(jt.utils.size(arguments) <= 2) {
		callback = data;
	}
	if(!callback) {
		callback = function() {};
	}
	if(!pipes) {
		callback(data);
		return;
	}

	var connect = jt.utils.connect();

	connect.use(function(d, next, done) {
		next(data);
	});

	jt.utils.each(pipes, function(handler) {
		connect.use(handler);
	});

	connect.fire(function(data) {
		callback(data);
	});
};


module.exports = Pipe;