'use strict';
var path = require('path');
var task = jt.getConfig('task');


jt.commander.command({
	cmd: 'task',
	description: 'run task'
});
// help
jt.commander.on('task', function(argvs) {
	if(jt.utils.size(argvs) == 1 && !argvs['-'].length) {
		console.log('');
		console.log('    Usage:');
		console.log('        jt task [taskname] file[, file[, file[, ...]]]');
		console.log('');
		console.log('    Task:');
		jt.utils.each(task, function(t, name) {
			var processors = t.processor || [];

			console.log('        %s: %s', name, processors.join(' > '));
		});
	}
});

// auto run task and out put file
jt.commander.on('task', function(argvs) {
	var output = argvs.o || argvs.output;

	if(argvs['-'].length) {
		if(output) {
			runTask(argvs['-'], output);
		}
	}
});

// basic task
jt.commander.on('task', function(argvs) {
	var task = argvs['-'].shift();

	if(argvs['-'].length) {
		runTask(task, argvs['-']);
	}
});

function checkTaskAvaild(task) {
	var task = jt.task.getTask(task);

	if(!task) {
		return false;
	}
	return true;
}

function checkFileAvaild(files) {
	var result = [];
	files.forEach(function(file) {
		var tmp;
		file = path.resolve(jt.cwd, file);
		if(jt.fs.existsSync(file)) {
			tmp = [file];
		} else {
			tmp = jt.fs.searchSync(file);
		}
		
		if(!tmp.length) {
			console.log('    [%s] Not found %s !', 'warning'.yellow, file);
		} else {
			result = result.concat(tmp);
		}
	});
	if(!result.length) {
		return false;
	} else {
		return result;
	}
}

function runTask(task, files, output) {
	if(!checkTaskAvaild(task)) {
		throw new Error('  task '+task+' was not assign!');
	}
	files = checkFileAvaild(files);

	if(files) {
		files.forEach(function(file) {
			var rStream = jt.fs.createReadCombineStream({
				file: file,
				task: task
			});
			var extname = path.extname(file);
			var newname = file.replace(new RegExp(extname+'$'), '.'+task+extname);
			var wStream = jt.fs.createWriteStream(newname);

			rStream.pipe(wStream, {
				end: false
			});
			rStream.on('end', function() {
				console.log('  [task] %s : write into %s!', task, newname);
				wStream.end();
			});
		});
	}
}