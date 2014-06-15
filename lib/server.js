var http = require('http'),
	path = require('path'),
	mime = require('mime'),
	url = require('url'),
	delay = require('akostream').delay,
	trickle = require('akostream').trickle;

var server = module.exports = {};

function setup() {

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
		var newList = [], tmp;
		for(var i in list) {
			tmp = jt.utils.clone(list[i]);
			tmp['match'] = _parse(i);
			tmp['original'] = i;
			// 对象则调用
			if(!jt.utils.isArray(tmp.respond)) {				
				tmp.respond = tmp.respond ? [tmp.respond] : [];
			}
			newList.push(tmp);
		}
		return newList;
	}

	var servers = jt.config.server;

	servers.list = _dealList(servers.list);
}

setup();

server.getMatchRule = function(port) {
	var sev = jt.getConfig('server'),
		ret = [];

	sev.list.forEach(function(item) {
		ret.push(item.match);
	});
	return ret;
};



