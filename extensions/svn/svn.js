var Exec = require('child_process').exec;
return;
jt.pipe.hook('jt.compress.before', function(path, next, done) {
	var command = 'svn update ' + jt.config.builder.base;

	console.log('');
	console.log('  start update svn...');
	console.log('');
	Exec(command, function(err, stdout, stderr) {
		
		if(err || stderr) {
			console.log('  请安装subversion并正确配置环境变量.'.red);
		} else {
			console.log(stdout);
			console.log('  update success'.green);
		}
		console.log('');
		next();
	});
});