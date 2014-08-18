var path = require('path'),
	_ = require('underscore');


function _init(Self) {
	var toBatch = [];
	Self.pathHashMap = _parseTree(Self.fileTree, Self.base, {}, Self.pathList, toBatch);
	_parseBatch(Self, toBatch);
}

// 通配符处理
function _parseBatch(Self, toBatch) {
	
	toBatch.forEach(function(specialData) {
		// 通配符
		if(specialData.type == 'wildcard' && specialData.config.file) {
			var p = fsApi.pathResolve(specialData.config.file, specialData.dir);
			p = fsApi.formatPath(p);
			var searchDir = path.dirname(p);

			var result = fsApi.searchSync(p);

			result.forEach(function(originalFilePath) {
				var targetFilePath = originalFilePath;
				if(specialData.config.hasOwnProperty('rename')) {
					var oldFileName = path.basename(originalFilePath);
					var newFileName = specialData.config.rename.call(null, oldFileName);
					
					if(!newFileName) return;
					targetFilePath = targetFilePath.replace(new RegExp(oldFileName+'$'), newFileName);
				}

				targetFilePath = targetFilePath.replace(searchDir, specialData.dir);
				targetFilePath = path.normalize(targetFilePath);

				Self.pathList.push(targetFilePath);

				Self.pathHashMap[targetFilePath] = [_.extend({}, specialData.config, {file: originalFilePath})];
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
				currentPath = VirtualFileSystem.formatPath(currentPath);
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

function VirtualFileSystem(fileTree, option) {
	option || (option = {});

	this.base = option.base || jt.getConfig('base');
	this.pathHashMap = null;
	this.pathList = [];
	this.fileTree = fileTree;

	_init(this);
}

VirtualFileSystem.prototype = {
	getFile: function(filePath) {
		var filePath = jt.fs.pathResolve(filePath);
	}
};


VirtualFileSystem.formatPath = function(p) {
	return p.split(path.sep).join('/');
};
function search() {

}


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





module.exports = VirtualFileSystem;