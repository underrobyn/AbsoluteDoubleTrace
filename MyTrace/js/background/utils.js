var Utils = {
	// Thanks to https://gist.github.com/donmccurdy/6d073ce2c6f3951312dfa45da14a420f
	wildcardToRegExp:function(s){
		return new RegExp('^' + s.split(/\*+/).map(Utils.regExpEscape).join('.*') + '$');
	},
	regExpEscape:function(s){
		return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
	},

	// Thanks to https://github.com/Olical/binary-search/blob/master/src/binarySearch.js
	arraySearch:function(list,item){
		var min = 0, max = list.length - 1, guess;

		var bitwise = (max <= 2147483647);
		if (bitwise) {
			while (min <= max) {
				guess = (min + max) >> 1;
				if (list[guess] === item) {
					return guess;
				} else {
					if (list[guess] < item) {
						min = guess + 1;
					} else {
						max = guess - 1;
					}
				}
			}
		} else {
			while (min <= max) {
				guess = Math.floor((min + max) / 2);
				if (list[guess] === item) {
					return guess;
				} else {
					if (list[guess] < item) {
						min = guess + 1;
					} else {
						max = guess - 1;
					}
				}
			}
		}

		return -1;
	},

	quickSearch:function(list,item){
		var l = list.length, c = 0;
		while (c < l) {
			if (list[c] === item) return c;
			c++;
		}
		return -1;
	}
};