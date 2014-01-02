var builder = {};

builder.example = {
	dir: '/',
	files: {
		'js.js': [
			{
				processor: 'defineHtml',
				value: 'js/index.html',
				name: 'js.index'
			},
			'js.js'
		],
	},
	description: 'js',
	output: 'js/'
};

module.exports = builder;
