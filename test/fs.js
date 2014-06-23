'use strict';
var assert = require('assert'),
	fs = require('fs'),
	path = require('path');

var through = require('through2');
var aggre = require('akostream').aggre;

require('./_common.js');

describe('jt.fs', function() {
	describe('#预处理', function() {
		it('jt.config.fs.list需要格式化成完整路径', function() {
			['c.js', 'd.js', 'e.js', 'f.js', 'g.js', 'h.js', 'i.js'].forEach(function(name) {
				if(path.join(jt.config.base, 'fs/'+name) in jt.config.fs.list) {
					assert.ok(true);
				} else {
					assert.ok(false);
				}
			});
		});
	});

	describe('#createReadStream()', function() {
		it('空参数创建的流,一定会触发end事件', function(done) {
			var stream = jt.fs.createReadStream();

			stream.resume();
			stream.on('end', function() {
				done();
			});
		});

		it('返回流对象', function() {
			var stream = jt.fs.createReadStream();
			var methods = ['read', 'resume', 'pause', 'pipe'];

			for(var i in methods) {
				if(!stream[methods[i]]) {
					assert.ok(false);
				}
			}
			assert.ok(true);
		});

		it('读取空文件,一定会触发end事件', function(done) {
			var stream = jt.fs.createReadStream('fs/null.js');
			stream.on('data', function() {
				done(false);
			});
			stream.on('end', function() {
				done();
			});
		});

		it('读取c.js, c.js由a.js和b.js合并而成，是否合并', function(done) {
			var stream = jt.fs.createReadStream('fs/c.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				var a = fs.readFileSync(path.join(jt.root, 'test/fs/a.js'));
				var b = fs.readFileSync(path.join(jt.root, 'test/fs/b.js'));
				var ret = Buffer.concat([a, b]);
				if(chunk.toString() == ret.toString()) {
					done();
				} else {
					done(true);
				}
			});
		});

		it('读取a.js文件，等价于fs.readFile的结果', function(done) {
			var stream = jt.fs.createReadStream('fs/a.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				var a = fs.readFileSync(path.join(jt.root, 'test/fs/a.js'));

				if(chunk.toString() == a) {
					done();
				} else {
					done(true);
				}
			});
		});

		it('process内不存在file或者value时应该报错', function() {
			assert.throws(function() {
				jt.fs.createReadStream('fs/h.js');
			});
		});
	});

	describe('#createReadCombineStream()', function() {
		it('混合类型支持', function(done) {
			var stream = jt.fs.createReadCombineStream([
				'fs/i.js',
				{
					processor: 'string',
					value: 'test'
				}
			]);

			aggre(stream).on('data', function(buffer) {
				if(buffer.toString() == 'stringtest') {
					done();
				} else {
					done(false);
				}
			});
		});
	});

	describe('#readFile()', function() {
		it('结果等价于createReadStream', function(done) {
			var stream = jt.fs.createReadStream('fs/c.js');
			var chunk = [];

			stream.on('data', function(data) {
				chunk.push(data);
			});

			stream.on('end', function() {
				chunk = Buffer.concat(chunk);
				jt.fs.readFile('fs/c.js', function(data) {
					if(chunk.toString() == data.toString()) {
						done();
					} else {
						done(true);
					}
				});
			});
		});

		it('读取file文件内容', function(done) {
			jt.fs.readFile('fs/j.js', function(data) {
				if(data.toString() == 'string') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('读取流文件', function(done) {
			var stream = jt.fs.createReadStream('fs/c.js');

			jt.fs.readFile(stream, function(buffer) {
				jt.fs.readFile('fs/c.js', function(buffer1) {
					if(buffer.toString() == buffer1.toString()) {
						done();
					} else {
						done(false);
					}
				});
			});
		});
	});

	describe('#writeFile()', function() {
		it('自动创建文件夹', function(done) {
			jt.fs.writeFile('fs/mkdir/write/file.js', 'test', function() {
				var p = jt.fs.pathResolve('fs/mkdir/write');

				var stats = fs.statSync(p);
				fs.unlinkSync(jt.fs.pathResolve('fs/mkdir/write/file.js'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir/write'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir'));
				if(stats.isDirectory()) {
					done();
				} else {
					done(false);
				}
			});
		});

		it('正确写入文件', function(done) {
			jt.fs.writeFile('fs/mkdir1/write1/file1.js', 'test', function() {
				var content = fs.readFileSync(jt.fs.pathResolve('fs/mkdir1/write1/file1.js'));

				fs.unlinkSync(jt.fs.pathResolve('fs/mkdir1/write1/file1.js'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir1/write1'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir1'));
				if(content.toString() == 'test') {
					done();
				} else {
					done(false);
				}
			});
		});
	});

	describe('#createWriteStream()', function() {
		it('返回可写流对象', function(done) {
			var stream = jt.fs.createWriteStream('fs/mkdir2/write2/file2.js');
			var avail = true;

			['write', 'end', 'writable'].forEach(function(value) {
				if(!stream.hasOwnProperty(value) && !stream[value]) {
					avail = false;
				}
			});
			stream.write('test', function() {
				stream.end();

				fs.unlinkSync(jt.fs.pathResolve('fs/mkdir2/write2/file2.js'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir2/write2'));
				fs.rmdirSync(jt.fs.pathResolve('fs/mkdir2'));
				if(avail) {
					done();
				} else {
					done(false);
				}
			});
		});
	});

	describe('#isVirtual()', function() {
		it('combo file is virtual file', function() {
			var ensure = jt.fs.isVirtual('fs/c.js');

			assert.ok(ensure);
		});

		it('real file is not virtual file', function() {
			var ensure1 = jt.fs.isVirtual('fs/a.js');
			var ensure2 = jt.fs.isVirtual('fs/b.js');

			assert.ok(!ensure1 && !ensure2);
		});
	});

	describe('#search()', function() {
		it('could be search file while exist in real file system', function(done) {
			jt.fs.search('**/c.js', function(data) {
				if(jt.fs.isVirtual(data[0])) {
					done();
				} else {
					done(false);
				}
			});
		});

		it('it search virtual result must be in virtual file system', function(done) {
			jt.fs.search('**/b.js', function(data) {
				var file = jt.fs.pathResolve('fs/b.js'),
					hasFile = false;

				data.forEach(function(value) {
					if(value == file) {
						hasFile = true;
					}
				});

				if(hasFile) {
					done();
				} else {
					done(false);
				}
			});
		});

		it('搜索回调只会触发一次', function(done) {
			var fired = false;

			jt.fs.search('**/c.js', function() {
				if(fired) {
					done(false);
				} else {
					fired = true;
					setTimeout(function() {
						done();
					}, 2000);
				}
			});
		});

		it('ignorePath不会被搜索到', function(done) {
			jt.fs.search('ignoreFile.js', function(data) {
				if(data.length) {
					done(false);
				} else {
					done();
				}
			});
		});

		it('搜索结果没有重复项', function(done) {
			jt.fs.search('a.js', function(data) {
				var length = data.length;
				data = jt.utils.uniq(data);

				if(data.length == length) {
					done();
				} else {
					done(false);
				}
			});
		});

		it('正确忽略配置忽略文件夹', function(done) {
			jt.fs.search('fs/ignore/*', function(data) {
				if(data.length) {
					done(false);
				} else {
					done();
				}
			});
		});
	});

	describe('#searchVirtual()', function() {
		it('支持模糊搜索', function() {
			var result = jt.fs.searchVirtual('**/*ForSearch.js'),
				ret1 = jt.fs.pathResolve('fs/testForSearch.js'),
				ret2 = jt.fs.pathResolve('fs/reTestForSearch.js'),
				hasRet1 = false, hasRet2 = false;

			result.forEach(function(value) {
				if(!hasRet1 && value == ret1) {
					hasRet1 = true;
				}
				if(!hasRet2 && value == ret2) {
					hasRet2 = true;
				}
			});

			if(hasRet1 && hasRet2) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('真实文件不在虚拟文件无法搜索到', function() {
			var result = jt.fs.searchVirtual('fs/a.js');

			if(!result[0]) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正确忽略配置忽略文件夹', function(done) {
			jt.fs.search('fs/ignore/ignoreFile.js', function(data) {

				if(data.length) {
					done(false);
				} else {
					done();
				}
			});
		});
	});

	describe('#map2local()', function() {
		it('it exist in real file system', function(done) {
			var filename = jt.fs.pathResolve('fs/toRemove.js');
			if(fs.existsSync(filename)) {
				fs.unlinkSync(jt.fs.pathResolve(filename));
			}

			jt.fs.map2local(filename, function() {
				if(fs.existsSync(filename)) {
					done();
					fs.unlinkSync(jt.fs.pathResolve(filename));
				}
			});
		});

		it('文件不在映射列表里返回false，并且不会触发callback', function(done) {
			var triggedCallback = false;
			var exists = jt.fs.map2local('fs/nullFile.js', function() {
				triggedCallback = true;
			});

			if(!exists) {
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

	describe('#pathResolve()', function() {
		it('正常解析 ~/解析为 base路径', function() {
			var resolve = jt.fs.pathResolve('~/');

			if(resolve == jt.config.base) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常解析 ~/**/**.js', function() {
			var resolve = jt.fs.pathResolve('~/**/**.js');

			if(resolve == path.join(jt.config.base, '**/**.js')) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常解析 ~/../', function() {
			var resolve = jt.fs.pathResolve('~/../');

			if(resolve == path.resolve(jt.config.base, '../')) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常解析 ~/./', function() {
			var resolve = jt.fs.pathResolve('~/./');

			if(resolve == jt.config.base) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		var relative = path.join(jt.config.base, 'fs');
		it('正常解析 ./', function() {
			var resolve = jt.fs.pathResolve('./', relative);

			if(resolve == relative) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常解析 ../', function() {
			var resolve = jt.fs.pathResolve('../', relative);

			if(resolve == jt.config.base) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常解析 /', function() {
			var resolve = jt.fs.pathResolve('/');

			if(resolve == '/') {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});
	});

	describe('#existsSync()', function() {
		it('正常判断虚拟文件', function() {
			if(jt.fs.existsSync('fs/c.js')) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常判断真实文件', function() {
			if(jt.fs.existsSync('fs/a.js')) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});

		it('正常判断不存在文件', function() {
			if(!jt.fs.existsSync('notExist/notExist.js')) {
				assert.ok(true);
			} else {
				assert.ok(false);
			}
		});
	});

	describe('#processor', function() {
		it('没有定义file或者value报错', function() {
			assert.throws(function() {
				jt.fs.createReadStream('processor/notFileValue.js', function() {});
			});
		});

		it('processor定义值不存在时报错', function() {
			assert.throws(function() {
				jt.fs.createReadStream('processor/notProcessor.js');
			});
		});

		it('参数正确传递', function(done) {
			jt.fs.assign('___TEST_PROCESSOR_DEFINE', function(opt, info) {
				if(opt.name == 'name' && opt.file == '~/fs/c.js' && opt.dir == jt.config.base) {
					if(info.dir == jt.config.base) {
						done();
					}
				} else {
					done(false);
				}
				return through();
			});
			
			jt.fs.createReadCombineStream([{
				processor: '___TEST_PROCESSOR_DEFINE',
				file: '~/fs/c.js',
				___TEST_PROCESSOR_DEFINE: {
					name: 'name',
					file: '~/fs/c.js',
					dir: jt.config.base
				}
			}]);
		});

		it('第二参数有dir、isValue、filePath', function(done) {
			jt.fs.assign('___TEST_PROCESSOR_DEFINE1', function(opt, info) {
				if(info.hasOwnProperty('dir') && info.hasOwnProperty('type') && info.hasOwnProperty('filePath')) {
					done();
				} else {
					done(false);
				}
				return through();
			});

			jt.fs.createReadCombineStream([{
				processor: '___TEST_PROCESSOR_DEFINE1',
				file: '~/fs/c.js',
				___TEST_PROCESSOR_DEFINE1: {
					name: 'name',
					file: '~/fs/c.js',
					dir: jt.config.base
				}
			}]);
		});

		it('type正确指向value', function(done) {
			jt.fs.assign('___TEST_PROCESSOR_DEFINE2', function(opt, info) {
				if(info.type == 'value') {
					done();
				} else {
					done(false);
				}
				return through();
			});

			jt.fs.createReadCombineStream([{
				processor: '___TEST_PROCESSOR_DEFINE2',
				value: 'test'
			}]);
		});

		it('value值正确传递', function(done) {
			var obj = jt.fs.createReadCombineStream([{
				value: 'test',
				processor: 'string'
			}]);

			aggre(obj).on('data', function(buffer) {
				if(buffer.toString() == 'test') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('处理器的file参数多重引用的支持', function(done) {
			jt.fs.readFile('fs/l.js', function(buffer) {
				if(buffer.toString() == 'string') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('参数file支持模糊搜索', function(done) {
			jt.fs.readCombineFile({
				file: '~/build/*'
			}, function(buffer) {
				if(buffer.toString() == '123') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('解析数组file', function(done) {
			jt.fs.readCombineFile({
				file: [
					'~/build/*',
					'fs/f.js'
				]},
			function(buffer) {
				if(buffer.toString() == '123string') {
					done();
				} else {
					done(false);
				}
			});
		});

		it('多个参数file格式化为单参数', function(done) {
			var doned = false;
			jt.fs.assign('optionTest', function(options) {
				if(!doned) {
					doned = true;
					if(!Array.isArray(options.file)) {
						done();
					} else {
						done(false);
					}
				}
				return through();
			});

			jt.fs.readCombineFile({
				processor: 'optionTest',
				file: '~/build/*',
				optionTest: function() {
					return {file: this.file}
				}
			});
		});

		it('加载cwd processor模块', function(done) {
			jt.fs.readFile('fs/through.js', function(buffer) {
				if(buffer.toString() == 'test') {
					done();
				} else {
					done(false);
				}
			});

		});
	});
});
