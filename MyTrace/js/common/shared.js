/*
 * 	Trace shared UX utils
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

window.URL = window.URL || window.webkitURL;

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

// Polyfill: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (typeof Object.assign !== 'function') {
	Object.defineProperty(Object,"assign",{
		value:function assign(target, varArgs) {
			if (target === null || target === undefined) {
				throw new TypeError('Cannot convert undefined or null to object');
			}

			var to = Object(target);
			for (let index = 1; index < arguments.length; index++) {
				var nextSource = arguments[index];

				if (nextSource !== null && nextSource !== undefined) {
					for (let nextKey in nextSource) {
						if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
							to[nextKey] = nextSource[nextKey];
						}
					}
				}
			}
			return to;
		},
		writable:true,
		configurable:true
	});
}

// Get message for language
let lang = function(msg){
	if (!chrome.i18n) return "";
	return chrome.i18n.getMessage(msg);
};

// Generate a random string of r length
let makeRandomID = function(r){
	var n = "";
	for(let t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
		n += t.charAt(Math.floor(Math.random()*t.length));
	}
	return n;
};

// Get day month and year as strings
let getDateStrings = function(){
	let date = new Date();
	let day = date.getDate();
	let month = date.getMonth()+1;

	day.toString().length !== 2 ? day = "0" + day.toString() : 0;
	month.toString().length !== 2 ? month = "0" + month.toString() : 0;

	return [date.getFullYear().toString(),month.toString(),day.toString()];
};

let getUnixTime = function(){
	return (new Date).getTime()/1000;
};

// Find if any item in an array contains a string
let strMatchesItemInArr = function(str, arr){
	return arr.map(function(currStr){
		return str.includes(currStr);
	}).reduce(function(a, b) { return a || b; })
};

// Choose a random item from an array
let rA = function(a){
	return a[Math.floor(Math.random() * a.length)];
};

let randrange = function(l,m){
	return Math.floor(Math.random()*(m-l)+l);
};

let getToken = function(){
	var randomPool = new Uint8Array(32);
	crypto.getRandomValues(randomPool);
	var hex = '';
	for (let i = 0; i < randomPool.length; ++i) {
		hex += randomPool[i].toString(16);
	}
	return hex;
};

// Thanks to https://stackoverflow.com/a/23945027/
let extractHostname = function(url){
	var hostname;

	if (url.indexOf("://") > -1) {
		hostname = url.split('/')[2];
	} else {
		hostname = url.split('/')[0];
	}

	hostname = hostname.split(':')[0];
	hostname = hostname.split('?')[0];

	return hostname;
};
let extractRootDomain = function(url){
	var domain = extractHostname(url),
		splitArr = domain.split('.'),
		arrLen = splitArr.length;

	if (arrLen > 2) {
		domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
		if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
			domain = splitArr[arrLen - 3] + '.' + domain;
		}
	}
	return domain;
};

let getURLComponents = function(url){
	let obj = new URL(url), components = {};

	components["origin"] = obj.origin + "/*";
	components["path"] = "*" + obj + "*";
	components["host"] = "*" + extractHostname(url) + "*";
	components["root"] = "*" + extractRootDomain(url) + "*";

	return components;
};

const SettingNames = {
	"Pref_AudioFingerprint":lang("PrefNameAudioFingerprint") || "Audio Fingerprinting Protection",
	"Pref_BatteryApi":lang("PrefNameBatteryApi") || "Battery API Protection",
	"Pref_CanvasFingerprint":lang("PrefNameCanvasFingerprint") || "Canvas Fingerprinting Protection",
	"Pref_ClientRects":lang("PrefNameClientRects") || "getClientRects Protection",
	"Pref_CommonTracking":lang("PrefNameCommonTracking") || "Common Tracking Protection",
	"Pref_CookieEater":lang("PrefNameCookieEater") || "Cookie Eater",
	"Pref_ETagTrack":lang("PrefNameETagTrack") || "E-Tag Tracking Protection",
	"Pref_FontFingerprint":lang("PrefNameFontFingerprint") || "Font Fingerprinting Protection",
	"Pref_GoogleHeader":lang("PrefNameGoogleHeader") || "Google Header Removal",
	"Pref_HardwareSpoof":lang("PrefNameHardwareSpoof") || "Hardware Fingerprinting Protection",
	"Pref_IPSpoof":lang("PrefNameIPSpoof") || "Proxy IP Header Spoofing",
	"Pref_NativeFunctions":lang("PrefNameNativeFunctions") || "JS functions",
	"Pref_NetworkInformation":lang("PrefNameNetworkInformation") || "Network Information API",
	"Pref_PingBlock":lang("PrefNamePingBlock") || "Ping Protection",
	"Pref_PluginHide":lang("PrefNamePluginHide") || "JS Plugin Hide",
	"Pref_ReferHeader":lang("PrefNameReferHeader") || "Referer Controller",
	"Pref_ScreenRes":lang("PrefNameScreenRes") || "Screen Resolution Tracking",
	"Pref_UserAgent":lang("PrefNameUserAgent") || "User-Agent Randomiser",
	"Pref_WebGLFingerprint":lang("PrefNameWebGLFingerprint") || "WebGL Fingerprinting Protection",
	"Pref_WebRTC":lang("PrefNameWebRTC") || "WebRTC Protection"
};

// Trace whitelist template
let ProtectionTemplate = function(defaults){
	return {
		PresetLevel:null,
		SiteBlocked:false,
		InitRequests:true,
		Protections:{
			Pref_AudioFingerprint:defaults,
			Pref_BatteryApi:defaults,
			Pref_CanvasFingerprint: defaults,
			Pref_ClientRects:defaults,
			Pref_CommonTracking:defaults,
			Pref_CookieEater:defaults,
			Pref_ETagTrack:defaults,
			Pref_GoogleHeader:defaults,
			Pref_IPSpoof:defaults,
			Pref_NativeFunctions:defaults,
			Pref_NetworkInformation:defaults,
			Pref_HardwareSpoof:defaults,
			Pref_PingBlock:defaults,
			Pref_PluginHide:defaults,
			Pref_ReferHeader:defaults,
			Pref_ScreenRes:defaults,
			Pref_UserAgent:defaults,
			Pref_WebRTC:defaults,
			Pref_WebGLFingerprint:defaults
		}
	};
};