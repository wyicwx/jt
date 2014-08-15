var path = require('path');

function _init() {

}

function _parseTree(Self, filePath) {
	
}

function VirtualFileSystem(fileTree) {
	this.pathHashMap = {};
	this.fileTree = fileTree;
}
VirtualFileSystem.prototype = {
	getFile: function(filePath) {
		var filePath = jt.fs.pathResolve(filePath);

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




		// get hash
		if(this.pathHashMap[filePath]) {
			return this.pathHashMap[filePath];
		// parse
		} else if(_parseTree(this, filePath)) {
			return this.pathHashMap[filePath];
		// wildcard match
		// 虚拟文件先映射，真实文件也没办法获取
		// 
		} else if(_wildcardmatch(this, filePath)) {
			return this.pathHashMap[filePath];
		// null
		} else {
			return null;
		}
	},
	hasFile: function() {

	}
};





module.exports = VirtualFileSystem;