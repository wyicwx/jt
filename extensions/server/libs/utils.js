var config = jt.config.proxy;

/**
 * list文件处理函数
 * @example
 * 		before
 * 		{	
 * 			"www.qq.com": {
 * 				"respond": "www.qq.com"
 * 			}
 * 		}
 * 		after
 * 		[
 * 			{
 * 				"match": /www\.baidu\.com/,
 * 				"originalMatch": "www.qq.com",
 * 				"respond": "www.qq.com"
 * 			}	
 * 		]
 */
(function(e) {

	function _escape(str) {
		var match = ['\\\\','\\.','\\?','\\+','\\$','\\^','\\/','\\{','\\}','\\,','\\)','\\(','\\=','\\!','\\*'].join('|');
		str = str.replace(new RegExp(match, 'gi'), function(value) {
			return '\\' + value;
		});
		return str;
	};

	function _parse(str) {
		var tmp = str.split(/(?=\()|(?=\))/g),
			strDealed = '', count = 0;

		tmp.forEach(function(value) {
			if(value[0] == '(') {
				strDealed += value;
				count += 1;
			} else if(value[0] == ')') {
				count -= 1;
				if(count > 0) {
					strDealed += value;
				} else {
					strDealed += ')';
					strDealed += _escape(value.slice(1));
				}
			} else {
				strDealed += _escape(value);
			}
		});

		tmp = new RegExp(strDealed);
		return tmp; 
	};

	function _dealList(list) {
		var newList = [], tmp, respond;
		for(var i in list) {
			tmp = jt.utils.clone(list[i]);
			tmp['match'] = _parse(i);
			tmp['originalMatch'] = i;
			// 对象则调用
			if(!jt.utils.isArray(tmp.respond)) {
				tmp.respond = tmp.respond;
			}
			newList.push(tmp);
		}
		return newList;
	};

	e.dealList = _dealList;
})(exports);
