var target = module.exports = {},
	rule = target.rule = {};

/**
 * 对于匹配规则的定义，只有两种
 * 字符串和对象
 *
 * 字符串类型：
 *		优先从build项目中去搜索 -> 绝对路径 -> 相对路径
 *
 * 对象类型：
 *		参考pipe的builder processer
 *
 */
rule.js = {};
rule.js['http://([^\\/]+)/(.*)js($)'] = {
	respond: [
		'$2.js',
		{
			processor: 'string',
			value: ';if(console){console.log("%cload: localFile!", "color:green;")};'
		}
	]
};

/*===============================host===============================*/


target['default'] = {
	description: 'default',
	list: jt.utils.extend({}, rule),
	hosts: {}
};
