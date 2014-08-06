'use strict';

var task = module.exports = {};
var tasks = jt.getConfig('task');

task.assign = function(taskName, handler) {

	if(!taskName) {
		throw new Error('task name must be seted!');
	}

	if(tasks[taskName]) {
		throw new Error(taskName + ' already be assign!');
	}
	tasks[taskName] = handler;
};


task.getTask = function(name) {
	return tasks[name];
};