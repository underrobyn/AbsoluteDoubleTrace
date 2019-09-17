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

var TraceBg = chrome.runtime.getBackgroundPage;

// Localstorage functions
var ls = {
	supported:false,

	IsSupported:function(){
		ls.supported = (typeof Storage !== "undefined" && typeof localStorage !== "undefined" && localStorage !== null);
	},

	Store:function(key,value){
		if (!ls.supported) return;

		try {
			localStorage.setItem(key,value);
		} catch(e) {
			if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED'){
				alert("Your localStorage is full, please increase the size.");
				console.error(e);
			} else {
				_UserCrashReportService(e);
			}
		}
	},
	Read:function(key){
		var ret = null;

		try {
			ret = localStorage.getItem(key);
		} catch(e) {
			if (e.name === 'NS_ERROR_FILE_CORRUPTED'){
				alert("Your localStorage is corrupt, Trace may not function correctly as a result.");
				console.error(e);
			} else {
				_UserCrashReportService(e);
			}
		}

		return ret;
	}
};

// UI event to trigger a click handle on "enter" key press
var EnterTriggerClick = function(e) {
	if(e.which === 13) {
		$(this).trigger('enter');
	}
};

var backgroundConnectCheck = function(){
	TraceBg(function(bg){
		if (bg === null){
			showErr("Extension failed to connect to background page. This may be caused if you're running Trace in normal and private browsing at the same time.");
		}
	});
};