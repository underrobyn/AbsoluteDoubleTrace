/* Copyright AbsoluteDouble Trace 2018 */

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}

chrome.storage.local.get(["Main_Interface"],function(items){
	if (items.Main_Interface.enabled !== true) return;

	// Set theme for window
	document.body.className = items.Main_Interface.Theme.name + "_theme";

	var timeAlterThemes = ["tracedefault"];
	if (items.Main_Interface.Theme.timealterations === true && timeAlterThemes.indexOf(items.Main_Interface.Theme.name) !== -1){
		var h = new Date().getHours();
		if (h >= 19 || h <= 8){
			var timeTheme = Math.floor(Math.random() * 3) + 1;
			document.body.className = items.Main_Interface.Theme.name + "_timealteration" + timeTheme;
		}
	}
});