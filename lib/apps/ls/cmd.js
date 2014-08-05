'use strict';

var path = require('path');
var fullFile = {};

function aggre() {
	jt.utils.each(jt.config.fs.list, function(value, key)  {
		var paths = key.replace(jt.config.base + path.sep, '').split(path.sep);

		var tmp = fullFile;
		jt.utils.each(paths, function(v, k) {
			if(k == paths.length - 1) { // last
				tmp[v] = null;
			} else {
				tmp[v] = tmp[v] || {};
				tmp = tmp[v];
			}
		});
	});
}

var isLast = [];
var deep = -1;
function tree(stack) {
	deep++;
	isLast[deep] = false;
	var cur = 0;
	jt.utils.each(stack, function(value, key) {
		cur++;

		if(value) {
			console.log('  %s%s', sep() ,key);
			tree(value);
		} else {
			isLast[deep+1] = cur == jt.utils.size(stack);
			console.log('  %s%s', sep(true), key);
		}
	});
	isLast[deep] = true;
	deep--;
}

function sep(file) {
	var str = [];
	for(var i = 0; i <= deep; i++) {
		if(i === 0) {
			if(isLast[i]) {
				str.push('    ');
			} else {
				if(i == deep) {
					str.push('├──');
				} else {
					str.push('├  ');
				}
			}
		} else if(i == deep) {
			if(isLast[i]) {
				str.push('└──');
			} else {
				str.push('├──');
			}
		} else {
			if(isLast[i]) {
				str.push('   ');
			} else {
				str.push('├  ');
			}
		}
	}
	return str.join('');
}

function ls(p) {
	if(p) {
		var cwd = path.resolve(jt.cwd, p);
	} else {
		var cwd = process.cwd();
	}

	jt.fs.search(path.join(cwd, '*'), function(files) {
		var log = [];
		files.forEach(function(file) {
			if(jt.fs.isVirtual(file)) {
				log.push((path.basename(file)+'(v)').green);
			} else {
				log.push(path.basename(file));
			}
		});

		console.log(log.join('    '));
	});
}
		// aggre();
		// show(fullFile);
jt.commander.command({
	cmd: 'ls',
	description: 'show jt virtual file tree',
	handler: function(argv) {
		if(argv['-'][0] == 'tree') {
			aggre();
			tree(fullFile);
		} else {
			ls(argv['-'][0]);
		}
	}
});