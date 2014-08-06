'use strict';
jt.commander.command({
	cmd: 'info', 
	description: 'show jt config infomation',
	handler: function() {
		console.log('');
		console.log('    [jt]'.green);
		console.log('    version:');
		console.log('        %s', jt.v);
		console.log('    config path:');
		console.log('        %s', jt.configDir);
		console.log('    [jt fs]'.green);
		console.log('    base path:');
		console.log('        %s', jt.config.base);

		if(jt.config.fs.ignorePath.length) {
			console.log('    search ignore path:');
			jt.utils.each(jt.config.fs.ignorePath, function(path) {
				console.log('        %s', path);
			});
		}

		console.log('    [jt plugins]'.green);
		jt.utils.each(jt.getConfig('plugins'), function(value, key) {
			console.log('        %s', value);
		});
		
	}
});

jt.commander.version(jt.v);