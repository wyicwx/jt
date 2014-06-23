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
		console.log('    search ignore path:');

		jt.utils.each(jt.config.fs.ignorePath, function(path) {
			console.log('        %s', path);
		});

		console.log('    [jt server]'.green);
		console.log('    port:');

		jt.utils.each(jt.config.server, function(server) {
			console.log(jt.commander.printfFormat('    %s7: %s', server.port, server.description));
		});
	}
});

jt.commander.version(jt.v);