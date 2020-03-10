/*
 * 	Trace error reporter script
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

"use strict";

window.onerror = function(o,r,e,c,l) {
	let n = {
		Title:(!document.title ? "" : document.title),
		Msg:o,
		Url:r,
		Line:e,
		Column:c,
		Stack:l,
		StMsg:(!l.message ? "" : l.message),
		Stck:(!l.stack ? "" : l.stack)
	};
	_UserCrashReportService(n);
};

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

let _UserCrashReportService = function(d,o){
	let report = false;

	// Check for premium override
	if (o === false){
		// Check for user consent
		report = chrome.extension.getBackgroundPage().Vars.eReporting;
		if (typeof report !== "boolean" || report !== true){
			return false;
		}
	} else {
		report = true;
	}

	let storage_type = (!window.chrome.storage.sync ? window.chrome.storage.local : window.chrome.storage.sync);
	storage_type.get('userid',function(items){

		if (typeof items === "undefined"){
			items = {'userid':"Unknown"};
		}

		let usr = items.userid;
		if (usr && usr !== "Unknown"){
			useToken(usr);
		} else {
			usr = getToken();
			storage_type.set({userid: usr},function(){
				useToken(usr);
			});
		}

		function useToken(usr){
			if (!navigator.onLine) return;

			let dataStr = "type=error";
			dataStr += "&dta=" + btoa(JSON.stringify(JSON.stringify(d)));
			dataStr += "&typ=" + btoa((o === false ? "1" : "0"));
			dataStr += "&ver=" + btoa(chrome.runtime.getManifest().version);
			dataStr += "&brw=" + btoa(navigator.userAgent);
			dataStr += "&usr=" + btoa(usr);

			$.ajax({
				url:"https://absolutedouble.co.uk/trace/app/errorscript.php",
				type:"POST",
				data:dataStr,
				timeout:20000,
				success:function(d){
					if (d !== "")
						console.log("Server Response-> " + d);
				},
				error:function(e){
					if(!navigator.onLine) return;
					if (e.status === 0) return;
					if (e.status === 403) return;
					if (e.status === 500) return;
					console.error(e);
				}
			});
		}

	});
};