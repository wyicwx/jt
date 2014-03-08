var Pipe = require('./pipeline.js'),
	Commander = require('cmd-interface').Commander,
	commander = module.exports = new Commander();

(function() {
	commander.command({
		cmd: 'info', 
		description: 'show jt config infomation',
		handler: function(opt, argv) {
			console.log('');
			console.log('  [jt]'.green);
			console.log('  version:');
			console.log('    '+jt.v);
			console.log('  config path:');
			console.log('    '+jt.cwd);
			console.log('  [jt fs]'.green);
			console.log('  base path:');
			console.log('    '+jt.config.base);
			console.log('  search ignore path:');

			jt.utils.each(jt.config.fs.ignorePath, function(path) {
				console.log('    '+path);
			});

			console.log('  [jt server]'.green);
			console.log('  port:');

			jt.utils.each(jt.config.server, function(server) {
				console.log('    '+jt.utils.fill(server.port, 7, ' ', true)+': '+ server.description);
			});
			console.log('  [jt compressor]'.green);
			console.log('    gzip   : '+!!jt.config.compressor.gzip);
			console.log('  [jt extension]'.green);
			jt.utils.each(jt.extensions, function(pkg, name) {
				if(!!pkg.path.indexOf(jt.root)) {
					console.log('    name   : '+pkg.name);
					if(pkg.description) {
						console.log('    description: '+pkg.description);
					}
					console.log('    version: '+pkg.version);
					console.log('    path   : '+pkg.path);
					console.log('');
				}
			});
			console.log('');
		}
	});

	commander.version(jt.v);


	// option['-u, --upload [file1],[file2],...'] = 'compress andy upload file';
})();