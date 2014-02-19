var path = require('path'),
	projects  = jt.config.project,
	builder = module.exports = {};


builder.getFilesByProject = function(project) {
	if(builder.hasProject(project)) {
		return projects[project].files;
	}
};

builder.getAllProject = function() {
	return jt.utils.keys(projects);
};

builder.buildStream = function(project) {
	if(builder.hasProject(project)) {
		var filesStream = [];

		projects[project].files.forEach(function(filename) {
			filesStream.push(jt.fs.createReadStream(filename));
		});

		return filesStream;
	} else {
		return null;
	}
};

builder.build = function(project, callback) {
	var files = [],
		app = jt.utils.do();

	if(builder.hasProject(project)) {

		projects[project].files.forEach(function(filename) {
			
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
		if(projectContent.output) {
			projectContent.output = jt.fs.pathConverter(projectContent.output);
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
				console.log('  ' + project + ':');
				builder.getFilesByProject(project).forEach(function(value, key) {
					console.log('    ' + jt.fs.pathConverter(value).yellow);
				});
			} else {
				console.log('');
				console.log('  not found project'+project);
				console.log('');
			}
		} else {
			console.log('');
			console.log('  Projects:');
			jt.utils.each(projects, function(value, key) {
				console.log('    ' + jt.utils.fill(key, 40, ' ', true).yellow + (value.description||''));
			});
			console.log('');
		}
	}

	var buildQueue = [];
	function _COMMAND_build() {
		if(buildQueue.length) {
			var project = buildQueue.shift();
			if(builder.hasProject(project)) {

				var app = jt.utils.do();

				app.do(function(done) {
					console.log('  开始构建 '+project+' 项目!');
					console.log('');
					done();
				});

				var projectObj = projects[project];
				var files = builder.getFilesByProject(project);
				
				var filesStream = builder.buildStream(project);

				filesStream.forEach(function(stream, key) {
					app.do(function(done) {
						var output = projectObj.output,
							filename = files[key],
							writeStream;

						if(output) {
							output = path.join(output, path.basename(filename));
						} else {
							output = filename;
						}

						console.log(('    正在写入: '+output).green);

						writeStream = jt.fs.createWriteStream(output);
						stream.pipe(writeStream, {end: false});
						stream.on('end', function() {
							writeStream.end();
							done();
						});
					});
				});

				app.done(function() {
					console.log('');
					console.log('  构建完成.');
					console.log('');
					_COMMAND_build();
				});
			} else {
				_COMMAND_build();
			}
		}
	}

	jt.commander.define({
		cmd: '-b, --build project [project2] ...',
		description: 'build project',
		handler: function(projects) {
			if(projects.length > 0) {
				buildQueue = projects;
				_COMMAND_build();
			} else {
				console.log('');
				console.log("    error: option `%s' argument missing", '-b, --build');
				console.log('');
			}
		}
	});

	jt.commander.define({
		cmd: '-l, --list [project]',
		description: 'show project\'s list',
		handler: function(projects) {
			_COMMAND_showAllProject(projects[0]);
		}
	});
})();
