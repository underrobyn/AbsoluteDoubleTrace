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

var sTrace = {
	storage:(typeof Storage !== "undefined" && typeof localStorage !== "undefined" && localStorage !== null),
	debug:false,

	FormatNumber:function(x) {
		if (!x) return "0";
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
		$("#overlay_close").click(sTrace.CloseOverlay);
		$(window).click(function(e){
			if ($(e.target)[0].id === "overlay_message"){
				sTrace.CloseOverlay();
			}
		});
	}
};

try{
	$(document).ready(sTrace.WindowLoad);
} catch(e){
	showErr("Unable to load UI.");
	console.error(e);
}