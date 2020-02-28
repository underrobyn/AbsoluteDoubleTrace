/*
 * 	Trace page helper script for after documents have loaded
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

var TLoaded = {
	debug:2,

	protections:{},
	css:"font-size:1em;line-height:1.5em;color:#1a1a1a;background-color:#fff;border:.1em solid #00af00;",

	init:function(data){
		console.log("%c [TracePage] Page loaded ",TLoaded.css);

		TLoaded.protections = data;

		if (data.relOpener === true) TLoaded.relOpenerFix();
		if (data.pingAttr === true) TLoaded.pingCleaner();
	},

	startTracePage:function(){
		chrome.runtime.sendMessage({msg: "traceload", url:location.href},function(response) {
			TLoaded.init(response);
		});
	},

	pingCleaner:function(){
		var links = document.querySelectorAll("a[ping]");
		for (let i = 0;i<links.length;i++){
			//console.log(links[i].ping);
			links[i].ping = "";
		}
	},
	relOpenerFix:function(){
		var links = document.querySelectorAll("a[target]");
		for (let i = 0;i<links.length;i++){
			var l = links[i];
			if (!l.hasAttribute("href")) continue;
			if (l.href.includes("javascript:void") || l.href === "#") continue;
			if (l.hostname === window.location.hostname) continue;

			//console.log(links[i]);
			var relTxt = "noopener";
			if (l.hasAttribute("rel")){
				let spl = l.rel.split(" ");
				if (spl.indexOf("noopener") !== -1) continue;

				relTxt += " " + l.rel;
			}

			links[i].rel = relTxt;
		}
	}
};

TLoaded.startTracePage();