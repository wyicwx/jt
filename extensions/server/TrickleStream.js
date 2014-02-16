/**
 * 涓流，继承自双工流
 */
var Stream = require('stream');
var util = require('util');

util.inherits(TrickleStream, Stream.Duplex);

function State(options) {
	this.trickleSize = options.size;
	this.trickleInterval = options.interval;
	this.writeFinish = false;
	this.bufferLength = 0;
	this.buffer = new Buffer(0);
}

function TrickleStream(options) {
	this._trickleState = new State(options);

	Stream.Duplex.call(this);

	this.on('finish', function() {
		this._trickleState.writeFinish = true;
	});
}

function splice(state, length) {
	var buffer = state.buffer,
		result;

	result = buffer.slice(0, length);

	state.buffer = buffer.slice(length, state.bufferLength);
	state.bufferLength = state.buffer.length;
	return result;
}

function push(stream, state, size) {
	setTimeout(function() {
		var buffer = splice(state, size);
		stream.push(buffer);
	}, state.trickleInterval);
}

TrickleStream.prototype._read = function(n) {
	var state = this._trickleState,
		Self = this;

	if(state.bufferLength >= state.trickleSize) {
		push(Self, state, state.trickleSize);
	} else {
		if(state.writeFinish) {
			if(state.bufferLength) {
				push(Self, state, state.bufferLength);
			} else {
				Self.push(null);
			}
		} else {
			if(state.bufferLength) {
				push(Self, state, state.bufferLength);
			} else {
				function await() {
					Self._read(n);
					Self.removeListener('writeArrived', await);
					Self.removeListener('finish', await);
				}
				Self.once('writeArrived', await);
				Self.once('finish', await);
			}
		}
	}
};

TrickleStream.prototype._write = function(chunk, encoding, callback) {
	var state = this._trickleState;


	if(!Buffer.isBuffer(chunk)) {
		chunk = new Buffer(chunk, encoding);
	}

	state.buffer = Buffer.concat([state.buffer, chunk]);
	state.bufferLength = state.buffer.length;

	this.emit('writeArrived');
	callback();
};

module.exports = TrickleStream;
