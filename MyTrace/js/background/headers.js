var Headers = {

	Helpers:{
		// URL that made the request (Cross browser solution)
		getInitiator:function(request){
			if (typeof request.initiator === "string") return request.initiator;	// Chrome, Opera...
			if (typeof request.originUrl === "string") return request.originUrl;	// Firefox
			if (typeof request.url === "string") return request.url;				// Started by user

			return "";
		},
		isRequestThirdParty:function(request){
			var reqUrl = extractRootDomain(request.url);
			var reqIni = extractRootDomain(Headers.Helpers.getInitiator(request));

			return reqIni !== reqUrl;
		}
	},

	Cookie:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Cookie Header Protection.");
			if (!chrome.webRequest) return;

			var cookieOpt_extraInfoSpec = ["blocking","requestHeaders"];
			var setCookieOpt_extraInfoSpec = ["responseHeaders"];

			// In Chrome 72+ Google requires we add extraHeaders to modify Cookie, Set-Cookie and Referer Headers
			if (chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty('EXTRA_HEADERS')) cookieOpt_extraInfoSpec.push("extraHeaders");
			if (chrome.webRequest.OnHeadersReceivedOptions.hasOwnProperty('EXTRA_HEADERS')) setCookieOpt_extraInfoSpec.push("extraHeaders");

			chrome.webRequest.onBeforeSendHeaders.addListener(
				Headers.Cookie.ModifySend,
				{urls:["http://*/*","https://*/*"]},
				cookieOpt_extraInfoSpec
			);
			chrome.webRequest.onHeadersReceived.addListener(
				Headers.Cookie.ModifyRecv,
				{urls:["http://*/*","https://*/*"]},
				setCookieOpt_extraInfoSpec
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onBeforeSendHeaders.removeListener(Headers.Cookie.ModifySend);
				chrome.webRequest.onHeadersReceived.removeListener(Headers.Cookie.ModifyRecv);
			}catch(e){
				console.error(e);
			}
		},
		ModifySend:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			// Do a large amount of checks to see if we are gonna edit these cookies
			if (Prefs.Current.Pref_CookieEater.enabled !== true) return;

			var settings = Prefs.Current.Pref_CookieEater.settings.cookie;

			if (settings.enabled !== true) return;
			if (settings.fp_method === "nothing" && settings.tp_method === "nothing") return;

			if (details.frameId < 0) return;
			if (details.url.substring(0,4).toLowerCase() !== "http") return;

			if (!Whitelist.CheckWhitelist(details.url,"Pref_CookieEater")) return;

			var cookieList = Trace.g.CookieEater.GetList();
			var method = "fp_method";

			if (Headers.Helpers.isRequestThirdParty(details)) {
				method = "tp_method";
			}

			// Loop each header
			for (var i=0;i<details.requestHeaders.length;++i){
				var headerName = details.requestHeaders[i].name.toString().toLowerCase();

				if (headerName !== "cookie") continue;

				var cp = new CookieParser(details.requestHeaders[i].value);
				var os = details.requestHeaders[i].value;

				if (settings[method] === "removeall"){
					details.requestHeaders.splice(i,1);
					Tabs.LogHeaders(details.tabId,"cookies");
				} else if (settings[method] === "randomiseall"){
					cp.updateAllCookies(function(){
						return makeRandomID(15);
					});
					details.requestHeaders[i].value = cp.getString();
					Tabs.LogHeaders(details.tabId,"cookies");
				} else if (settings[method] === "remove"){
					cp.removeCookies(cookieList);
					details.requestHeaders[i].value = cp.getString();
				} else if (settings[method] === "randomise"){
					cp.updateCookies(cookieList,function(){
						return makeRandomID(15);
					});
					details.requestHeaders[i].value = cp.getString();
				}

				break;
			}

			return {requestHeaders:details.requestHeaders};
		},
		ModifyRecv:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			// Do a large amount of checks to see if we are gonna edit these set-cookies
			if (Prefs.Current.Pref_CookieEater.enabled !== true) return;

			var settings = Prefs.Current.Pref_CookieEater.settings.setcookie;

			if (settings.enabled !== true) return;
			if (settings.fp_method === "nothing" && settings.tp_method === "nothing") return;

			if (details.frameId < 0) return;
			if (details.url.substring(0,4).toLowerCase() !== "http") return;

			if (!Whitelist.CheckWhitelist(details.url,"Pref_CookieEater")) return;

			var cookieList = Trace.g.CookieEater.GetList();
			var method = "fp_method";

			if (Headers.Helpers.isRequestThirdParty(details)) {
				method = "tp_method";
			}

			// Loop each header
			for (var i=0;i<details.responseHeaders.length;++i){
				var headerName = details.responseHeaders[i].name.toString().toLowerCase();

				// Remove bad response headers
				if (headerName !== "set-cookie") continue;

				var p = new SetCookieParser(details.responseHeaders[i].value);

				if (settings[method] === "removeall"){
					details.responseHeaders.splice(i,1);
					Tabs.LogHeaders(details.tabId,"setcookie");
				} else if (settings[method] === "randomiseall"){
					p.updateCookie(makeRandomID(15));
					details.responseHeaders[i].value = p.setcookie;
					Tabs.LogHeaders(details.tabId,"setcookie");
				} else if (settings[method] === "remove"){
					if (cookieList.indexOf(p.cookiename) !== -1){
						details.responseHeaders.splice(i,1);
						Tabs.LogHeaders(details.tabId,"setcookie");
					}
				} else if (settings[method] === "randomise"){
					if (cookieList.indexOf(p.cookiename) !== -1){
						p.updateCookie(makeRandomID(15));
						details.responseHeaders[i].value = p.setcookie;
						Tabs.LogHeaders(details.tabId,"setcookie");
					}
				}
			}

			return {responseHeaders:details.responseHeaders};
		}
	},

	Etag:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started E-Tag Protection.");
			chrome.webRequest.onHeadersReceived.addListener(
				Headers.Etag.Modify,
				{urls:["http://*/*","https://*/*"]},
				["responseHeaders"]
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onHeadersReceived.removeListener(Headers.Etag.Modify);
			}catch(e){
				console.error(e);
			}
		},
		Modify:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			if (Prefs.Current.Pref_ETagTrack.enabled !== true) return;

			if (details.frameId < 0) return;
			if (details.url.substring(0,4).toLowerCase() !== "http") return;

			if (!Whitelist.CheckWhitelist(details.url,"Pref_ETagTrack")) return;

			for (var i=0;i<details.responseHeaders.length;++i){
				var headerName = details.responseHeaders[i].name.toString().toLowerCase();

				// Skip headers that aren't etag
				if (headerName !== "etag") continue;

				details.responseHeaders.splice(i,1);
				Tabs.LogHeaders(details.tabId,"etag");

				break;
			}

			return {responseHeaders:details.responseHeaders};
		}
	},

	Google:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started Google Header Protection.");
			if (!chrome.webRequest) return;
			chrome.webRequest.onBeforeSendHeaders.addListener(
				Headers.Google.Modify,
				{urls:["<all_urls>"]},
				["blocking","requestHeaders"]
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onBeforeSendHeaders.removeListener(Headers.Google.Modify);
			}catch(e){
				console.error(e);
			}
		},
		Modify:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			var opts = Prefs.Current.Pref_GoogleHeader;

			// Check if we have any modifications to make, if not then don't waste resources
			var ghm = (
				(opts.rmChromeConnected.enabled === true) ||
				(opts.rmChromeUMA.enabled === true) ||
				(opts.rmChromeVariations.enabled === true) ||
				(opts.rmClientData.enabled === true)
			);
			if (opts.enabled !== true && ghm !== true) {
				return {requestHeaders:details.requestHeaders};
			}

			if (!Whitelist.CheckWhitelist(details.url,"Pref_GoogleHeader")) return;

			for (var i=0;i<details.requestHeaders.length;++i) {
				var headerName = details.requestHeaders[i].name.toString().toLowerCase();

				if (opts.rmChromeConnected.enabled === true) {
					if (headerName === "x-chrome-connected") {
						console.log("Removed x-c-c");
						details.requestHeaders.splice(i, 1);
						Tabs.LogHeaders(details.tabId,"google");
						continue;
					}
				}
				if (opts.rmChromeUMA.enabled === true) {
					if (headerName === "x-chrome-uma-enabled") {
						details.requestHeaders.splice(i, 1);
						Tabs.LogHeaders(details.tabId,"google");
						continue;
					}
				}
				if (opts.rmChromeVariations.enabled === true) {
					if (headerName === "x-chrome-variations") {
						console.log("Removed x-c-v");
						details.requestHeaders.splice(i, 1);
						Tabs.LogHeaders(details.tabId,"google");
						continue;
					}
				}
				if (opts.rmClientData.enabled === true) {
					if (headerName === "x-client-data") {
						details.requestHeaders.splice(i, 1);
						Tabs.LogHeaders(details.tabId,"google");
					}
				}
			}

			// Return new headers to be sent
			return {requestHeaders:details.requestHeaders};
		}
	},

	IPSpoof:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started IPSpoof Protection.");
			if (!chrome.webRequest) return;
			chrome.webRequest.onBeforeSendHeaders.addListener(
				Headers.IPSpoof.Modify,
				{urls:["<all_urls>"]},
				["blocking","requestHeaders"]
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onBeforeSendHeaders.removeListener(Headers.IPSpoof.Modify);
			}catch(e){
				console.error(e);
			}
		},
		Modify:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			if (Prefs.Current.Pref_IPSpoof.enabled !== true){
				return {requestHeaders:details.requestHeaders};
			}

			if (!Whitelist.CheckWhitelist(details.url,"Pref_IPSpoof")) return;

			// Attempt forge IP
			if (Prefs.Current.Pref_IPSpoof.useClientIP.enabled === true){
				details.requestHeaders.push({
					"name":"Client-IP",
					"value":Trace.i.CurrentFakeIP
				});
			}
			if (Prefs.Current.Pref_IPSpoof.useForwardedFor.enabled === true){
				details.requestHeaders.push({
					"name":"X-Forwarded-For",
					"value":Trace.i.CurrentFakeIP
				});
			}
			if (Prefs.Current.Pref_IPSpoof.useForwardedFor.enabled === true){
				details.requestHeaders.push({
					"name":"Via",
					"value":Trace.i.CurrentViaHeader
				});
			}

			Tabs.LogHeaders(details.tabId,"proxyip");

			// Return new headers to be sent
			return {requestHeaders:details.requestHeaders};
		}
	},

	Referer:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started Referer Header Protection.");
			if (!chrome.webRequest) return;

			var refererOpt_extraInfoSpec = ["blocking","requestHeaders"];

			// In Chrome 72+ Google requires we add extraHeaders to modify Cookie, Set-Cookie and Referer Headers
			if (chrome.webRequest.OnBeforeSendHeadersOptions.hasOwnProperty('EXTRA_HEADERS')) refererOpt_extraInfoSpec.push("extraHeaders");

			chrome.webRequest.onBeforeSendHeaders.addListener(
				Headers.Referer.Modify,
				{urls:["<all_urls>"]},
				refererOpt_extraInfoSpec
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onBeforeSendHeaders.removeListener(Headers.Referer.Modify);
			}catch(e){
				console.error(e);
			}
		},
		Modify:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			if (Prefs.Current.Pref_ReferHeader.enabled !== true){
				return {requestHeaders:details.requestHeaders};
			}

			if (!Whitelist.CheckWhitelist(details.url,"Pref_ReferHeader")) return;

			var s = Prefs.Current.Pref_ReferHeader.httpHeader;

			// Loop each header
			for (var i=0;i<details.requestHeaders.length;++i){
				var headerName = details.requestHeaders[i].name.toString().toLowerCase();

				if (headerName !== "referer") continue;

				//console.log("Referer->",details.url,details.requestHeaders[i].value.toString().toLowerCase());
				Tabs.LogHeaders(details.tabId,"referer");

				// Allow only secure origins
				if (Prefs.Current.Pref_ReferHeader.httpHeader.onlySecureOrigins.enabled){
					if (details.url.substr(0,5) !== "https"){
						details.requestHeaders.splice(i,1);
						break;
					}
				}

				// Break out of loop if these conditions are met
				var headerVal = details.requestHeaders[i].value.toString();
				var hostname = extractHostname(headerVal);
				var sameHost = hostname === extractHostname(details.url);
				var sameRoot = extractRootDomain(headerVal) === extractRootDomain(details.url);

				if (sameHost){
					if (s.allowSameHost.enabled){
						if (s.allowSameHost.fullUrl !== true){
							details.requestHeaders[i].value = hostname;
						}
						break;
					}
				}

				if (sameRoot){
					if (s.allowSameDomain.enabled){
						if (s.allowSameDomain.fullUrl !== true){
							details.requestHeaders[i].value = hostname;
						}
						break;
					}
				}

				if (!sameRoot && !sameHost){
					if (s.allowThirdParty.enabled){
						if (s.allowThirdParty.fullUrl !== true){
							details.requestHeaders[i].value = hostname;
						}
						break;
					}
				}

				// If loop hasn't broke yet then remove the header
				details.requestHeaders.splice(i,1);
				break;
			}

			// Return new headers to be sent
			return {requestHeaders:details.requestHeaders};
		}
	},

	UserAgent:{
		Start:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started User-Agent Header Protection.");
			if (!chrome.webRequest) return;
			chrome.webRequest.onBeforeSendHeaders.addListener(
				Headers.UserAgent.Modify,
				{urls:["<all_urls>"]},
				["blocking","requestHeaders"]
			);
		},
		Stop:function(){
			try{
				chrome.webRequest.onBeforeSendHeaders.removeListener(Headers.UserAgent.Modify);
			}catch(e){
				console.error(e);
			}
		},
		Modify:function(details){
			// Check if Trace is paused
			if (Vars.paused !== false) return;

			if (Prefs.Current.Pref_UserAgent.enabled 	!== true){
				return {requestHeaders:details.requestHeaders};
			}

			if (!Whitelist.CheckWhitelist(details.url,"Pref_UserAgent")) return;

			for (var i=0;i<details.requestHeaders.length;++i){
				var headerName = details.requestHeaders[i].name.toString().toLowerCase();

				// Skip headers that aren't user agent
				if (headerName !== "user-agent") continue;

				// Change header then break
				if (details.requestHeaders[i].value !== Vars.useragent){
					details.requestHeaders[i].value = Vars.useragent;
					Tabs.LogHeaders(details.tabId,"useragent");
				}
				break;
			}

			// Return new headers to be sent
			return {requestHeaders:details.requestHeaders};
		}
	}
};