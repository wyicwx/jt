var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

require('./_common.js');
var builder = jt.builder;

describe('jt.builder', function() {
	it('#getFilesByProject()', function() {
		var files = builder.getFilesByProject('Aproject');
		if(jt.config.project.Aproject.files.length == files.length) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});

	it('#getAllProject()', function() {
		var projects = builder.getAllProject();

		if(projects.length == jt.utils.size(jt.config.project)) {
			assert.ok(true);
		} else {
			assert.ok(false);
		}
	});

	it('#hasProject()', function() {
		if(builder.hasProject('Aproject')) {
			assert.ok(true);
		}

		if(builder.hasProject('')) {
			assert.ok(false);
		}

		if(builder.hasProject('AprojectA')) {
			assert.ok(false);
		}
	});

	describe('#build()', function() {
		it('it has data return true, return false by not data', function() {
			var returnA = builder.build('Aproject');
			var returnB = builder.build('AAproject');

			if(returnA === true && returnB === false) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('build回调返回对应文件', function(done) {
			builder.build('Aproject', function(datas) {
				if(datas.length == builder.getFilesByProject('Aproject').length) {
					done();
				} else {
					done(false);
				}
			});
		});
	});

	describe('#buildStream()', function() {
		it('it has project return array, return null by not project', function() {
			var returnA = builder.buildStream('Aproject');
			var returnB = builder.buildStream('AAproject');
			var returnC = builder.buildStream('Bproject');

			if(jt.utils.isArray(returnA) && jt.utils.isArray(returnC) && jt.utils.isNull(returnB)) {
				if(returnA.length && !returnC.length) {
					assert.ok(true);
					return;
				}
			}
			assert.ok(false);
		});

		it('it return a count stream', function(done) {
			var ret = builder.buildStream('Aproject');
			var app = jt.utils.do();

			ret.forEach(function(stream) {
				app.do(function(done) {
					stream.resume();
					
					stream.on('end', function() {
						done();
					});
				});
			});

			app.done(function() {
				done();
			});

		});
	});

	describe('#build2local()', function() {
		it('本地有生成对应的映射列表里的文件', function(done) {
			jt.builder.build2local('Cproject', function() {
				var files = jt.builder.getFilesByProject('Cproject');
				var has = true;
				files.forEach(function(file) {
					if(jt.fs.isVirtual(file)) {
						if(fs.existsSync(file)) {
							fs.unlinkSync(file);
						} else {
							has = false;
						}
					}
				});

				if(has) {
					done();
				} else {
					done(false);
				}
			});
		});

		it('没有找到相应project返回null，并且不会触发callback', function(done) {
			var triggedCallback = false;
			var d = jt.builder.build2local('Nullproject', function() {
				triggedCallback = true;
			});

			if(!d) {
				setTimeout(function() {
					if(triggedCallback) {
						done(false);
					} else {
						done();
					}
				}, 2000);
			} else {
				done(false);
			}
		});
	});

	describe('支持glob语法', function() {
		it('globProject有3个文件', function() {
			var files = jt.builder.getFilesByProject('globProject');
			if(files.length == 3) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});
	});
	describe('commander', function() {
		it('-l, --list', function() {
			jt.commander.run(['--list']);
			jt.commander.run(['--list', 'Aproject']);
			jt.commander.run(['--list', 'nnnnProject']);
		});

		it('-b, --build', function(done) {
			jt.commander.run(['--build', 'Cproject', 'nnnnProject']);
			jt.commander.run(['--build']);
			setTimeout(function() {
				var files = jt.builder.getFilesByProject('Cproject');
				var has = true;
				files.forEach(function(file) {
					if(jt.fs.isVirtual(file)) {
						if(fs.existsSync(file)) {
							fs.unlinkSync(file);
						} else {
							has = false;
						}
					}
				});

				if(has) {
					done();
				} else {
					done(false);
				}
			}, 1000);

		});
	});


});