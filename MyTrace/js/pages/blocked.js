/*
 * 	Trace blocked page script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

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

window.URL = window.URL || window.webkitURL;

// A general fix for browser that use window.browser instead of window.chrome
if (!window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

var TraceBlock = {
	blockedURL:"",
	blockReason:0,
	whitelistData:{},
	ProtectionTemplate:{
		SiteBlocked:false,
		InitRequests:true,
		Protections:{
			Pref_AudioFingerprint:true,
			Pref_BatteryApi:false,
			Pref_CanvasFingerprint: true,
			Pref_CookieEater:false,
			Pref_ETagTrack:false,
			Pref_GoogleHeader:false,
			Pref_IPSpoof:false,
			Pref_NetworkInformation:false,
			Pref_HardwareSpoof:false,
			Pref_PingBlock:false,
			Pref_PluginHide:false,
			Pref_ReferHeader:false,
			Pref_ScreenRes:false,
			Pref_UserAgent:false,
			Pref_WebRTC:false
		}
	},
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
		if (TraceBlock.blockedURL === null) return;

		var url = new URL(TraceBlock.blockedURL);
		TraceBlock.whitelistData["origin"] = url.origin + "/*";
		TraceBlock.whitelistData["path"] = "*" + url + "*";
		TraceBlock.whitelistData["host"] = "*" + TraceBlock.extractHostname(TraceBlock.blockedURL) + "*";
		TraceBlock.whitelistData["root"] = "*" + TraceBlock.extractRootDomain(TraceBlock.blockedURL) + "*";

		var el = $("#whitelist_opts");

		if (typeof TraceBlock.whitelistData["origin"] === "string"){
			el.append(
				$("<label/>",{"for":"url_origin"}).text("Unblock the Origin URL: "),
				$("<a/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceBlock.whitelistURL("origin");}),
				$("<input/>",{
					"type":"text",
					"name":"url_origin",
					"id":"url_origin",
					"placeholder":"Origin URL",
					"readonly":true,
					"value":TraceBlock.whitelistData["origin"]
				}),
				$("<br/>")
			);
		}
		if (typeof TraceBlock.whitelistData["path"] === "string" && TraceBlock.whitelistData["path"] !== "*/*" && TraceBlock.whitelistData["path"].split("/").length > 4){
			el.append(
				$("<label/>",{"for":"url_path"}).text("Unblock the URL path: "),
				$("<a/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceBlock.whitelistURL("path");}),
				$("<input/>",{
					"type":"text",
					"name":"url_path",
					"id":"url_path",
					"placeholder":"URL pathname",
					"readonly":true,
					"value":TraceBlock.whitelistData["path"]
				}),
				$("<br/>")
			);
		}
		if (typeof TraceBlock.whitelistData["host"] === "string" && TraceBlock.whitelistData.host !== TraceBlock.whitelistData.root){
			el.append(
				$("<label/>",{"for":"url_host"}).text("Unblock the Host URL: "),
				$("<a/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceBlock.whitelistURL("host");}),
				$("<input/>",{
					"type":"text",
					"name":"url_host",
					"id":"url_host",
					"placeholder":"Hostname",
					"readonly":true,
					"value":TraceBlock.whitelistData["host"]
				}),
				$("<br/>")
			);
		}
		if (typeof TraceBlock.whitelistData["root"] === "string"){
			el.append(
				$("<label/>",{"for":"url_root"}).text("Unblock the Root Domain: "),
				$("<a/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceBlock.whitelistURL("root");}),
				$("<input/>",{
					"type":"text",
					"name":"url_root",
					"id":"url_root",
					"placeholder":"Root Domain Name",
					"readonly":true,
					"value":TraceBlock.whitelistData["root"]
				})
			);
		}
	},
	whitelistURL:function(type){
		var url = TraceBlock.whitelistData[type], result;

		result = confirm("Are you sure you wish to allow access to:\n"+url);
		if (result !== true){
			return;
		}

		chrome.extension.getBackgroundPage().Trace.c.AddItem(url,TraceBlock.ProtectionTemplate,function(){
			TraceBlock.Auth.SafePost({action:"ReloadWhitelist"});
			window.location.href = TraceBlock.blockedURL;
		});
	}
};
TraceBlock.init();