/*
 * 	Trace shared UX utils
 * 	Copyright AbsoluteDouble 2018 - 2019
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

// Generate a random string of r length
var makeRandomID = function(r){
	for(var n="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
		n += t.charAt(Math.floor(Math.random()*t.length));
	}
	return n;
};

var rA = function(a){
	return a[Math.floor(Math.random() * a.length)];
};

var getToken = function(){
	var randomPool = new Uint8Array(32);
	crypto.getRandomValues(randomPool);
	var hex = '';
	for (var i = 0; i < randomPool.length; ++i) {
		hex += randomPool[i].toString(16);
	}
	return hex;
};

// Thanks to https://stackoverflow.com/a/23945027/
var extractHostname = function(url){
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
var extractRootDomain = function(url){
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

// Trace whitelist template
var ProtectionTemplate = function(defaults){
	return {
		SiteBlocked:false,
		InitRequests:true,
		Protections:{
			Pref_AudioFingerprint:defaults,
			Pref_BatteryApi:defaults,
			Pref_CanvasFingerprint: defaults,
			Pref_ClientRects:defaults,
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