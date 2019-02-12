/*
 * 	Trace options page script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var showErr = function(m){
	document.getElementById("e_msg").style.display = "block";
	document.getElementById("fail_reason").innerText = m;
};

if (typeof $ !== "function" || typeof jQuery !== "function") {
	showErr("jQuery Library failed to load.");
}
if (typeof window.JSON !== "object"){
	showErr("JSON Library failed to load.");
}

// A general fix for browser that use window.browser instead of window.chrome
if (!window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

if (!chrome.hasOwnProperty("extension") || typeof chrome.extension.getBackgroundPage !== "function"){
	showErr("Extension failed to connect to background page. Please try reloading the page.");
}

window.URL = window.URL || window.webkitURL;

var TraceOpt = {
	s:"M2ysyaSd58sqt4zVGicIfbMYac8dqhtrk5yyA8tiG31gZ",
	homeRefresh:null,
	searchTimeout:null,
	currentSettingTab:"settings_stracefeature",
	storage:(typeof Storage !== "undefined" && typeof localStorage !== "undefined" && localStorage !== null),
	debug:false,

	// Thanks to: https://stackoverflow.com/a/4900484/
	getChromeVersion:function() {
		var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
		return raw ? parseInt(raw[2], 10) : false;
	},
	makeRandomID:function(r){
		for(var n="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
			n += t.charAt(Math.floor(Math.random()*t.length));
		}
		return n;
	},
	FormatNumber:function(x) {
		if (!x) return "0";
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	},
	theDate:function(){
		var date = new Date();
		var day = date.getDate();
		var month = date.getMonth()+1;
		day.toString().length !== 2 ? day = "0" + day.toString() : 0;
		month.toString().length !== 2 ? month = "0" + month.toString() : 0;

		return [date.getFullYear().toString(),month.toString(),day.toString()];
	},
	CloseOverlay:function(){
		$("#overlay_message").fadeOut(250);
		$("#ux").removeClass("blurred");
		setTimeout(function(){
			$("#overlay_message").removeClass("overlay_fs");
		},250);
	},
	AssignCloseOverlay:function(fs){
		if (fs) $("#overlay_message").addClass("overlay_fs");

		$("#ux").addClass("blurred");
		$("#overlay_message").fadeIn(300);
		$("#overlay_close").click(TraceOpt.CloseOverlay);
		$(window).click(function(e){
			if ($(e.target)[0].id === "overlay_message"){
				TraceOpt.CloseOverlay();
			}
		});
	}
};

try{
	$(document).ready(TraceOpt.WindowLoad);
} catch(e){
	showErr("Unable to load UI.");
	console.error(e);
}

// Check if is new install
if(window.location.hash && window.location.hash === "#v2installed") {
	TraceOpt.NewInstall.ShowInterface();
} else {
	setTimeout(function(){$("#ux").removeClass("blurred");},10);
}

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