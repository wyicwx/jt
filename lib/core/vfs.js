var path = require('path'),
	minimatch = require('minimatch'),
	glob = require('glob'),
	_ = require('underscore');


function _init(Self) {
	var toBatch = [];
	Self.pathHashMap = _parseTree(Self.fileTree, Self.base, {}, Self.pathList, toBatch);
	_parseBatch(Self, toBatch);
}

// 通配符处理
function _parseBatch(Self, toBatch) {
	/**
	 * {
	 * 	 dir: '/xx/bb/aa',
	 * 	 config: {
	 * 	 	processor: '',
	 * 	 	file: ''
	 * 	 },
	 * 	 type: 'widcard'
	 * }
	 */
	toBatch.forEach(function(data) {
		// 通配符
		if(data.type == 'wildcard' && data.config.file) {
			var p = VFS.pathResolve(data.config.file, data.dir);
			p = VFS.formatPath(p);
			var searchDir = path.dirname(p);

			var result = Self.searchSync(p);

			result.forEach(function(originalFilePath) {
				var targetFilePath = originalFilePath;
				if(data.config.hasOwnProperty('rename')) {
					var oldFileName = path.basename(originalFilePath);
					var newFileName = data.config.rename.call(null, oldFileName);
					
					if(!newFileName) return;
					targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
				}

				targetFilePath = targetFilePath.replace(searchDir, data.dir);
				targetFilePath = path.normalize(targetFilePath);

				Self.pathList.push(targetFilePath);

				Self.pathHashMap[targetFilePath] = [_.extend({}, data.config, {file: originalFilePath})];
			});
		}
	});
}
// function flatten(obj, prev, o) {
// 	prev = prev || jt.config.base;
// 	o = o || {};

// 	jt.utils.each(obj, function(value, key) {
// 		var p = path.join(prev, key);

// 		if(jt.utils.isObject(value) && !Array.isArray(value)) {
// 			flatten(value, p, o);
// 		} else {
// 			if(key === '*') {
// 				value.forEach(function(config) {
// 					if(Array.isArray(config.file)) {
// 						config.file.forEach(function(file) {
// 							special.push({
// 								dir: prev,
// 								config: _.extend({}, config, {
// 									file: file
// 								}),
// 								type: 'wildcard'
// 							});
// 						});
// 					} else {	
// 						special.push({
// 							dir: prev,
// 							config: config,
// 							type: 'wildcard'
// 						});
// 					}
// 				});
// 			} else {
// 				p = fsApi.formatPath(p);
// 				matchs.push(p);
// 				if(Array.isArray(value)) {
// 					o[p] = value;
// 				} else {
// 					o[p] = [value];
// 				}
// 			}
// 		}
// 	});

// 	return o;
// }

function _parseTree(tree, parentFolder, result, pathQueue, batch) {
	_.each(tree, function(subtree, dir) {
		var currentPath = path.join(parentFolder, dir);

		if(_.isObject(subtree) && !_.isArray(subtree)) {
			_parseTree(subtree, currentPath, result, pathQueue, batch);
		} else {
			if(dir === '*') {
				// 批处理
				subtree.forEach(function(config) {
					if(Array.isArray(config.file)) {
						_.each(config.file, function(file) {
							batch.push({
								dir: parentFolder,
								config: _.extend({}, config, {
									file: file
								}),
								type: 'wildcard'
							});
						});
					} else {	
						batch.push({
							dir: parentFolder,
							config: config,
							type: 'wildcard'
						});
					}
				});
			} else {
				currentPath = VFS.formatPath(currentPath);
				pathQueue.push(currentPath);
				if(Array.isArray(subtree)) {
					result[currentPath] = subtree;
				} else {
					result[currentPath] = [subtree];
				}
			}
		}
	});

	return result;
}

function VFS(fileTree, option) {
	option || (option = {});

	this.base = option.base || jt.getConfig('base');
	this.pathHashMap = null;
	this.pathList = [];
	this.fileTree = fileTree;

	_init(this);
}

VFS.prototype = {
	getFile: function(filePath) {
		var filePath = VFS.pathResolve(filePath);
	},
	searchVirtual: function(search) {
		search = VFS.pathResolve(search, this.base);
		var match = minimatch.match(this.pathList, search, {});
		// match = _filterIgnore(match);

		return match;
	},
	search: function(search, callback) {
		var result = this.searchVirtual(search),
			Self = this;

		glob(search, {cwd: this.base}, function(err, data) {
			if(err) {
				callback && callback(err, null);
			} else {
				data = data.map(function(value) {
					return path.resolve(Self.base, value);
				});
				// data = _filterIgnore(data);
				result = result.concat(data);
				result = _.uniq(result);
				callback && callback(null, result);
			}
		});
	},
	searchSync: function(search) {
		search = VFS.pathResolve(search, this.base);

		var result = this.searchVirtual(search);
		var data = glob.sync(search);
		result = result.concat(data);
		result = _.uniq(result);
		// result = _filterIgnore(result);
		return result;
	}
};


VFS.formatPath = function(p) {
	return p.split(path.sep).join('/');
};

VFS.pathResolve = function(filepath, dir) {
	var first = filepath[0],
		result;
	if(!dir) {
		dir = jt.config.base;
	}
	// 相对于dir的相对路径
	if(first == '.') {
		result = path.resolve(dir, filepath);
	} else if(first == path.sep) {
		result = path.resolve('/', filepath);
	} else if(first == '~') {
		filepath = filepath.replace(/^~+/, '');
		result = path.resolve(path.join(jt.config.base, filepath));
	} else {
		result = path.resolve(dir, filepath);
	}

	return this.formatPath(result);
};


// build hash 也是一条路
// -> 预解析
// -> 搜索 from list
// -> getFile from hash
// 
// parse access
// -> 遍历
// -> 搜索 ***
// -> getFile search tree
// 
// 
// 
// path/* b/* 
// path/* b/*
// 
// 

// get all 

// 匹配 /a/*.js
// /a/*  -> /b/* -> /a/*.js -> rename ? 
// 
// 匹配目标文件夹,




// 		// get hash
// 		if(this.pathHashMap[filePath]) {
// 			return this.pathHashMap[filePath];
// 		// parse
// 		} else if(_parseTree(this, filePath)) {
// 			return this.pathHashMap[filePath];
// 		// wildcard match
// 		// 虚拟文件先映射，真实文件也没办法获取
// 		// 
// 		} else if(_wildcardmatch(this, filePath)) {
// 			return this.pathHashMap[filePath];
// 		// null
// 		} else {
// 			return null;
// 		}
// 	},
// 	hasFile: function() {

// 	}
// };





module.exports = VFS;