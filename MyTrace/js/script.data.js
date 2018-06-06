/* Copyright AbsoluteDouble Trace 2018 */
window.onerror = function(o,r,e,c,l) {
	var stmsg = "";
	var stck = "";
	if (l.message){
		stmsg = l.message;
	}
	if (l.stack){
		stck = l.stack;
	}
	var n = {
		Title:(!document.title ? "" : document.title),
		Msg:o,
		Url:r,
		Line:e,
		Column:c,
		Stack:l,
		StMsg:stmsg,
		Stck:stck
	};
	_UserCrashReportService(n);
};

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}
var storage_type = (!window.chrome.storage.sync ? window.chrome.storage.local : window.chrome.storage.sync);

var _UserCrashReportService = function(d,o){

	var report = false;

	// Check for premium override
	if (o === false){
		// Check for user consent
		report = chrome.extension.getBackgroundPage().Trace.v.eReporting;
		if (typeof report !== "boolean" || report !== true){
			return false;
		}
	} else {
		report = true;
	}

	storage_type.get('userid',function(items){

		if (typeof items === "undefined"){
			items = {'userid':"Unknown"};
		}

		var usr = items.userid;
		if (usr){
			useToken(usr);
		} else {
			usr = token();
			storage_type.set({userid: usr},function(){
				useToken(usr);
			});
		}

		function useToken(usr){
			if (!navigator.onLine) return;

			var dataStr = "type=error";
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
var token = function(){
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    return hex;
};