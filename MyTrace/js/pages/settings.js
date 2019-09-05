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

var sTrace = {
	debug:false,
	port:null,

	start:function(){
		sTrace.port = chrome.runtime.connect({
			name:"background-msg"
		});
		sTrace.port.onMessage.addListener(sTrace.recieve);

		sTrace.send({
			"request":"connect"
		});
	},

	recieve:function(data){
		console.log(data);
	},

	send:function(data){
		sTrace.port.postMessage(data);
	}

};

sTrace.start();

try{
	$(document).ready(sTrace.WindowLoad);
} catch(e){
	showErr("Unable to load UI.");
	console.error(e);
}