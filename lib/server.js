var http = require('http'),
	path = require('path'),
	mime = require('mime'),
	url = require('url'),
	delay = require('akostream').delay,
	trickle = require('akostream').trickle;

var server = module.exports = {};
var OPTIONS = [];

function _init() {
	if(OPTIONS.length) {
		return;
	}

	function _parse(str) {
		var tmp = str.split(/(?=\()|(?=\))/g),
			strDealed = '', count = 0;

		tmp.forEach(function(value) {
			if(value[0] == '(') {
				strDealed += value;
				count += 1;
			} else if(value[0] == ')') {
				count -= 1;
				if(count > 0) {
					strDealed += value;
				} else {
					strDealed += ')';
					strDealed += jt.utils.escapeRegExpExpress(value.slice(1));
				}
			} else {
				strDealed += jt.utils.escapeRegExpExpress(value);
			}
		});

		tmp = new RegExp(strDealed);
		return tmp; 
	}

	function _dealList(list) {
		var newList = [], tmp, respond;
		for(var i in list) {
			tmp = jt.utils.clone(list[i]);
			tmp['match'] = _parse(i);
			tmp['original'] = i;
			// 对象则调用
			if(!jt.utils.isArray(tmp.respond)) {
				tmp.respond = [tmp.respond];
			}
			newList.push(tmp);
		}
		return newList;
	}

	var servers = jt.config.server;

	servers.forEach(function(sv) {
		sv.list = _dealList(sv.list);
		sv.hosts = sv.hosts || {};
		sv.proxy = sv.proxy || {};
		sv.slowSpeedSimulate = sv.slowSpeedSimulate || {};
		OPTIONS.push(sv);
	});
}

server.getMatchRule = function(port) {
	var sev,
		ret = [];

	for(var i in OPTIONS) {
		if(OPTIONS[i].port == port) {
			sev = OPTIONS[i];
			break;
		}
	}

	if(sev) {
		sev.list.forEach(function(item) {
			ret.push(item.match);
		});
		return ret;
	}
};
// 格式化
(function() {
	if(!jt.utils.isArray(jt.config.server)) {
		jt.config.server = [jt.config.server];
	}
	_init();
})();

