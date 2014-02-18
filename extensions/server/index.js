var http = require('http'),
	path = require('path'),
	child_process = require('child_process');


var OPTIONS = [];

function parse() {
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
	if(!jt.utils.isArray(servers)) {
		servers = [servers];
	}

	servers.forEach(function(sv) {
		sv.list = _dealList(sv.list);
		sv.hosts = sv.hosts || {};
		sv.proxy = sv.proxy || {};
		sv.slowSpeedSimulate = sv.slowSpeedSimulate || {};
		OPTIONS.push(sv);
	});
}

// support for commander
(function() {

	jt.commander.define({
		cmd: 'server',
		description: 'start server',
		handler: function() {
			parse();

			require('./server.js')(OPTIONS);
			
		}
	});

	// jt.commander.define({
	// 	cmd: 'check [port],[url]',
	// 	description: 'rule test',
	// 	handler: function(argv) {
	// 		var port = argv[0],
	// 			url = argv[1];

	// 		if(!port) {
	// 			console.log('');
	// 			console.log("    error: command `%s' argument missing", 'check');
	// 			console.log('');
	// 		} else if(port in jt.config.proxy.port) {
	// 			var rule = jt.proxy.formatRule(port);

	// 			if(!url) { // shoe rule list
	// 				console.log('  list:');
	// 				if(jt.utils.size(rule.lists)) {
	// 					jt.utils.each(rule.lists, function(list) {
	// 						console.log('    '+list.originalMatch);
	// 						console.log('    '+list.match);
	// 						console.log('');
	// 					});
	// 				} else {
	// 					console.log('    not list was defined.');
	// 				}

	// 				console.log('  host:');
	// 				if(jt.utils.size(rule.hosts)) {
	// 					jt.utils.each(rule.hosts, function(ip, host, list) {
	// 						var con = '    '+jt.utils.fill(host, 30, ' ', true)+ip;
	// 						console.log(con);
	// 					});
	// 				} else {
	// 					console.log('    not host was defined.');
	// 				}
	// 			} else { // check url
	// 				console.log('');
	// 				if(jt.utils.size(rule.lists)) {
	// 					jt.utils.each(rule.lists, function(list) {
	// 						if(list.match.test(url)) {
	// 							console.log('    '+list.originalMatch);
	// 							console.log('    hit'.green);
	// 						} else {
	// 							console.log(('    '+list.originalMatch).grey);
	// 							console.log('    pass'.grey);
	// 						}
	// 					});
	// 					console.log('');
	// 				} else {
	// 					console.log('    not list was defined.');
	// 				}
	// 			}
	// 		} else {
	// 			console.log('  not found proxy config of '+port);
	// 		}
	// 	}
	// });
})();