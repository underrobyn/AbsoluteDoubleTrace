/*
 * 	Trace theme engine script
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

let reloadTheme = function(){
	if (!chrome.hasOwnProperty("storage")) return;
	chrome.storage.local.get(["Main_Interface"],function(items){
		if (items.Main_Interface.enabled !== true) return;

		if (items.Main_Interface.Theme.name === "default") items.Main_Interface.Theme.name = "tracedefault";

		let theme = items.Main_Interface.Theme.name + "_theme";

		// Set theme for window
		let timeAlterThemes = ["tracedefault"];
		if (items.Main_Interface.Theme.timeAlterations === true && timeAlterThemes.indexOf(items.Main_Interface.Theme.name) !== -1){
			let h = new Date().getHours();
			if (h >= 19 || h <= 8){
				let timeTheme = Math.floor(Math.random() * 3) + 1;
				theme = items.Main_Interface.Theme.name + "_timealteration" + timeTheme;
			}
		}

		if (items.Main_Interface.Theme.navPlacement !== "nav_left"){
			theme += " " + items.Main_Interface.Theme.navPlacement;
		}

		document.body.className = theme;
	});
};
reloadTheme();