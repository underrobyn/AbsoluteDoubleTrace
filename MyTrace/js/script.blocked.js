/* Copyright AbsoluteDouble Trace 2018 */

// Polyfill: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes#Polyfill
if (!String.prototype.includes) {
	String.prototype.includes = function(search, start) {
		if (typeof start !== 'number') {
			start = 0;
		}

		if (start + search.length > this.length) {
			return false;
		} else {
			return this.indexOf(search, start) !== -1;
		}
	};
}

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}

var TraceBlock = {
	blockedURL:"",
	blockReason:0,
	whitelistData:{"host":"","root":""},
	init:function(){
		TraceBlock.Auth.Init();
		TraceBlock.assignButtonEvents();
		TraceBlock.getPageDetails();
		TraceBlock.setBasicContent();
		TraceBlock.setWhitelistOptions();
	},
	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				TraceBlock.Auth.Channel = new BroadcastChannel('TraceAuth');
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof TraceBlock.Auth.Channel !== null){
					TraceBlock.Auth.Channel.postMessage(data);
				}
			}
		}
	},
	assignButtonEvents:function(){
		document.getElementById("open_settings").addEventListener("click",function(){
			if (/Chrome/.test(navigator.userAgent)){
				chrome.tabs.create({url:"html/options.html"});
			} else {
				chrome.tabs.create({url:"options.html"});
			}
		},false);
	},
	getPageDetails:function(){
		if (window.location.hash.includes("u;")){
			var u = window.location.hash.split(";")[1];
			var t = u.split("&");
			TraceBlock.blockedURL = atob(t[0]);
			TraceBlock.blockReason = t[1];
		} else {
			TraceBlock.blockedURL = null;
		}
	},
	// Thanks to https://stackoverflow.com/a/23945027/
	extractHostname:function(url){
		var hostname;

		if (url.indexOf("://") > -1) {
			hostname = url.split('/')[2];
		} else {
			hostname = url.split('/')[0];
		}

		hostname = hostname.split(':')[0];
		hostname = hostname.split('?')[0];

		return hostname;
	},
	extractRootDomain:function(url){
		var domain = TraceBlock.extractHostname(url),
			splitArr = domain.split('.'),
			arrLen = splitArr.length;

		if (arrLen > 2) {
			domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
			if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
				domain = splitArr[arrLen - 3] + '.' + domain;
			}
		}
		return domain;
	},
	setBasicContent:function(){
		if (TraceBlock.blockedURL === null){
			document.getElementById("url").innerHTML = "No information was provided";
			document.getElementById("reason").innerHTML = "";
			return;
		}

		var types = {
			0:"Unknown",
			1:"Blocked due to Top Level Domain",
			2:"Blocked because domain matched blocklist",
			3:"Blocked because hostname matched blocklist",
			4:"Blocked because URL matched item in blocklist",
			5:"Blocked because file matched blacklisted files",
			"undefined":"No reason set"
		};
		document.getElementById("url").innerHTML = TraceBlock.blockedURL;
		document.getElementById("reason").innerHTML = types[TraceBlock.blockReason];
	},
	setWhitelistOptions:function(){
		TraceBlock.whitelistData.host = TraceBlock.extractHostname(TraceBlock.blockedURL);
		TraceBlock.whitelistData.root = TraceBlock.extractRootDomain(TraceBlock.blockedURL);

		// If the URL blocked was not a subdomain of root domain, hide host option
		if (TraceBlock.whitelistData.host === TraceBlock.whitelistData.root) {
			document.getElementById("whitelist_host").style.display = "none";
		}
		document.getElementById("whitelist_host").addEventListener("click",function(){
			TraceBlock.whitelistURL("host");
		},false);
		document.getElementById("whitelist_root").addEventListener("click",function(){
			TraceBlock.whitelistURL("root");
		},false);
	},
	whitelistURL:function(type){
		var url = TraceBlock.whitelistData[type], result;

		if (type === "host"){
			result = confirm("Are you sure you wish to whitelist the hostname\n"+url+"\nThis will only unblock this hostname, not the full domain.")
		} else {
			result = confirm("Are you sure you wish to whitelist the domain\n"+url+"\nThis will unblock the domain, and all its subdomains.")
		}

		if (result !== true){
			return;
		}

		chrome.extension.getBackgroundPage().Trace.c.AddItem(url,function(){
			var lnk = "<a href='"+ TraceBlock.blockedURL +"'>Go to site</a>";
			document.getElementById("whitelist_opts").innerHTML = "<h2>Site whitelisted</h2><br />" + lnk;
			TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
		});
	}
};
TraceBlock.init();