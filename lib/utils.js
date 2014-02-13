//colors support
require('colors');
/**
 * 继承underscore
 */
(function(e) {
	var mutils = require('mutils');
	
	mutils.extend(e, mutils);
})(exports);
/** 
 * 辅助函数
 */
(function(e) {
	var fs = require('fs'),
		path = require('path');

	function _fill(str, length, ch, left) {
		str = str.toString();
		ch == undefined ? (ch = '') : ch;
		if(str.length < length) {
			var array = new Array(length - str.length);
			if(left == 'center') {
				var l = array.splice((length - str.length)/2);
				array = array.concat([str]);
				array = array.concat(l);
			} else if(left) {
				array.unshift(str);
			} else {
				array.push(str);
			}
			str = array.join(ch);
		}
		return str;
	}


	// 计算相对地址和绝对地址,当前路径按jt.config.builder.basePath计算
	function _realPath(p) {
		return path.resolve(jt.config.builder.base, p);
	}

	e.realPath = _realPath;
	e.fill = _fill;
})(exports);

(function(e) {
	var fs = require('fs'),
		p = require('path');
	function _mkdir(path, basePath) {
		var dirs = path.split(p.sep),
			connect = e.connect();
			
		e.each(dirs, function(value) {
			connect.use(function(data, next) {
				if(!data) {
					// default root
					basePath || (basePath = '/');
					data = p.normalize(basePath);
				}

				data = p.join(data, dirs.shift());

				if(!fs.existsSync(data)) {
					fs.mkdirSync(data);
				}
				next(data);
			});
		});
		connect.fire();
	}

	
	function _rmdir(path, reserve, callback) {
		if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) return;
		var files = fs.readdirSync(path);

		if (files.length) {
			files.forEach(function(file) {
				var fullName = p.join(path, file);
				if (fs.statSync(fullName).isDirectory()) {
					_rmdir(fullName);
				} else {
					fs.unlinkSync(fullName);
				}
			});
		}
		if(!reserve) {
			fs.rmdirSync(path);
		}
		callback && callback();
		return;
	}

	e.rmdir = _rmdir;
	e.mkdir = _mkdir;
})(exports);

/**
 * 格式化http头
 */
(function(e) {
	function _firstWordUp(word) {
		return word.replace(/(\b.)/g, function(d) {
			if(d != '-' ) {
				return d.toUpperCase();
			} else {
				return '-';
			}
		});
	}

	function _formatHeaders(headers) {
		var Headers = {};
		for(var i in headers) {
			Headers[_firstWordUp(i)] = headers[i];
		}
		return Headers;
	}

	e.formatHttpHeader = _formatHeaders;
})(exports);

/**
 * 涓流，继承自双工流
 */
(function(e) {
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
	}

	TrickleStream.prototype._write = function(chunk, encoding, callback) {
		var state = this._trickleState;


		if(!Buffer.isBuffer(chunk)) {
			chunk = new Buffer(chunk, encoding);
		}

		state.buffer = Buffer.concat([state.buffer, chunk]);
		state.bufferLength = state.buffer.length;

		this.emit('writeArrived');
		callback();
	}

	e.TrickleStream = TrickleStream;
})(exports);
