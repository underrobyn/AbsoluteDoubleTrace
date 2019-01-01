/*
 * CookieParser
 * Library to parse cookie strings
 * absolutedouble.co.uk
*/

var CookieParser = function(string){
	this.cookies = string || "";
	this.inital = string;
	this.parsed = {};

	this.decodeuri = function(s){
		if (!s) return "";
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	};

	this.parse = function(){
		var r = {};
		var decoded = this.cookies ? this.cookies.split('; ') : [this.cookies];
		var i = 0, l = decoded.length;

		for (;i<l;i++){
			var half = decoded[i].split('=');

			var key = half[0];
			var value = half.slice(1).join('=');

			if (value.charAt(0) === '"') {
				value = value.slice(1, -1);
			}

			try {
				key = this.decodeuri(key);
			} catch(e){
				console.error(e);
				console.log(key);
			}

			try {
				value = this.decodeuri(value);
			} catch (e){ /* Don't care about these errors */ }

			r[key] = value;
		}

		return r;
	};

	this.update = function(){
		var string = '';
		var names = Object.keys(this.parsed);
		var values = Object.values(this.parsed);
		var i = 0, l = names.length;

		for (;i<l;i++){
			string += names[i] + (values[i].length !== 0 ? '=' + values[i] : '') + '; ';
		}

		string = string.slice(0,-2);

		this.cookies = string;
	};

	this.getCookie = function(name){
		return (this.parsed[name] === undefined ? false : this.parsed[name]);
	};

	this.getCookies = function(){
		return this.parsed;
	};

	this.getString = function(){
		return this.cookies;
	};

	this.setCookie = function(name,value){
		this.parsed[name] = value;
		this.update();
	};

	this.updateCookie = function(name,value){
		if (this.parsed[name] === undefined) return false;

		this.parsed[name] = value;
		this.update();
	};

	this.updateCookies = function(array,func){
		var i = 0, l = array.length;
		for (;i<l;i++){
			if (this.parsed[array[i]] !== undefined)
				this.parsed[array[i]] = func(array[i]);
		}
		this.update();
	};

	this.updateAllCookies = function(func){
		var keys = Object.keys(this.parsed);
		var i = 0, l = keys.length;
		for (;i<l;i++){
			this.parsed[keys[i]] = func(keys[i]);
		}
		this.update();
	};

	this.removeCookie = function(name){
		delete this.parsed[name];
		this.update();
	};

	this.removeCookies = function(array){
		var i = 0, l = array.length;
		for (;i<l;i++){
			if (this.parsed[array[i]] !== undefined)
				delete this.parsed[array[i]];
		}
		this.update();
	};

	this.cookieString = function(string){
		this.cookies = string;
		this.parsed = this.parse();
	};

	this.parsed = this.parse();
};

var SetCookieParser = function(string){
	this.setcookie = string || "";
	this.initial = string;

	this.parsed = {};
	this.cookiename = "";
	this.cookievalue = "";

	// https://chromium.googlesource.com/chromium/src/+/master/extensions/browser/api/web_request/web_request_api_helpers.cc#166
	this.reserved = ["max-age","expires","secure","httponly","domain","samesite","path","priority"];

	this.decodeuri = function(s){
		if (!s) return "";
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	};

	this.parse = function(){
		var r = {};
		var decoded = this.setcookie ? this.setcookie.split('; ') : [this.setcookie];
		var i = 0, l = decoded.length;

		for (;i<l;i++){
			var half = decoded[i].split('=');

			var key = half[0];
			var value = half.slice(1).join('=');

			if (this.reserved.indexOf(key.toLowerCase()) === -1){
				this.cookiename = key;
				this.cookievalue = value;
			}

			if (value.charAt(0) === '"') {
				value = value.slice(1, -1);
			}

			try {
				key = this.decodeuri(key);

				r[key] = value;
			} catch(e){
				console.error(e);
			}
		}

		return r;
	};

	this.update = function(){
		var string = '';
		var names = Object.keys(this.parsed);
		var values = Object.values(this.parsed);
		var i = 0, l = names.length;

		for (;i<l;i++){
			string += names[i] + (values[i].length !== 0 ? '=' + values[i] : '') + '; ';
		}

		string = string.slice(0,-2);

		this.setcookie = string;
	};

	this.updateCookie = function(value){
		if (this.parsed[this.cookiename] === undefined) return false;

		this.parsed[this.cookiename] = value;
		this.update();
	};

	this.parsed = this.parse();
};