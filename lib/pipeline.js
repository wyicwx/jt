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

Pipe.prototype._flowPipe = function(name, data, callback) {
	var Self = this,
		pipes;

	pipes = _getPipe(name, Self);

	if(jt.utils.size(arguments) <= 2) {
		callback = data || _emptyFn;
		data = null;
	}
	
	if(!pipes) callback(data);

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

Pipe.prototype._multiPipe = function(name, data, callback) {
	var Self = this,
		pipes;

	pipes = _getPipe(name, Self);

	if(jt.utils.size(arguments) <= 2) {
		callback = data || _emptyFn;
		data = null;
	}
	
	if(!pipes) return false;

	var app = jt.utils.do();

	jt.utils.each(pipes, function(handler) {
		app.do(function(done) {
			handler(data, done);
		});
	});
	

	app.done(function() {
		callback(jt.utils.toArray(arguments));
	});
};

function _getPipe(name, Self) {
	var pipes;
	if(typeof name == 'string') {
		pipes = Self._pipes[name];
	} else {
		for(var i in name) {
			if(Self._pipes[name[i]]) {
				if(!pipes) pipes = [];
				pipes = pipes.concat(Self._pipes[name[i]]);
			}
		}
	}

	return pipes;
}

function _emptyFn() {}
module.exports = Pipe;