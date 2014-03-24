var path = require('path'),
	projects  = jt.config.project,
	builder = module.exports = {};

var resolved = {};
builder.getFilesByProject = function(project) {
	if(builder.hasProject(project)) {
		if(!resolved[project]) {
			var ret = [];
			projects[project].files.forEach(function(value) {
				ret = ret.concat(jt.fs.searchSync(value));
			});
			projects[project].files = ret;
			resolved[project] = true;
		}
		return jt.utils.clone(projects[project].files);
	}
	return null;
};

builder.getAllProject = function() {
	return jt.utils.keys(projects);
};

builder.buildStream = function(project) {
	if(builder.hasProject(project)) {
		var filesStream = [];

		builder.getFilesByProject(project).forEach(function(filename) {
			filesStream.push(jt.fs.createReadStream(filename));
		});

		return filesStream;
	} else {
		return null;
	}
};

builder.build2local = function(project, callback) {
	if(builder.hasProject(project)) {
		var app = jt.utils.do();

		builder.getFilesByProject(project).forEach(function(filename) {
			app.do(function(done) {
				var isMapping = jt.fs.map2local(filename, function() {
					done();
				});
				if(!isMapping) {
					done();
				}
			});
		});

		app.done(function() {
			callback && callback();
		});
		return true;
	} else {
		return null;
	}
};

builder.build = function(project, callback) {
	var files = [],
		app = jt.utils.do();

	if(builder.hasProject(project)) {

		builder.getFilesByProject(project).forEach(function(filename) {
			app.do(function(done) {
				jt.fs.readFile(filename, function(buffer) {
					files.push(buffer);
					done();
				});
			});

		});

		app.done(function() {
			callback && callback(files);
		});
		return true;
	} else {
		return false;
	}
};

builder.hasProject = function(project) {
	if(project in projects) {
		return true;
	} else {
		return false;
	}
};

// 格式化所有文件路径
(function() {
	jt.utils.each(projects, function(projectContent, project) {
		if(!Array.isArray(projectContent.files)) {
			projectContent.files = [projectContent.files];
		}
		projectContent.files.map(function(filename, key) {
			projectContent.files[key] = jt.fs.pathConverter(filename);
		});
	});
})();

(function() {
	function _COMMAND_showAllProject(project) {
		if(project) {
			if(builder.hasProject(project)) {
				console.log('');
				console.log('    ' + project + ':');
				builder.getFilesByProject(project).forEach(function(value, key) {
					console.log('    %s', value);// + jt.fs.pathConverter(value).yellow);
				});
				console.log('');
			} else {
				console.log('');
				console.log('    not found project %s.', project);
				console.log('');
			}
		} else {
			console.log('');
			console.log('    Projects:');
			jt.utils.each(projects, function(value, key) {
				console.log(jt.commander.printfFormat('        %s40%s', key, value.description));
			});
			console.log('');
		}
	}

	var buildQueue = [];
	function _COMMAND_build() {
		if(buildQueue.length) {
			var project = buildQueue.shift();
			if(builder.hasProject(project)) {

				console.log('  开始构建 '+project+' 项目!');
				console.log('');

				var projectObj = projects[project];
				var files = builder.getFilesByProject(project);
				
				files.forEach(function(value) {
					console.log(('    正在写入: '+value).green);
				});

				builder.build2local(project, function() {
					console.log('');
					console.log('  构建完成.');
					console.log('');
					_COMMAND_build();
				});
			} else {
				console.log('');
				console.log('    not found project %s.', project);
				console.log('');
				_COMMAND_build();
			}
		}
	}

	function _COMMADN_build_files(files) {
		var ret = [];
		files.forEach(function(file) {
			var result = jt.fs.searchSync(file);
			if(result.length) {
				ret = ret.concat(result);
			} else {			
				console.log('    [%s] not found %s !', 'warning'.red, file);
			}
		});

		if(ret.length == 1) {
			console.log('');
			build();
		} else if(ret.length > 1) {
			console.log('');
			console.log('    选择构建文件:');
			ret = jt.utils.uniq(ret);
			jt.commander.choose(ret, function(data) {
				console.log('');
				if(data.length) {
					ret = data;
					build();
				} else {
					console.log('    build cancel!');
				}
			});
		}

		function build() {
			var file = ret.shift();
			if(file) {
				console.log('    building %s.', file);
				jt.fs.map2local(file, function() {
					build();
				});
			} else {
				console.log('');
				console.log('    build all done.');
			}
		}
	}

	jt.commander.command({
		cmd: 'build',
		description: 'build project',
	});

	jt.commander.on('build', function(argv) {
		if(argv.l) {
			var projects = argv.l;
			_COMMAND_showAllProject(projects[0]);
		} else if(argv.f) { // 指定文件build
			if(argv.f.length) {
				var files = argv.f;
				_COMMADN_build_files(files);
			} else {
				console.log('');
				console.log("    Usage: ");
				console.log("        jt build -f file [,file1 [,file2 .....]] ");
				console.log('');
				console.log("    Example: ");
				console.log("        jt build -f build/file.js");
				console.log("        jt build -f build/file.js build/css.css build/image.jpg");
				console.log('');
			}
		} else if(argv['-'].length) { // 指定project
			buildQueue = argv['-'];
			_COMMAND_build();
		} else { // help
			console.log('');
			console.log("    Usage: ");
			console.log("        jt build [-option] project [file....]");
			console.log('');
			console.log("    Example: ");
			console.log("        jt build project [,project1 [,project2...]]");
			console.log("        jt build -l [project]");
			console.log("        jt build -f file [,file1 [,file2 .....]] ");
			console.log('');
		}
	});
})();
