var builder = jt.builder;
var path = require('path');
var projects  = jt.config.project;


function showAllProject(project) {
	if(project) {
		if(builder.hasProject(project)) {
			console.log('');
			console.log('    ' + project + ':');
			builder.getFilesByProject(project).forEach(function(value, key) {
				console.log('    %s', value);
			});
			console.log('');
		} else {
			console.log('');
			console.log('    [%s] Not found project %s.', 'warning'.yellow, project);
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
function build() {
	if(buildQueue.length) {
		var project = buildQueue.shift();
		if(builder.hasProject(project)) {

			console.log('    Start build '+project+' project!');
			console.log('');

			var projectObj = projects[project];
			var files = builder.getFilesByProject(project);
			
			files.forEach(function(value) {
				if(jt.fs.isVirtual(value)) {
					console.log('        Write into %s', value.toString().green);
				}
			});

			builder.build2local(project, function() {
				console.log('');
				console.log('    Build done.');
				console.log('');
				build();
			});
		} else {
			console.log('');
			console.log('    [%s] Not found project %s.', 'warning'.yellow, project);
			console.log('');
			build();
		}
	}
}

function buildFiles(files) {
	var ret = [];
	files.forEach(function(file) {
		var filepath = path.resolve(jt.cwd, file),
			result;
		// 模拟原生命令,相对运行命令路径解析相对路径
		if(jt.fs.existsSync(filepath)) {
			result = [filepath];
		} else {
			result = jt.fs.searchSync(file);
		}
		if(result.length) {
			ret = ret.concat(result);
		} else {			
			console.log('    [%s] Not found %s !', 'warning'.yellow, file);
		}
	});

	if(ret.length == 1) {
		console.log('');
		build();
	} else if(ret.length > 1) {
		console.log('');
		console.log('    Which files to build?');
		ret = jt.utils.uniq(ret);
		jt.commander.choose(ret, function(data) {
			console.log('');
			if(data.length) {
				ret = data;
				build();
			} else {
				console.log('    Build cancel!');
			}
		});
	}

	function build() {
		var file = ret.shift();
		if(file) {
			console.log('    Start build %s.', file);
			jt.fs.map2local(file, function() {
				build();
			});
		} else {
			console.log('');
			console.log('    Build all done.');
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
		showAllProject(projects[0]);
	} else if(argv.f) { // 指定文件build
		if(argv.f.length) {
			var files = argv.f;
			buildFiles(files);
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
		build();
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
