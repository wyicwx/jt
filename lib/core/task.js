'use strict';

var task = module.exports = {};

var taskMap = {};

task.assign = function(task) {
	var taskName = task.name;

	if(!taskName) {
		throw new Error('task name must be seted!');
	}

	var handler = jt.utils.result(task, 'handler');

	if(taskMap[taskName]) {
		throw new Error(taskName + 'was be assign!');
	}
	taskMap[taskName] = handler;
};


task.getTask = function(name) {
	return taskMap[name];
};