'use strict';
var path = require('path');

function compress(files, gzip, out) {
	var ret = [];
	files.forEach(function(file) {
		var result = jt.fs.searchSync(file);
		if(result.length) {
			ret = ret.concat(result);
		} else {
			console.log('    [%s] Not found %s !', 'warning'.yellow, file);
		}
	});

	if(ret.length == 1) {
		c();
	} else if(ret.length > 1) {
		console.log('');
		console.log('    which files to compress?');
		jt.commander.choose(ret, function(data) {
			console.log('');	
			if(data.length) {
				ret = data;
				c();
			} else {
				console.log('    build cancel!');
			}
		});
	} else if(!ret.length) return;

	function c() {
		ret.forEach(function(file) {
			var ext = path.extname(file);
			if(ext == '.js') {
				var input = file;
				var output = file.replace(new RegExp(ext+'$'), '.min'+ext);

				if(out && out[0]) {
					output = path.join(jt.fs.pathResolve(out[0]), path.basename(output));
				}

				var stream = jt.fs.createReadCombineStream({
					processor: 'Minifyjs',
					file: input,
					Minifyjs: {
						gzip: !!gzip,
						log: true
					}
				});

				var destStream = jt.fs.createWriteStream(output);
				stream.pipe(destStream);
				destStream.on('finish', function() {
					console.log('    [%s] Success write into %s', 'doned'.green, output);
				});
			} else {
				console.log('    [%s] Not support compress for %s', 'warning'.yellow, file);
			}
		});
	}	
}

function compressProject(projects) {
	projects.forEach(function(project) {
		var files = jt.builder.getFilesByProject(project);

		compress(files);
	});
}

jt.commander.command({
	cmd: 'compress',
	description: 'js/css file minify compress',
	handler: function(argv) {
		if(argv.f) {
			if(argv.f && argv.f.length) {
				compress(argv.f, argv.gzip, argv.out);
			} else {
				console.log('');
				console.log('    Usage: ');
				console.log('        jt compress -f file [,file1 [,file2 .....]] ');
				console.log('');
				console.log('    Example: ');
				console.log('        jt compress -f compress/file.js');
				console.log('        jt compress -f compress/file.js compress/new/file.js ');
				console.log('        jt compress -f compress/file.js --out=dest --gzip');
				console.log('');
			}
		} else if(argv['-'].length) {
			compressProject(argv['-']);
		} else {
			console.log('');
			console.log('    Usage: ');
			console.log('        jt compress [-option] project [file....]');
			console.log('');
			console.log('    Example: ');
			console.log('        jt compress project [,project1 [,project2...]]');
			console.log('        jt compress -f file [,file1 [,file2 .....]] ');
			console.log('        jt compress -f file --out=dest --gzip');
			console.log('');
		}
	}
});
