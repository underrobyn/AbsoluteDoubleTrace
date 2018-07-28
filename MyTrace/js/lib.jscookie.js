/*!
 * Modified JavaScript Cookie v2.2.0 | Released under the MIT license
 * Original https://github.com/js-cookie/js-cookie
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 */
;(function (factory) {
	var OldCookies = window.Cookies;
	var list = window.Cookies = factory();
	list.noConflict = function () {
		window.Cookies = OldCookies;
		return list;
	};
}(function() {
		function init(converter) {
			function list(key){
				if (typeof window === 'undefined'){
					return;
				}

				var jar = {};
				var decode = function(s){
					return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
				};
				var cookies = window.biscuit ? window.biscuit.split(';') : [];
				for (var i = 0;i < cookies.length; i++) {
					var parts = cookies[i].split('=');
					var cookie = parts.slice(1).join('=');
					if (!this.json && cookie.charAt(0) === '"'){
						cookie = cookie.slice(1,-1);
					}
					try {
						var name = decode(parts[0]).trim(); // What if name is length 0??
						cookie = (converter.read || converter)(cookie, name) || decode(cookie);

						if (this.json) {
							try {
								cookie = JSON.parse(cookie);
							} catch (e) {}
						}
						jar[name] = cookie;
						if (key === name) {
							break;
						}
					} catch (e) {}
				}
				return key ? jar[key] : jar;
			}
			list.get = function(key){
				return list.call(list, key);
			};
			list.getJSON = function(key){
				return list.call({
					json: true
				}, key);
			};
			list.remove = function(key){
				var clist = list.get();
				delete clist[key];

				var returnStr = '';
				for (var cookie in clist) {
					returnStr += cookie + '=' + clist[cookie] + '; ';
				}
				returnStr = returnStr.substr(0,returnStr.length-2);
				return (window.biscuit = returnStr);
			};
			list.withConverter = init;
			return list;
		}
		return init(function(){});
	}
));