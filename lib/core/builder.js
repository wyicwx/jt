'use strict';
var projects  = jt.config.project,
	async = require('async'),
	_ = require('underscore'),
	builder = module.exports = {};

// preFormat all path
jt.utils.each(projects, function(projectContent) {
	if(!Array.isArray(projectContent.files)) {
		projectContent.files = [projectContent.files];
	}
	projectContent.files.map(function(filename, key) {
		projectContent.files[key] = jt.fs.pathResolve(filename);
	});
});

var resolved = {};
builder.getFilesByProject = function(project) {
	if(builder.hasProject(project)) {
		if(!resolved[project]) {
			var ret = [];
			projects[project].files.forEach(function(value) {
				ret = ret.concat(jt.fs.searchSync(value));
			});
			projects[project].files = ret;
			resolved[project] = true;
		}
		return jt.utils.clone(projects[project].files);
	}
	return null;
};

builder.getAllProject = function() {
	return jt.utils.keys(projects);
};

builder.buildStream = function(project) {
	if(builder.hasProject(project)) {
		var filesStream = [];

		builder.getFilesByProject(project).forEach(function(filename) {
			filesStream.push(jt.fs.createReadStream(filename));
		});

		return filesStream;
	} else {
		return null;
	}
};

builder.build2local = function(project, callback) {
	if(builder.hasProject(project)) {
		async.map(builder.getFilesByProject(project), function(filename, done) {
			var isMapping = jt.fs.map2local(filename, function() {
				done();
			});
			if(!isMapping) {
				done();
			}
		}, function() {
			callback && callback();
		});
		return true;
	} else {
		return null;
	}
};

builder.build = function(project, callback) {
	var files = [];

	if(builder.hasProject(project)) {
		async.map(builder.getFilesByProject(project), function(filename, done) {
			jt.fs.readFile(filename, function(buffer) {
				files.push(buffer);
				done();
			});
		}, function() {
			callback && callback(files);
		});
		return true;
	} else {
		return false;
	}
};

builder.hasProject = function(project) {
	if(project in projects) {
		return true;
	} else {
		return false;
	}
};