/* Copyright AbsoluteDouble Trace 2018 */

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}

var Trace = {

	DEBUG:true,

	Notify:function(msg,sect){
		if (Trace.v.bNotifications === false){
			if (Trace.DEBUG) console.info("[%s]-> !(%s)",sect,msg);
			return;
		}

		if (Trace.DEBUG) console.info("[%s]-> Notified: %s",sect,msg);

		var opts = {
			"type":"basic",
			"message":msg,
			"title":"Trace",
			"iconUrl":Trace.v.notifIcon
		};
		try {
			chrome.notifications.create("notification",opts);
		} catch(e){
			console.log("Looks like notifications aren't actually allowed at a browser level.");
		}
	},

	// Choose a random number between two values
	Rand:function(l,m){
		return Math.floor(Math.random()*(m-l)+l);
	},

	// Generate a random string of r length
	makeRandomID:function(r){
		for(var n="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
			n += t.charAt(Math.floor(Math.random()*t.length));
		}
		return n;
	},

	// Chrome runtime functions
	a:{
		AssignRuntime:function(){
			if (/Chrome/.test(navigator.userAgent) && !(/Edge/.test(navigator.userAgent))) {
				chrome.runtime.onSuspend.addListener(Trace.a.SuspendSave);
				try {
					chrome.runtime.setUninstallURL("https://absolutedouble.co.uk/trace/uninstall.html",function(){
						if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL");
					});
				} catch(e){
					chrome.runtime.setUninstallURL("https://absolutedouble.co.uk/trace/uninstall.html");
					if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL using method 2");
				}
			}
		},
		NewInstall:function(details){
			// If this is a new install, open welcome page and set default settings
			if (details.reason && details.reason === "install"){
				Trace.p.SetDefaults();
				Trace.v.s.set({"trace_installdate":Trace.s.GenTime()[0]});
				Trace.s.SaveStats();
				Trace.b.BlocklistLoader(true);
				chrome.tabs.create({url:"/html/options.html#newinstall"});
			} else if (details.reason && details.reason === "update") {
				if (Trace.DEBUG) console.info("[mangd]-> Updated from: " + details.previousVersion);
			}
		},
		SuspendSave:function(){
			if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === true){
				Trace.s.SaveStats();
			}
		},
		ContentTalk:function(request, sender, sendResponse){
			//if (Trace.DEBUG) console.log("[TracePage] " + sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
			if (request.msg === "uaReq"){
				sendResponse({r:Trace.n.ua});
			} else {
				console.error("Invalid message recieved");
			}
		}
	},

	// Variables
	v:{
		eReporting:false,
		bNotifications:false,
		UserAgentInterval:1,
		FakeIPInterval:1,
		Premium:"",
		s:(/Edge/.test(navigator.userAgent) ? browser.storage.local : chrome.storage.local),
		blocklistURL:"https://absolutedouble.co.uk/trace/app/weblist.php",
		blocklistFallback:"https://raw.githubusercontent.com/jake-cryptic/hmfp_lists/master/fallback.json",
		blocklistBase:"https://absolutedouble.co.uk/trace/app/weblist.php?p=",
		notifIcon:"icons/trace_256.png",
		uaSettings:{
			"os": {
				"windows":{
					"Windows 10 (x64)": "Windows NT 10.0; Win64; x64",
					"Windows 10 (x86)": "Windows NT 10.0; en-US",
					"Windows 8.1 (x64)":"Windows NT 6.3; Win64; x64",
					"Windows 8.1 (x86)":"Windows NT 6.3; en-US",
					"Windows 8 (x64)":"Windows NT 6.2; Win64; x64",
					"Windows 8 (x86)":"Windows NT 6.2; en-US",
					"Windows 7 (x64)":"Windows NT 6.1; Win64; x64",
					"Windows 7 (x86)":"Windows NT 6.1; en-US",
					"Windows Vista (x64)":"Windows NT 6.1; Win64; x64",
					"Windows Vista (x86)":"Windows NT 6.0; en-US"
				},
				"linux":{
					"linux 64bit":"X11; Linux x86_64",
					"linux 32bit":"X11; Linux x86_32"
				},
				"macos":{
					"macos High Sierra":"Macintosh; U; Intel Mac OS X 10_13",
					"macos Sierra":"Macintosh; U; Intel Mac OS X 10_12_2",
					"MacOS El Capitan":"Macintosh; Intel Mac OS X 10_11_6",
					"MacOS Yosemite":"Macintosh; U; Intel Mac OS X 10_10_5"
				}
			},
			"wb":{
				"chrome":{
					"67":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.79 Safari/537.36",
					"66":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36",
					"65":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36",
					"64":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.4096.9 Safari/537.36",
					"63":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36"
				},
				"firefox":{
					"62":"Gecko/20100101 Firefox/62.0",
					"61":"Gecko/20100101 Firefox/61.0",
					"59":"Gecko/20100101 Firefox/59.0",
					"57":"Gecko/20100101 Firefox/57.0",
					"53":"Gecko/20100101 Firefox/55.03"
				},
				"vivaldi":{
					"1.95":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.189 Safari/537.36 Vivaldi/1.95.1077.60"
				},
				"opera":{
					"51":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36 OPR/51.0.2830.55"
				},
				"edge":{
					"17":"Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134",
					"15":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2743.116 Safari/537.36 Edge/15.15063",
					"14":" AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/14.14359"
				},
				"safari":{
					"10.1":"AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.1 Safari/603.1.30",
					"10.03":"AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8"
				}
			}
		}
	},

	// Misc
	n:{
		appSecret:"Cza7kImqFYZPrbGq76PY8I9fynasuWyEoDtY4L9U0zgIACb2t9vpn2sO4eHcS0Co",		// Is this pointless? Yes. Do I care? No.
		callbacks:[],
		ua:"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0",

		// Thanks to https://stackoverflow.com/a/23945027/
		extractHostname:function(url){
			var hostname;

			if (url.indexOf("://") > -1) {
				hostname = url.split('/')[2];
			} else {
				hostname = url.split('/')[0];
			}

			hostname = hostname.split(':')[0];
			hostname = hostname.split('?')[0];

			return hostname;
		},
		extractRootDomain:function(url){
			var domain = Trace.n.extractHostname(url),
				splitArr = domain.split('.'),
				arrLen = splitArr.length;

			if (arrLen > 2) {
				domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
				if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
					domain = splitArr[arrLen - 3] + '.' + domain;
				}
			}
			return domain;
		},

		// Thanks to https://github.com/Olical/binary-search/blob/master/src/binarySearch.js
		arraySearch:function(list,item){
			if (!list || !item) {
				console.error("No param");
				return -1;
			}

			var min = 0;
			var max = list.length - 1;
			var guess;

			var bitwise = ((max <= 2147483647) ? true : false);
			if (bitwise) {
				while (min <= max) {
					guess = (min + max) >> 1;
					if (list[guess] === item) {
						return guess;
					} else {
						if (list[guess] < item) {
							min = guess + 1;
						} else {
							max = guess - 1;
						}
					}
				}
			} else {
				while (min <= max) {
					guess = Math.floor((min + max) / 2);
					if (list[guess] === item) {
						return guess;
					} else {
						if (list[guess] < item) {
							min = guess + 1;
						} else {
							max = guess - 1;
						}
					}
				}
			}

			return -1;
		},
		quickSearch:function(list,item){
			var l = list.length, c = 0;
			while (c < l) {
				if (list[c] === item) return c;
				c++;
			}
			return -1;
		}
	},

	// Functions
	f:{
		StartTrace:function(){
			// Load settings
			Trace.p.Load(function(){
				Trace.f.StartModules();
			});
		},
		StartModules:function(){
			// Load some settings into program
			Trace.v.bNotifications = Trace.p.Current.Main_Trace.BrowserNotifications.enabled;
			Trace.v.eReporting = Trace.p.Current.Main_Trace.ErrorReporting.enabled;
			Trace.v.Premium = Trace.p.Current.Main_Trace.PremiumCode;
			Trace.DEBUG = Trace.p.Current.Main_Trace.DebugApp.enabled;

			// It's time to begin
			Trace.Notify("Starting Modules...","initd");

			// Load statistics into program
			if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === true)
				Trace.s.LoadStats();

			// Assign keyboard shortcuts
			if (chrome.commands){
				if (Trace.DEBUG) console.log("[commd]-> Assigned commands event");
				chrome.commands.onCommand.addListener(Trace.f.KeyboardCommand);
			}

			// Ping blocks
			Trace.b.ToggleBlockPings();

			if (Trace.p.Current.Pref_WebController.enabled === true){
				if (Trace.p.Current.Pref_WebController.Whitelist.enabled === true) {
					Trace.c.LoadWhitelist();
				}
				Trace.d.AssignChecker();
				Trace.d.LoadBlacklist();
			}

			// Any pre-header modifications start here
			if (Trace.p.Current.Pref_UserAgent.enabled === true || Trace.p.Current.Pref_GoogleHeader.enabled === true || Trace.p.Current.Pref_IPSpoof.enabled === true)
				Trace.f.StartHeaderModification();

			// Any post-header modifications start here
			if (Trace.p.Current.Pref_ETagTrack.enabled === true)
				Trace.f.StartEtagProtection();

			// Alarm events to change UserAgent
			Trace.f.StartAlarmEvent();

			// Toggle User-Agent protection (background task)
			Trace.f.ToggleUserAgentRandomiser(true);

			// Toggle WebRTC protection
			Trace.f.ToggleWebRtc();

			// Toggle IPSpoof
			Trace.i.ToggleIPSpoof(true);

			// Cleanup (Don't care if it fails)
			try {
				Trace.v.s.remove(["db_type","domain_db","db_version","adv_prefs_ipspoof"]);
			}catch(e){}

			// Tell the user that we're done!
			Trace.Notify("Finished setting up.","initd");
		},
		KeyboardCommand:function(c){
			// This function is called whenever a keyboard shortcut is pressed
			if (Trace.p.Current.Main_Trace.KeyboardCommand.enabled !== true){
				return;
			}

			if (Trace.DEBUG) console.log("[commd]-> User Command:",c);
			if (c === "ToggleTraceWeb"){
				if (Trace.DEBUG) console.info("Toggled Trace Web");
				Trace.p.ToggleSetting("Pref_WebController");
			} else if (c === "ForceBlocklistUpdate") {
				if (Trace.DEBUG) console.info("Forcing the blocklist to update");
				Trace.b.BlocklistLoader(true);
			} else if (c === "OpenTraceSettings") {
				if (Trace.DEBUG) console.info("Opening Trace's settings");
				chrome.tabs.create({url:"/html/options.html"});
			} else {
				Trace.Notify("Unknown Command","commd");
			}
		},
		ToggleUserAgentRandomiser:function(onlyStart){
			if (Trace.p.Current.Pref_UserAgent.enabled === true){
				// Create random user agent
				Trace.n.ua = Trace.f.ChooseUserAgent();

				// Assign browser event
				chrome.alarms.create("UserAgentRefresh",{periodInMinutes: Trace.v.UserAgentInterval});
			} else {
				if (!onlyStart){
					chrome.alarms.clear("UserAgentRefresh",function(success) {
						if (!success) Trace.Notify("Failed to stop user-agent refresh process (It probably wasn't running)","uabgd");
					});
				}
			}
		},
		ChooseUserAgent:function(){
			var rA = function(a){
				return a[Math.floor(Math.random() * a.length)];
			};
			//if (Trace.p.Current.Pref_UserAgent.uaCust.customUAs === true){
				// Choose OS
				var uaOSPool = [];
				if (Trace.p.Current.Pref_UserAgent.uaOSConfig.AllowLinux.enabled === true){
					uaOSPool = uaOSPool.concat(Object.values(Trace.v.uaSettings.os.linux));
				}
				if (Trace.p.Current.Pref_UserAgent.uaOSConfig.AllowMac.enabled === true){
					uaOSPool = uaOSPool.concat(Object.values(Trace.v.uaSettings.os.macos));
				}
				if (Trace.p.Current.Pref_UserAgent.uaOSConfig.AllowWindows.enabled === true){
					uaOSPool = uaOSPool.concat(Object.values(Trace.v.uaSettings.os.windows));
				}

				// Choose browser
				var uaWBPool = [];
				if (Trace.p.Current.Pref_UserAgent.uaWBConfig.AllowChrome.enabled === true){
					uaWBPool = uaWBPool.concat(Object.values(Trace.v.uaSettings.wb.chrome));
				}
				if (Trace.p.Current.Pref_UserAgent.uaWBConfig.AllowFirefox.enabled === true){
					uaWBPool = uaWBPool.concat(Object.values(Trace.v.uaSettings.wb.firefox));
				}
				if (Trace.p.Current.Pref_UserAgent.uaWBConfig.AllowEdge.enabled === true){
					uaWBPool = uaWBPool.concat(Object.values(Trace.v.uaSettings.wb.edge));
				}
				if (Trace.p.Current.Pref_UserAgent.uaWBConfig.AllowSafari.enabled === true){
					uaWBPool = uaWBPool.concat(Object.values(Trace.v.uaSettings.wb.safari));
				}
				if (Trace.p.Current.Pref_UserAgent.uaWBConfig.AllowVivaldi.enabled === true){
					uaWBPool = uaWBPool.concat(Object.values(Trace.v.uaSettings.wb.vivaldi));
				}

				return "Mozilla/5.0 (" + rA(uaOSPool) + ") " + rA(uaWBPool);
			//} else {
			//	return Trace.p.Current.Pref_UserAgent.uaCust.customUAs[Math.floor((Math.random() * Trace.p.Current.Pref_UserAgent.uaCust.customUAs.length))];
			//}
		},
		StartAlarmEvent:function(){
			chrome.alarms.onAlarm.addListener(function(a){
				if (a.name === "UserAgentRefresh" && Trace.p.Current.Pref_UserAgent.enabled === true){
					Trace.n.ua = Trace.f.ChooseUserAgent();
				}
				if (a.name === "StatsDatabaseRefresh" && Trace.p.Current.Main_Trace.ProtectionStats.enabled === true){
					Trace.s.SaveStats();
				}
				if (a.name === "UserFakeIPRefresh" && Trace.p.Current.Pref_IPSpoof.enabled === true){
					if (Trace.p.Current.Pref_IPSpoof.traceIP.enabled === true){
						Trace.i.StopIPRefresh();
						return;
					}
					Trace.i.RefreshFakeUserIP();
				} else if (a.name === "UserFakeIPRefresh" && Trace.p.Current.Pref_IPSpoof.enabled !== true){
					Trace.i.StopIPRefresh();
				}
			});
		},
		StartHeaderModification:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started Pre-Header Protection.");
			if (!chrome.webRequest) return;

			chrome.webRequest.onBeforeSendHeaders.addListener(
				function(details){
					// Check if we have any modifications to make, if not then don't waste resources
					var ghm = (
						(Trace.p.Current.Pref_GoogleHeader.rmChromeConnected.enabled === true) ||
						(Trace.p.Current.Pref_GoogleHeader.rmChromeUMA.enabled === true) ||
						(Trace.p.Current.Pref_GoogleHeader.rmChromeVariations.enabled === true) ||
						(Trace.p.Current.Pref_GoogleHeader.rmClientData.enabled === true)
					);
					if (
						Trace.p.Current.Pref_GoogleHeader.enabled !== true &&
						Trace.p.Current.Pref_UserAgent.enabled 	!== true &&
						Trace.p.Current.Pref_IPSpoof.enabled !== true &&
						Trace.p.Current.Pref_CookieEater.enabled !== true &&
						ghm !== true
					){
						return {requestHeaders:details.requestHeaders};
					}

					for (var i=0;i<details.requestHeaders.length;++i){
						headerName = details.requestHeaders[i].name.toString().toLowerCase();

						// Remove bad headers
						if (Trace.p.Current.Pref_GoogleHeader.enabled === true && ghm === true){
							if (Trace.p.Current.Pref_GoogleHeader.rmChromeConnected.enabled === true){
								if (headerName === "x-chrome-connected"){
									details.requestHeaders.splice(i,1);
									continue;
								}
							}
							if (Trace.p.Current.Pref_GoogleHeader.rmChromeUMA.enabled === true){
								if (headerName === "x-chrome-uma-enabled"){
									details.requestHeaders.splice(i,1);
									continue;
								}
							}
							if (Trace.p.Current.Pref_GoogleHeader.rmChromeVariations.enabled === true){
								if (headerName === "x-chrome-variations"){
									details.requestHeaders.splice(i,1);
									continue;
								}
							}
							if (Trace.p.Current.Pref_GoogleHeader.rmClientData.enabled === true){
								if (headerName === "x-client-data"){
									details.requestHeaders.splice(i,1);
									continue;
								}
							}
						}

						// Change user agent
						if (Trace.p.Current.Pref_UserAgent.enabled === true){
							if (headerName === "user-agent"){
								if (details.requestHeaders[i].value !== Trace.n.ua){
									details.requestHeaders[i].value = Trace.n.ua;
								}
							}
						}
					}

					// Attempt forge IP
					if (Trace.p.Current.Pref_IPSpoof.enabled === true){
						if (Trace.p.Current.Pref_IPSpoof.useClientIP.enabled === true){
							details.requestHeaders.push({
								"name":"Client-IP",
								"value":Trace.i.CurrentFakeIP
							});
						}
						if (Trace.p.Current.Pref_IPSpoof.useForwardedFor.enabled === true){
							details.requestHeaders.push({
								"name":"X-Forwarded-For",
								"value":Trace.i.CurrentFakeIP
							});
						}
						if (Trace.p.Current.Pref_IPSpoof.useForwardedFor.enabled === true){
							details.requestHeaders.push({
								"name":"Via",
								"value":Trace.i.CurrentViaHeader
							});
						}
					}

					// Return new headers to be sent
					return {requestHeaders:details.requestHeaders};
				},
				{urls:["<all_urls>"]},
				["blocking","requestHeaders"]
			);
		},
		StartEtagProtection:function(){
			if (Trace.DEBUG) console.log("[httpd]-> Started E-Tag Protection.");
			chrome.webRequest.onHeadersReceived.addListener(
				Trace.f.RemoveEtags,
				{urls:["http://*/*","https://*/*"]},
				["responseHeaders"]
			);
		},
		StopEtagProtection:function(){
			try{
				chrome.webRequest.onHeadersReceived.removeListener(Trace.f.RemoveEtags);
			}catch(e){
				console.error(e);
			}
		},
		RemoveEtags:function(details){
			if (Trace.p.Current.Pref_ETagTrack.enabled !== true) return;
			if (details.frameId < 0) return;
			if (details.url.substring(0,4).toLowerCase() !== "http" && details.url.substring(0,5).toLowerCase() !== "https") return;

			// Headers to remove
			var badHeaders = ["etag"];

			for (var i=0;i<details.responseHeaders.length;++i){
				headerName = details.responseHeaders[i].name.toString().toLowerCase();

				// Remove bad response headers
				if (Trace.p.Current.Pref_ETagTrack.enabled === true){
					if (badHeaders.indexOf(headerName) !== -1){
						details.responseHeaders.splice(i,1);
						details.responseHeaders.push({name:"Pragma",value:"no-cache"});
					}
				}
			}

			return {responseHeaders:details.responseHeaders};
		},
		ToggleWebRtc:function(){
			if (!window.chrome.privacy) alert("Trace encountered an error: Couldn't access Privacy API.");
			if (!chrome.privacy.network.webRTCIPHandlingPolicy) {
				Trace.Notify("WebRTC Setting requires Chrome 48 or newer.");
				return false;
			}

			chrome.privacy.network.webRTCIPHandlingPolicy.set({
				value:((Trace.p.Current.Pref_WebRTC.enabled && Trace.p.Current.Pref_WebRTC.wrtcInternal.enabled) ? "default_public_interface_only" : "default")
			});
		},
		RemovePremium:function(){
			Trace.p.SetSetting("Main_Trace.PremiumCode","");
			Trace.p.Current.Main_Trace.PremiumCode = "";
		}
	},

	// Domain functions
	b:{
		GetInstallCodes:function(){
			var codeArray = Trace.p.Current.Pref_WebController.installCodes;
			var installCodes = "";
			for (var i = 0,l = Object.keys(codeArray).length;i<l;i++){
				if(codeArray[Object.keys(codeArray)[i]] === true){
					installCodes += Object.keys(codeArray)[i] + ",";
				}
			}
			installCodes = installCodes.substring(0,installCodes.length-1);
			return installCodes;
		},
		BlocklistLoader:function(bypassCache){
			if (!bypassCache && Trace.p.Current.Main_Trace.DomainCache.enabled === true){
				var installCodes = Trace.b.GetInstallCodes();

				var url = Trace.v.blocklistURL;
				url += "?r=" + (typeof(Trace.v.Premium) !== "string" || Trace.v.Premium === "" ? "rv" : "pv");
				url += "&a=cache";
				url += "&v=180";
				url += "&c=" + btoa(installCodes);

				$.ajax({
					url:url,
					dataType:"text",
					cache:false,
					method:"GET",
					timeout:30000,
					beforeSend:function(){
						if (Trace.DEBUG) console.log("[cachd]-> Checking blocklist version against main server");
					},
					success:function(version){
						if (Trace.DEBUG) console.log("[cachd]-> Got version from server, server version is",version);

						var vInfo = JSON.parse(version);

						Trace.v.s.get([
							"WebCache_Version"
						],function(v){
							if (typeof(v.WebCache_Version) !== "number"){
								Trace.b.GetBlockList(0,0);
							} else if (v.WebCache_Version !== vInfo.db_version){
								Trace.b.GetBlockList(0,0);
							} else {
								Trace.b.BlocklistCache([v.WebCache_Version,vInfo.db_version]);
							}
						});
					},
					error:function(e){
						if (navigator.onLine){
							if (Trace.DEBUG) console.error(e);
						}

						Trace.b.GetBlockList(0,0);
					}
				});
			} else {
				Trace.b.GetBlockList(0,0);
			}
		},
		BlocklistURL:function(attempt,server){
			var url;
			var installCodes = Trace.b.GetInstallCodes();

			if (typeof(Trace.v.Premium) !== "string" || Trace.v.Premium === "" || attempt > 2){
				if (server === 0){
					url = Trace.v.blocklistURL;
					url += "?d=" + btoa((Math.round((new Date()).getTime()/1000))*2);
					url += "&a=download";
					url += "&v=180";
					url += "&c=" + btoa(installCodes);
					url += "&l=true";
				} else {
					url = Trace.v.blocklistFallback;
				}
			} else {
				url = Trace.v.blocklistBase;
				url += btoa(Trace.v.Premium);
				url += "&s=" + btoa(Trace.n.appSecret);
				url += "&a=download";
				url += "&d=" + btoa((Math.round((new Date()).getTime()/1000))*2);
				url += "&v=180";
				url += "&c=" + btoa(installCodes);
				url += "&f=" + "json";
				url += "&l=true";
			}

			return url;
		},
		GetBlockList:function(attempt,server){
			if (attempt > 4 && navigator.onLine){
				Trace.Notify("Error downloading blocklist! Unable to download blocklist for unknown reasons. Domain protection will not function.","protd");
				return false;
			}
			attempt++;

			// Get URL
			var url = Trace.b.BlocklistURL(attempt,server);

			// Create XMLHttpRequest
			var xhr = new XMLHttpRequest();
			xhr.timeout = 50000;
			xhr.open("get",url,true);

			if (Trace.DEBUG) console.info("[protd]-> Loading from: " + (server === 0 ? "main" : "secondary") + " server");

			// Notify blocklist download progress if user allows notifications
			if (Trace.v.bNotifications === true){
				xhr.onprogress = function(evt){
					if (evt.lengthComputable){
						var percentComplete = Math.round(((evt.loaded / evt.total) * 100));
						try {
							chrome.notifications.create("notification",{
								"type":"progress",
								"title":"Trace",
								"message":"Updating Blocklist...",
								"iconUrl":Trace.v.notifIcon,
								"progress":percentComplete
							});
						} catch(e){
							console.log("Notifications aren't allowed.");
						}
					}
				};
			}

			xhr.onreadystatechange = function(){
				var status, data;

				if (xhr.readyState === 4){
					status = xhr.status;

					if (status === 200){
						try {
							data = JSON.parse(xhr.responseText);
						} catch(e) {
							Trace.Notify("Parsing downloaded blocklist error! Will retry.","protd");
							setTimeout(function(){
								Trace.b.GetBlockList(attempt,1);
							},attempt*1250);
							return false;
						}

						// Apply list
						Trace.Notify("Got blocklist from " + (server === 0 ? "main" : "secondary") + " server","protd");
						Trace.b.ApplyWebBlocklist(data,false);
					} else {
						var headerResp = xhr.getResponseHeader("x-trace-list");
						if (headerResp !== null && headerResp !== "x-trace-list"){
							console.log("Trace failed to load the blocklist.");
							console.error(JSON.stringify({"Event":"GetBlocklistDownloadFailure","TraceListHead":headerResp,"ErrorObj":{"status":status,"text":xhr.statusText}}));
						}

						if (navigator.onLine) {
							if (status === 0) {
								Trace.Notify("Couldn't download blocklist because a connection coulnd't be made to the server.", "protd");
							} else if (status === 402) {
								Trace.Notify("Your premium code is invalid! It has been removed from Trace's storage", "protd");
								Trace.f.RemovePremium();
							} else if (status === 403) {
								Trace.Notify("One or more security parameters were missing when updating the blocklist", "protd");
							} else if (status === 404) {
								Trace.Notify("Trace recieved a 404 from blocklist server ID " + server + ".","protd");
							} else if (status === 508){
								Trace.Notify("Cloudflare error 508 when downloading update to blocklist.", "protd");
							} else if (status === 520){
								Trace.Notify("Cloudflare error 520 when downloading update to blocklist.", "protd");
							} else {
								Trace.Notify("Trace couldn't download the blocklist, unknown error, server ID " + server + ".","protd");
								_UserCrashReportService({"Event":"ServerFailedDown!","Server":(server === 0 ? "main" : "secondary"),"status":status,"Online":true},false);
							}

							// Retry blocklist download
							if (server === 0){
								Trace.Notify("Failed to load blocklist from main server, trying secondary server","protd");
								setTimeout(function(){
									Trace.b.GetBlockList(attempt,1);
								},attempt*1000);
							} else {
								Trace.Notify("Failed to load blocklist from secondary server, trying again. Attempt " + attempt + " of 5","protd");
								setTimeout(function(){
									Trace.b.GetBlockList(attempt,server);
								},attempt*1000);
							}
						} else {
							Trace.Notify("Couldn't download blocklist because you don't seem to be connected to the internet.","protd");
							return false;
						}
					}
				}
			};

			// Send XHR Request
			xhr.send();
		},
		BlocklistCache:function(ver){
			Trace.Notify("Using WebCache. Cache version: " + ver[0] + "; Server Version: " + ver[1],"cachd");

			Trace.v.s.get([
				"WebCache_Type",
				"WebCache_Data"
			],function(r){
				var data = {
					list_version:ver[1],
					list_type:r.WebCache_Type,
					data:r.WebCache_Data
				};

				Trace.b.ApplyWebBlocklist(data,true);
			});
		},
		CacheTheList:function(db){
			if (!db.data){
				return false;
			}

			// Put database in localstorage
			Trace.v.s.set({
				"WebCache_Version":db.list_version || 0,
				"WebCache_Type":db.list_type || "Unknown",
				"WebCache_Data":{
					"domain":db.data.domain || [],
					"host":db.data.host || [],
					"url":db.data.url || [],
					"tld":db.data.tld || [],
					"file":db.data.file || []
				}
			},function(){
				if (Trace.DEBUG) console.info("[stord]-> Saved database cache to local storage");
			});
		},
		ClearDomainCache:function(){
			Trace.v.s.set({
				"WebCache_Version":0,
				"WebCache_Type":"",
				"WebCache_Data":{
					"domain":[],
					"host":[],
					"url":[],
					"tld":[],
					"file":[]
				}
			},function(){
				if (Trace.DEBUG) console.info("[cachd]-> Cleared cache");
			});
		},
		ApplyWebBlocklist:function(db,fromCache){
			// No point caching the list if it's already cached
			if (fromCache === false){
				Trace.b.CacheTheList(db);
			}

			// Load web domain database into program
			Trace.d.meta.fromCache = fromCache;
			Trace.d.meta.listTypeName = db.list_type;
			Trace.d.meta.listVersion = db.list_version;

			// Get data from source into program
			if (typeof db.data !== "object"){
				if (fromCache) Trace.b.ClearDomainCache();
				db.data = {};
			}
			Trace.d.blocked.domain = db.data.domain || [];
			Trace.d.blocked.host = db.data.host || [];
			Trace.d.blocked.url = db.data.url || [];
			Trace.d.blocked.tld = db.data.tld || [];
			Trace.d.blocked.file = db.data.file || [];

			// Add TLD list from Trace
			Trace.d.blocked.tld = Trace.d.blocked.tld.concat(Trace.g.BadTopLevelDomain.GetList());

			// Tell the checker what to check for
			if (Trace.d.blocked.tld.length > 0) Trace.d.validate.tld = true;
			if (Trace.d.blocked.domain.length > 0) Trace.d.validate.domain = true;
			if (Trace.d.blocked.host.length > 0) Trace.d.validate.host = true;
			if (Trace.d.blocked.url.length > 0) Trace.d.validate.url = true;
			if (Trace.d.blocked.query.length > 0) Trace.d.validate.query = true;
			if (Trace.d.blocked.file.length > 0) Trace.d.validate.files = true;

			Trace.Notify("Trace WebController has loaded the blocklists and is ready.","protd");
		},
		ToggleBlockPings:function(){
			if (Trace.p.Current.Pref_PingBlock.enabled === true){
				if (Trace.p.Current.Pref_PingBlock.pingRequest.enabled === true){
					try {
						chrome.webRequest.onBeforeRequest.addListener(
							Trace.d.PingBlocker,
							{
								urls:["http://*/*","https://*/*","ws://*/*","wss://*/*"],
								types:["ping"]
							},
							["blocking"]
						);
					} catch(e){
						if (e.message.toLowerCase().includes("invalid value for argument 1")){
							Trace.Notify("Ping blocks are not supported by your browser.","pingd");
						}
					}
				}
			} else {
				if (Trace.p.Current.Pref_PingBlock.pingRequest.enabled !== true){
					try {
						chrome.webRequest.onBeforeRequest.removeListener(Trace.d.PingBlocker);
					} catch(e){
						console.error(e);
					}
				}
			}
		}
	},
	c:{
		whitelist:{},
		NewWhitelistFormat:function(old){
			console.log("Saved new whitelist format");
			var trNewWl = {};
			for (var i = 0, l = old.length;i<l;i++){
				trNewWl[old[i]] = {
					"WebController":true,
					"TracePage":true
				}
			}
			return trNewWl;
		},
		LoadWhitelist:function(cb){
			if (Trace.p.Current.Pref_WebController.Whitelist.enabled === true){
				Trace.v.s.get(["domain_wl","WebData_Whitelist"],function(s){
					if ((typeof s.WebData_Whitelist === "undefined" || s.WebData_Whitelist === null) && typeof s.domain_wl !== "string"){
						// If new whitelist isn't set and old one isn't either save a blank one
						Trace.c.SaveWhitelist();
						if (cb) cb(false);
					} else if (typeof s.domain_wl === "string") {
						// If old whitelist is set convert to new format
						Trace.c.whitelist = Trace.c.NewWhitelistFormat(JSON.parse(s.domain_wl));
						Trace.v.s.remove(["domain_wl"]);
						Trace.c.SaveWhitelist();
						if (cb) cb(true);
						return;
					} else {
						// If new whitelist is there, set it.
						Trace.c.whitelist = s.WebData_Whitelist;
					}
				});
			} else {
				if (cb) cb(false);
			}
		},
		SaveWhitelist:function(cb){
			if (Trace.DEBUG) console.log("[whtld]-> Saving whitelist!");
			Trace.v.s.set({
				"WebData_Whitelist":Trace.c.whitelist
			},function(){
				if (cb) cb();
			});
		},
		CleanDomain:function(url){
			var hostname;

			if (url.indexOf("://") > -1) {
				hostname = url.split('/')[2];
			} else {
				hostname = url.split('/')[0];
			}

			if ((hostname.match(new RegExp(":","g")) || []).length > 1){
				return false;
			}

			hostname = hostname.split(':')[0];
			hostname = hostname.split('?')[0];

			return hostname;
		},
		EditItem:function(removeItem,addItem,cb){
			Trace.c.RemoveItem(removeItem);
			Trace.c.AddItem(addItem,cb);
		},
		AddItem:function(item,cb){
			if (typeof item !== "string" || item.length < 4){
				return "Invalid domain name!";
			}

			var cleanDomain = Trace.c.CleanDomain(item);
			Trace.c.whitelist[cleanDomain] = {
				"WebController":true,
				"TracePage":true
			};
			Trace.c.SaveWhitelist(cb);
		},
		RemoveItem:function(item,cb){
			delete Trace.c.whitelist[item];
			if (cb) Trace.c.SaveWhitelist(cb);
		}
	},
	d:{
		meta:{
			usingCache:false,
			isBlocking:false,
			listTypeName:"regular",
			listVersion:0
		},
		params:{
			urlPatterns:["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"],
			dataTypes:[
				"image",
				"sub_frame",
				"main_frame",
				"object",
				"xmlhttprequest",
				"stylesheet",
				"ping",
				"other",
				"script",
				"font",
				"csp_report",
				"media",
				"websocket"
			]
		},
		validate:{
			tld:false,
			domain:false,
			host:false,
			url:false,
			file:false,
			query:false
		},
		blocked:{
			tld:[],
			domain:[],
			host:[],
			url:[],
			file:[],
			query:[]
		},
		whitelist:[],
		PingBlocker:function(d){
			if (d.type === "ping" && d.tabId < 0){
				Trace.s.LogStat(d.type);
				return {cancel:true};
			}
		},
		AssignChecker:function(){
			Trace.Notify("Starting WebRequest event controller","webcd");

			if (Trace.d.meta.isBlocking){
				Trace.d.RestartChecker();
				return false;
			}

			if (typeof chrome.webRequest !== "undefined") {
				try {
					chrome.webRequest.onBeforeRequest.addListener(Trace.d.RequestChecker,{
						"types":Trace.d.params.dataTypes,
						"urls":Trace.d.params.urlPatterns
					},["blocking"]);
				} catch(e){
					if (e.message.toLowerCase().includes("invalid value for argument 1.")){
						Trace.d.params.dataTypes.splice(8,4);
						Trace.d.params.dataTypes.splice(7,1);
						chrome.webRequest.onBeforeRequest.addListener(Trace.d.RequestChecker,{
							"types":Trace.d.params.dataTypes,
							"urls":Trace.d.params.urlPatterns
						},["blocking"]);
					}
				}
				Trace.d.meta.isBlocking = true;
			} else {
				Trace.Notify("Failed to access browser WebRequest API. Maybe we don't have permission","webcd");
			}
		},
		RemoveChecker:function(){
			Trace.Notify("Stopping WebRequest event controller","webcd");
			chrome.webRequest.onBeforeRequest.removeListener(Trace.d.RequestChecker);
			Trace.d.meta.isBlocking = false;
		},
		RestartChecker:function(){
			Trace.d.RemoveChecker();
			setTimeout(Trace.d.AssignChecker,2000);
		},
		LoadBlacklist:function(){
			Trace.b.BlocklistLoader(false);
		},
		CleanURL:function(s,type){
			if (Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].level === 4){
				return s.split('?')[0];
			}

			var QueryObject = Trace.d.GetUrlParams(s);
			if (Object.keys(QueryObject).length === 0) return s;

			var CleanQuery = Trace.d.RemoveBadParams(QueryObject,Object.keys(QueryObject).length,type);

			if (CleanQuery === ("?" + s.split("?")[1])){
				console.warn("Param string unchanged");
			} else {
				console.log("\nOld ParamString->",("?" + s.split("?")[1]));
				console.log("New ParamString->",CleanQuery);
			}

			return (s.split('?')[0] + CleanQuery);
		},
		RemoveBadParams:function(o,l,type){
			var newParamStr = "?",
				numBadParams = 0,
				badQuery = Trace.g.URLCleaner.GetList(type);

			if (badQuery === true) {
				return "";
			}

			for(var i = 0;i<l;i++){
				var pName = Object.keys(o)[i].toString();
				var pVal = Object.values(o)[i].toString();

				if (badQuery.indexOf(pName.toLowerCase()) !== -1){
					if (Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].method === "randomise"){
						var randVal = Trace.makeRandomID(10);
						if (newParamStr.length === 1){
							newParamStr += (typeof pName !== "string" ? "" : pName + "=") + randVal;
						} else {
							newParamStr += "&" + pName + "=" + randVal;
						}
					}
					numBadParams++;
				} else {
					if (newParamStr.length === 1){
						newParamStr += (typeof pName !== "string" ? "" : pName + (pVal.length !== 0 ? "=" : "")) + pVal;
					} else {
						newParamStr += "&" + pName + (pVal.length !== 0 ? "=" + pVal : pVal);
					}
				}
			}
			return newParamStr;
		},
		GetUrlParams:function(s){
			// Credit: https://www.sitepoint.com/get-url-parameters-with-javascript/
			if (!s || typeof(s) !== 'string') return '';

			var params = {};

			if (s.includes("?")){
				var keys = s.split("?")[1].split('&');
				for (var i = 0;i<keys.length;i++){
					var a = keys[i].split('=');
					var paramNum = undefined;

					var paramName = a[0].replace(/\[\d*\]/,function(v){
						paramNum = v.slice(1,-1);
						return '';
					});
					var paramValue = typeof(a[1])==='undefined' ? "" : a[1];

					paramName = paramName.toString();
					paramValue = paramValue.toString();

					if (params[paramName]) {
						if (typeof params[paramName] === "string"){
							params[paramName] = [params[paramName]];
						}
						if (typeof paramNum === "undefined"){
							params[paramName].push(paramValue);
						} else {
							params[paramName][paramNum] = paramValue;
						}
					} else {
						params[paramName] = paramValue;
					}
				}
			}

			return params;
		},
		RequestChecker:function(request){
			// Check if URL is valid
			if (request.tabId === -1 || typeof request.url !== "string" || request.url.substring(0,4) !== "http"){
				return {cancel:false};
			}

			// Check if we need to show a 'blocked' page
			var redirectToBlocked = false;
			if (Trace.p.Current.Pref_WebController.showBlocked.enabled === true){
				if (request.type === "main_frame"){
					redirectToBlocked = true;
				}
			}

			// Split URL into its component parts
			var host = Trace.n.extractHostname(request.url);
			var domain = Trace.n.extractRootDomain(host);

			// Check if domain is whitelisted
			if (Trace.p.Current.Pref_WebController.Whitelist.enabled === true){
				var check = [domain,host];

				// Check what website is starting the webrequest
				if (typeof request.initiator === "string"){
					check[0] = Trace.n.extractRootDomain(request.initiator);
					check[1] = Trace.n.extractHostname(request.initiator);
				} else {
					// Check initiator on Firefox
					if (typeof request.originUrl === "string"){
						check[0] = Trace.n.extractRootDomain(request.originUrl);
						check[1] = Trace.n.extractHostname(request.originUrl);
					}
				}

				if (Trace.c.whitelist[check[1]] !== undefined){
					if (Trace.c.whitelist[check[1]].WebController === true){
						return {cancel:false};
					}
				}
				if (Trace.c.whitelist[check[0]] !== undefined){
					if (Trace.c.whitelist[check[0]].WebController === true){
						return {cancel:false};
					}
				}
			}

			// Blocking time... Maybe
			var blockType = 0;

			// Check for TLD block
			if (Trace.d.validate.tld === true){
				var toplevel = domain.split(".").reverse()[0];
				if (Trace.n.arraySearch(Trace.d.blocked.tld,toplevel) !== -1){
					blockType = 1;
				}
			}

			// Check for Domain block
			if (Trace.d.validate.domain === true && blockType === 0) {
				if (Trace.n.arraySearch(Trace.d.blocked.domain, domain) !== -1) {
					blockType = 2;
				}
			}

			// Check for Host block
			if (Trace.d.validate.host && blockType === 0){
				if (Trace.n.arraySearch(Trace.d.blocked.host,host) !== -1) {
					blockType = 3;
				}
			}

			// Check for URL block
			var cleanURL = request.url.replace(/#[^#]*$/,"").replace(/\?[^\?]*$/,"");
			if (Trace.d.validate.url && blockType === 0){
				var url = cleanURL.split("://")[1];
				if (Trace.n.arraySearch(Trace.d.blocked.url,url) !== -1){
					blockType = 4;
				}
			}

			// Check for file block
			if (Trace.d.validate.file && blockType === 0){
				var file = cleanURL.split("/").pop();
				if (Trace.n.arraySearch(Trace.d.blocked.file,file) !== -1){
					blockType = 5;
				}
			}

			// Check if we need to block the request
			if (blockType !== 0){
				if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === true){
					Trace.s.LogStat(request.type);
				}

				if (redirectToBlocked){
					return {redirectUrl:(chrome.extension.getURL("html/blocked.html") + "#u;" + btoa(request.url) + "&" + blockType)};
				}

				if (request.type === "image"){
					return {redirectUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="};
				} else if (request.type === "sub_frame"){
					return {redirectUrl:"about:blank"};
				} else {
					return {cancel:true};
				}
			}

			// Modify URL?
			var modifiedUrl = false;
			if (Trace.p.Current.Pref_WebController.urlCleaner.enabled === true){
				var newUrl = request.url, fragment = [];

				// First deal with the fragment
				if (Trace.p.Current.Pref_WebController.urlCleaner.fragmentHash.enabled === true){
					newUrl = newUrl.split("#")[0];
					modifiedUrl = true;
				} else {
					fragment = newUrl.split("#");
				}

				// Then clean the query string
				if (Trace.p.Current.Pref_WebController.urlCleaner.queryString.enabled === true) {
					modifiedUrl = true;

					// Remove fragment before cleaning URL
					if (fragment.length === 2){
						newUrl = fragment[0];
					}

					if ((request.type === "main_frame" || request.type === "sub_frame") && Trace.p.Current.Pref_WebController.urlCleaner.queryString.main_frame.level !== -1) {
						newUrl = Trace.d.CleanURL(newUrl,"main_frame");
					} else if ((request.type !== "main_frame" && request.type !== "sub_frame") && Trace.p.Current.Pref_WebController.urlCleaner.queryString.resources.level !== -1){
						newUrl = Trace.d.CleanURL(newUrl,"resources");
					} else {
						modifiedUrl = false;
					}

					// Re-add fragment
					if (fragment.length === 2){
						newUrl = newUrl + "#" + fragment[1];
					}
				}

				// If modifications were made then we redirect the user to the modified version
				if (modifiedUrl){
					return {redirectUrl:newUrl};
				}
			}

			return {cancel:false};
		}
	},

	// IP Spoofing functions
	i:{
		CurrentFakeIP:"0.0.0.0",
		CurrentViaHeader:"Proxy",
		IPRange:[
			[0,255],
			[0,255],
			[0,255],
			[0,255]
		],
		RefreshFakeUserIP:function(){
			if (Trace.p.Current.Pref_IPSpoof.enabled !== true){
				Trace.i.StopIPRefresh();
				return;
			}
			var digits = [
				Trace.Rand(Trace.i.IPRange[0][0],Trace.i.IPRange[0][1]),
				Trace.Rand(Trace.i.IPRange[1][0],Trace.i.IPRange[1][1]),
				Trace.Rand(Trace.i.IPRange[2][0],Trace.i.IPRange[2][1]),
				Trace.Rand(Trace.i.IPRange[3][0],Trace.i.IPRange[3][1])
			];

			Trace.i.CurrentFakeIP = digits[0] + "." + digits[1] + "." + digits[2] + "." + digits[3];
		},
		ToggleIPSpoof:function(onlyStart){
			if (Trace.p.Current.Pref_IPSpoof.enabled === true){
				// Set custom via header
				if (Trace.p.Current.Pref_IPSpoof.traceVia.enabled || typeof Trace.p.Current.Pref_IPSpoof.traceVia.value !== "string"){
					Trace.i.CurrentViaHeader = "Proxy";
					if (Trace.DEBUG) console.log("[pipsd]-> Using standard via header");
				} else {
					Trace.i.CurrentViaHeader = Trace.p.Current.Pref_IPSpoof.traceVia.value;
					if (Trace.DEBUG) console.log("[pipsd]-> Set Via Header to:",Trace.p.Current.Pref_IPSpoof.traceVia.value);
				}

				// Set custom IP or start randomiser alarm
				if (Trace.p.Current.Pref_IPSpoof.traceIP.enabled === true && chrome.alarms){
					Trace.i.RefreshFakeUserIP();
					chrome.alarms.create("UserFakeIPRefresh", {periodInMinutes: Trace.v.FakeIPInterval});
					if (Trace.DEBUG) console.log("[pipsd]-> Using Random IP Spoofer");
				} else {
					if (!onlyStart){
						Trace.i.StopIPRefresh();
					}
					if (typeof Trace.p.Current.Pref_IPSpoof.traceIP.user_set !== "string" || Trace.p.Current.Pref_IPSpoof.traceIP.user_set.length < 7){
						Trace.p.SetSetting("Pref_IPSpoof.traceIP.user_set","128.128.128.128");
						Trace.i.CurrentFakeIP = "128.128.128.128";
						Trace.Notify("Proxy IP Spoofing found an error with the IP used, using 128.128.128.128 instead.","pipsd")
						return;
					}

					// Set fake IP as one set by user
					Trace.i.CurrentFakeIP = Trace.p.Current.Pref_IPSpoof.traceIP.user_set;
					if (Trace.DEBUG) console.log("[pipsd]-> Set IP to:",Trace.p.Current.Pref_IPSpoof.traceIP.user_set);
				}
			} else {
				// Stop ip refresh if
				if (!onlyStart) Trace.i.StopIPRefresh();
			}
		},
		StopIPRefresh:function(){
			chrome.alarms.getAll(function(list){
				for (var alarm in list){
					if (alarm.name === "UserFakeIPRefresh"){
						chrome.alarms.clear("UserFakeIPRefresh",function(success){
							if (!success) alert("Trace Error: Failed to stop UserFakeIPRefresh (chrome.alarms)");
						});
						break;
					}
				}
			});
		}
	},

	// Advanced functions
	g:{
		CookieEater:{
			BadCookieList:function(){

			},
			RemoveBadCookies:function(cookiestr){
				var newCookieStr = cookiestr;

				return newCookieStr;
			}
		},
		BadTopLevelDomain:{
			TLDs:{
				extended:[
					"asia",
					"cc",
					"cf",
					"christmas",
					"cricket",
					"party",
					"pro",
					"review",
					"trade",
					"vip",
					"zip"
				],
				all:[
					"accountant",
					"date",
					"diet",
					"loan",
					"mom",
					"online",
					"racing",
					"ren",
					"stream",
					"study",
					"top",
					"xin",
					"yokohama"
				],
				most:[
					"ads",
					"link",
					"kim",
					"top",
					"science",
					"space",
					"webcam",
					"men",
					"win",
					"work"
				],
				few:[
					"bid",
					"click",
					"country",
					"download",
					"faith",
					"gdn",
					"gq"
				]
			},
			ToggleProtection:function(){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					Trace.Notify("Trace will protect against bad top level domains when domain blocking is enabled.","atld");
					return;
				}

				if (Trace.p.Current.Pref_WebController.tld.enabled === true){
					Trace.Notify("Adding bad top level domains to blocklist","atld");
				} else {
					Trace.Notify("Removing bad top level domains from blocklist","atld");
				}

				setTimeout(Trace.b.BlocklistLoader,1000);
			},
			GetList:function(){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					return [false];
				}
				if (Trace.p.Current.Pref_WebController.tld.enabled !== true){
					return [];
				}

				// Get level of protection
				var level = 1;
				if (typeof Trace.p.Current.Pref_WebController.tld.level !== "undefined"){
					level = parseInt(Trace.p.Current.Pref_WebController.tld.level);
				}

				// Create and return the list depending on the level
				var list = [];

				list = list.concat(Trace.g.BadTopLevelDomain.TLDs.few);
				if (level === 0) return list;

				list = list.concat(Trace.g.BadTopLevelDomain.TLDs.most);
				if (level === 1) return list;

				list = list.concat(Trace.g.BadTopLevelDomain.TLDs.all);
				if (level === 2) return list;

				list = list.concat(Trace.g.BadTopLevelDomain.TLDs.extended);
				if (level === 3) return list;

				// For those sniffing glue, they get nothing
				return [];
			}
		},
		URLCleaner:{
			badParams:{
				safe:[
					"utm_source",
					"utm_campaign",
					"utm_content",
					"utm_medium",
					"utm_name",
					"utm_cid",
					"utm_reader",
					"utm_term"
				],
				regular:[
					"ad_bucket",
					"ad_size",
					"ad_slot",
					"ad_type",
					"adid",
					"adserverid",
					"adserveroptimizerid",
					"adtype",
					"adurl",
					"clickid",
					"clkurlenc",
					"ga_fc",
					"ga_hid",
					"ga_sid",
					"ga_vid",
					"piggiebackcookie",
					"pubclick",
					"pubid",
					"num_ads",
					"tracking"
				],
				risky:[
					"bdref",
					"bstk",
					"campaignid",
					"dclid",
					"documentref",
					"exitPop",
					"flash",
					"matchid",
					"mediadataid",
					"minbid",
					"page_referrer",
					"referrer",
					"reftype",
					"revmod",
					"rurl",
					"siteid",
					"tldid",
					"zoneid"
				],
				extreme:[
					"_reqid",
					"data",
					"payload",
					"providerid",
					"rev",
					"uid"
				]
			},
			ToggleProtection:function(){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					Trace.Notify("Trace will clean URLs when the WebRequest Controller is enabled.","urlcd");
					return;
				}
				Trace.Notify("Updated settings for URL Cleaner","urlcd");

				setTimeout(Trace.b.BlocklistLoader,1000);
			},
			GetList:function(type){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					return [false];
				}
				if (Trace.p.Current.Pref_WebController.urlCleaner.queryString.enabled !== true){
					return [];
				}

				// Get level of protection
				var level = 1;
				if (typeof type === "string" && typeof Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].level !== "undefined"){
					level = parseInt(Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].level);
				}

				// If level is 4 we remove all URL parameters
				if (level === 4) return true;

				// Create and return the list depending on the level
				var list = [];

				list = list.concat(Trace.g.URLCleaner.badParams.safe);
				if (level === 0) return list;

				list = list.concat(Trace.g.URLCleaner.badParams.regular);
				if (level === 1) return list;

				list = list.concat(Trace.g.URLCleaner.badParams.risky);
				if (level === 2) return list;

				list = list.concat(Trace.g.URLCleaner.badParams.extreme);
				if (level === 3) return list;

				// For those sniffing glue, they get nothing
				return [];
			}
		}
	},

	// Statistics functions
	s:{
		Current:{},
		Main:{"total":0,"webpage":0,"media":0,"code":0,"other":0},
		TimeSinceLastUpdate:0,
		TypeNames:{
			"main_frame":"webpage",
			"sub_frame":"webpage",
			"stylesheet":"media",
			"script":"code",
			"image":"media",
			"font":"media",
			"object":"code",
			"xmlhttprequest":"other",
			"csp_report":"other",
			"media":"media",
			"websocket":"other",
			"ping":"other",
			"other":"other"
		},
		LogStat:function(type){
			if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === false) return;

			// Get date time reference for today
			var TimeRef = Trace.s.GenTime();

			// Convert chrome type to TraceType
			var TraceType = Trace.s.TypeNames[type];

			if (TraceType === undefined) console.error("Massive type error, unknown type:",type);

			// If data time reference doesn't exist, create an object
			if (Trace.s.Current[TimeRef[0]] === undefined){
				Trace.s.Current[TimeRef[0]] = {
					"webpage":0,
					"media":0,
					"code":0,
					"other":0
				};
			}

			// Update the appropriate values
			Trace.s.Current[TimeRef[0]][TraceType]++;
			Trace.s.Main[TraceType]++;
			Trace.s.Main["total"]++;

			// Schedule save data (to not affect page load time)
			chrome.alarms.create("StatsDatabaseRefresh",{when:TimeRef[1]});
		},
		GenTime:function(){
			var d = new Date();
			var day = d.getDate();
			var mon = d.getMonth()+1;
			day.toString().length !== 2 ? day = "0" + day.toString() : 0;
			mon.toString().length !== 2 ? mon = "0" + mon.toString() : 0;

			var data = [
				(d.getFullYear() + "-" + mon + "-" + day).toString(),
				Date.now()+3000
			];

			return data;
		},
		SaveStats:function(cb){
			Trace.v.s.set({
				"stats_db":Trace.s.Current,
				"stats_main":Trace.s.Main
			},function(){
				if (cb) cb();
			});
		},
		LoadStats:function(){
			Trace.v.s.get(
				["stats_db", "stats_main"],
				function(s){
					// Check for old stats and convert them to the new format
					var newStatsDB, newStatsMN, forceStatSave = false;
					if (typeof(s.stats_db) === "string" && typeof(s.stats_main) === "string") {
						newStatsDB = JSON.parse(s.stats_db);
						newStatsMN = JSON.parse(s.stats_main);
						forceStatSave = true;
						console.log("[statd]-> Changed statistics to new format");
					} else {
						newStatsDB = s.stats_db;
						newStatsMN = s.stats_main;
					}

					// Load the current statistics
					if (typeof(s.stats_db) !== "undefined") {
						Trace.s.Current = newStatsDB;
					} else {
						Trace.s.Current = {};
						forceStatSave = true;
					}
					if (typeof(s.stats_main) !== "undefined") {
						Trace.s.Main = newStatsMN;
					} else {
						Trace.s.Main = {
							"total":0,
							"webpage":0,
							"media":0,
							"code":0,
							"other":0
						};
						forceStatSave = true;
					}

					if (forceStatSave){
						Trace.s.SaveStats();
					}
				}
			);
		},
		Data:function(cb){
			cb(Trace.s.Current);
		},
		DeleteAll:function(cb){
			Trace.s.Current = {};
			Trace.s.SaveStats(cb);
		},
		DeleteAmount:function(amount,cb) {
			var newstats = {};
			if (amount >= Object.keys(Trace.s.Current).length){
				cb();
				return;
			}

			for (var i = Object.keys(Trace.s.Current).length-amount;i < Object.keys(Trace.s.Current).length;i++){
				newstats[Object.keys(Trace.s.Current)[i]] = Trace.s.Current[Object.keys(Trace.s.Current)[i]];
			}
			Trace.s.Current = newstats;
			Trace.s.SaveStats(cb);
		},
		MainText:function(cb){
			Trace.v.s.get("trace_installdate",function(s){
				var d = [], installDate = "... Today..?";
				if (typeof s.trace_installdate === "string"){
					installDate = s.trace_installdate;
				}
				if (Trace.p.Current.Pref_WebController.enabled === true){
					var recordData = [
						Trace.d.blocked.domain.length,
						Trace.d.blocked.host.length,
						Trace.d.blocked.tld.length,
						Trace.d.blocked.url.length,
						Trace.d.blocked.file.length
					];
					d = [Trace.d.meta.listTypeName,Trace.d.meta.listVersion,recordData,Trace.d.meta.fromCache];
				}
				cb(installDate,Trace.s.Main,d);
			});
		}
	},

	// Settings functions
	p:{
		Current:{
			"Pref_WebController":{
				"enabled":true,
				"showBlocked":{
					"enabled":false
				},
				"Whitelist":{
					"enabled":true
				},
				"tld":{
					"enabled":true,
					"level":1
				},
				"urlCleaner":{
					"enabled":false,
					"queryString":{
						"enabled":true,
						"main_frame":{
							"level":1,
							"method":"remove"
						},
						"resources":{
							"level":1,
							"method":"remove"
						}
					},
					"fragmentHash":{
						"enabled":false
					}
				},
				"installCodes":{
					"a00000002":true,
					"a00000005":true
				}
			},
			"Pref_CanvasFingerprint":{
				"enabled":true,
				"customRGBA":{
					"enabled":false,
					"rgba":[0,0,0,0]
				}
			},
			"Pref_AudioFingerprint":{
				"enabled":false,
				"audioBuffer":{
					"enabled":true
				},
				"audioData":{
					"enabled":true
				},
				"audioOfflineMain":{
					"enabled":false
				},
				"audioMain":{
					"enabled":false
				}
			},
			"Pref_CookieEater":{
				"enabled":false,
				"settings":{
					"setcookie":{
						"enabled":true,
						"method":"remove",
						"level":1
					},
					"cookie":{
						"enabled":false,
						"method":"remove",
						"level":1
					}
				}
			},
			"Pref_ReferHeader":{
				"enabled":false,
				"mainFunction":"remove",
				"jsVariable":{
					"enabled":true,
					"method":"remove"
				},
				"httpHeader":{
					"enabled":true,
					"method":"remove"
				},
				"rules":{}
			},
			"Pref_GoogleHeader":{
				"enabled":false,
				"rmClientData":{
					"enabled":false
				},
				"rmChromeUMA":{
					"enabled":true
				},
				"rmChromeVariations":{
					"enabled":true
				},
				"rmChromeConnected":{
					"enabled":true
				}
			},
			"Pref_ETagTrack":{
				"enabled":false
			},
			"Pref_PingBlock":{
				"enabled":true,
				"pingRequest":{
					"enabled":true
				},
				"sendBeacon":{
					"enabled":true
				}
			},
			"Pref_NetworkInformation":{
				"enabled":false,
				"customNet":{
					"enabled":false,
					"info":{
						"downlink":7.5,
						"effectiveType":"4g",
						"onchange":null,
						"rtt":100
					}
				}
			},
			"Pref_ScreenRes":{
				"enabled":false
			},
			"Pref_BatteryApi":{
				"enabled":false
			},
			"Pref_PluginHide":{
				"enabled":false
			},
			"Pref_UserAgent":{
				"enabled":false,
				"uaOSConfig":{
					"AllowMac":{
						"enabled":false
					},
					"AllowLinux":{
						"enabled":false
					},
					"AllowWindows":{
						"enabled":true
					}
				},
				"uaWBConfig":{
					"AllowChrome":{
						"enabled":true
					},
					"AllowFirefox":{
						"enabled":true
					},
					"AllowVivaldi":{
						"enabled":true
					},
					"AllowOpera":{
						"enabled":true
					},
					"AllowEdge":{
						"enabled":true
					},
					"AllowSafari":{
						"enabled":true
					}
				},
				"uaCust":{
					"enabled":false,
					"onlyCust":false,
					"customUAs":[]
				}
			},
			"Pref_WebRTC":{
				"enabled":true,
				"wrtcInternal":{
					"enabled":true
				},
				"wrtcPeerConnection":{
					"enabled":false
				},
				"wrtcDataChannel":{
					"enabled":false
				},
				"wrtcRtpReceiver":{
					"enabled":false
				}
			},
			"Pref_IPSpoof":{
				"enabled":false,
				"useClientIP":{
					"enabled":true
				},
				"useForwardedFor":{
					"enabled":true
				},
				"traceVia":{
					"enabled":true,
					"value":"Proxy"
				},
				"traceIP":{
					"enabled":true,
					"user_set":""
				}
			},
			"Pref_TracePage":{
				"enabled":true
			},
			"Main_Trace":{
				"DebugApp":{
					"enabled":false
				},
				"DomainCache":{
					"enabled":true
				},
				"ProtectionStats":{
					"enabled":true
				},
				"BrowserNotifications":{
					"enabled":false
				},
				"KeyboardCommand":{
					"enabled":false
				},
				"ErrorReporting":{
					"enabled":true
				},
				"PremiumCode":""
			},
			"Main_Interface":{
				"enabled":true,
				"NavPosition":"lside",
				"Theme":{
					"name":"tracedefault",
					"timealterations":true
				}
			}
		},
		Defaults:{
			"Pref_WebController":{
				"enabled":true,
				"showBlocked":{
					"enabled":false
				},
				"Whitelist":{
					"enabled":true
				},
				"tld":{
					"enabled":true,
					"level":1
				},
				"urlCleaner":{
					"enabled":false,
					"queryString":{
						"enabled":true,
						"main_frame":{
							"level":1,
							"method":"remove"
						},
						"resources":{
							"level":-1,
							"method":"remove"
						}
					},
					"fragmentHash":{
						"enabled":false
					}
				},
				"installCodes":{
					"a00000002":true,
					"a00000005":true
				}
			},
			"Pref_CanvasFingerprint":{
				"enabled":true,
				"customRGBA":{
					"enabled":false,
					"rgba":[0,0,0,0]
				}
			},
			"Pref_AudioFingerprint":{
				"enabled":false,
				"audioBuffer":{
					"enabled":true
				},
				"audioData":{
					"enabled":true
				},
				"audioOfflineMain":{
					"enabled":false
				},
				"audioMain":{
					"enabled":true
				}
			},
			"Pref_CookieEater":{
				"enabled":false,
				"settings":{
					"setcookie":{
						"enabled":true,
						"method":"remove",
						"level":1
					},
					"cookie":{
						"enabled":false,
						"method":"remove",
						"level":1
					}
				}
			},
			"Pref_ReferHeader":{
				"enabled":false,
				"mainFunction":"remove",
				"jsVariable":{
					"enabled":true,
					"method":"remove"
				},
				"httpHeader":{
					"enabled":true,
					"method":"remove",
					"mainCase":1
				},
				"rules":{}
			},
			"Pref_GoogleHeader":{
				"enabled":false,
				"rmClientData":{
					"enabled":false
				},
				"rmChromeUMA":{
					"enabled":true
				},
				"rmChromeVariations":{
					"enabled":true
				},
				"rmChromeConnected":{
					"enabled":true
				}
			},
			"Pref_ETagTrack":{
				"enabled":false
			},
			"Pref_PingBlock":{
				"enabled":true,
				"pingRequest":{
					"enabled":true
				},
				"sendBeacon":{
					"enabled":true
				}
			},
			"Pref_NetworkInformation":{
				"enabled":true,
				"customNet":{
					"enabled":false,
					"info":{
						"downlink":7.5,
						"effectiveType":"4g",
						"onchange":null,
						"rtt":100
					}
				}
			},
			"Pref_ScreenRes":{
				"enabled":false
			},
			"Pref_BatteryApi":{
				"enabled":false
			},
			"Pref_PluginHide":{
				"enabled":false
			},
			"Pref_UserAgent":{
				"enabled":false,
				"uaOSConfig":{
					"AllowMac":{
						"enabled":false
					},
					"AllowLinux":{
						"enabled":false
					},
					"AllowWindows":{
						"enabled":true
					}
				},
				"uaWBConfig":{
					"AllowChrome":{
						"enabled":true
					},
					"AllowFirefox":{
						"enabled":true
					},
					"AllowVivaldi":{
						"enabled":true
					},
					"AllowOpera":{
						"enabled":true
					},
					"AllowEdge":{
						"enabled":true
					},
					"AllowSafari":{
						"enabled":true
					}
				},
				"uaCust":{
					"enabled":false,
					"onlyCust":false,
					"customUAs":[]
				}
			},
			"Pref_WebRTC":{
				"enabled":true,
				"wrtcInternal":{
					"enabled":true
				},
				"wrtcPeerConnection":{
					"enabled":false
				},
				"wrtcDataChannel":{
					"enabled":false
				},
				"wrtcRtpReceiver":{
					"enabled":false
				}
			},
			"Pref_IPSpoof":{
				"enabled":false,
				"useClientIP":{
					"enabled":true
				},
				"useForwardedFor":{
					"enabled":true
				},
				"traceVia":{
					"enabled":true,
					"value":"Proxy"
				},
				"traceIP":{
					"enabled":true,
					"user_set":""
				}
			},
			"Pref_TracePage":{
				"enabled":true
			},
			"Main_Trace":{
				"DebugApp":{
					"enabled":false
				},
				"DomainCache":{
					"enabled":true
				},
				"ProtectionStats":{
					"enabled":true
				},
				"BrowserNotifications":{
					"enabled":false
				},
				"KeyboardCommand":{
					"enabled":false
				},
				"ErrorReporting":{
					"enabled":true
				},
				"PremiumCode":""
			},
			"Main_Interface":{
				"enabled":true,
				"NavPosition":"lside",
				"Theme":{
					"name":"tracedefault",
					"timealterations":true
				}
			},
			"tracenewprefs":true
		},
		SetDefaults:function(apply,cb){
			Trace.Notify("Setting new default settings...","prefd");

			Trace.v.s.set(Trace.p.Defaults);

			if (apply && cb){
				Trace.p.NewLoad(cb);
			}
		},
		Load:function(cb){
			if (!window.chrome.storage) alert("Trace encountered an error: Couldn't access Storage API.");

			if (Trace.DEBUG) console.info("[prefd]-> Trace[0] is loading your settings.");
			Trace.v.s.get(
				[
					"tracenewprefs",
					"pref_webrtc"
				],
				function(s){
					if (typeof s.tracenewprefs !== "boolean"){
						Trace.p.SetDefaults(true,cb);
					} else {
						if (typeof s.pref_webrtc === "boolean"){
							Trace.v.s.remove([
								"data_debugmsg",
								"pref_domainblock",
								"pref_domainwhite",
								"pref_canvasfinger",
								"pref_audiofinger",
								"pref_chromeheader",
								"pref_etagremove",
								"pref_pingblock",
								"pref_pluginhide",
								"pref_uarandom",
								"pref_webrtc",
								"pref_adv_ipspoof",
								"pref_adv_blockcc",
								"pref_adv_blocktld",
								"pref_adv_pageinject",
								"sett_domaincache",
								"sett_protstats",
								"sett_brownotif",
								"sett_reporting",
								"code_premium",
								"code_tld_level"
							],function(){
								console.log("Removed old settings");
							});
						}
						Trace.p.NewLoad(cb);
					}
				}
			);
		},
		NewLoad:function(cb){
			if (!window.chrome.storage) alert("Trace encountered an error: Couldn't access Storage API.");

			if (Trace.DEBUG) console.info("[prefd]-> Trace[1] is loading your settings.");
			Trace.v.s.get(
				[
					"Pref_WebController",
					"Pref_CanvasFingerprint",
					"Pref_AudioFingerprint",
					"Pref_CookieEater",
					"Pref_ReferHeader",
					"Pref_GoogleHeader",
					"Pref_ETagTrack",
					"Pref_PingBlock",
					"Pref_NetworkInformation",
					"Pref_ScreenRes",
					"Pref_BatteryApi",
					"Pref_PluginHide",
					"Pref_UserAgent",
					"Pref_WebRTC",
					"Pref_IPSpoof",
					"Pref_TracePage",
					"Main_Trace",
					"Main_Interface"
				],
				function(prefs){
					// Check that there are settings
					if (Object.keys(prefs).length === 0){
						Trace.p.SetDefaults();
					}

					// Fix broken preferences
					var changes = false;
					for (var k in Trace.p.Defaults){
						if (typeof prefs[k] !== typeof Trace.p.Defaults[k]){
							prefs[k] = Trace.p.Defaults[k];
							changes = true;
							console.log("[PrefRepair]->",k);
						}

						for (var j in Trace.p.Defaults[k]){
							if (typeof prefs[k][j] !== typeof Trace.p.Defaults[k][j]) {
								prefs[k][j] = Trace.p.Defaults[k][j];
								changes = true;
								console.log("[PrefRepair]->", k, j);
							}

							if (typeof Trace.p.Defaults[k][j] === "object"){
								for (var i in Trace.p.Defaults[k][j]){
									if (typeof prefs[k][j][i] !== typeof Trace.p.Defaults[k][j][i]) {
										prefs[k][j][i] = Trace.p.Defaults[k][j][i];
										changes = true;
										console.log("[PrefRepair]->", k, j, i);
									}

									if (typeof Trace.p.Defaults[k][j][i] === "object"){
										for (var h in Trace.p.Defaults[k][j][i]){
											if (typeof prefs[k][j][i][h] !== typeof Trace.p.Defaults[k][j][i][h]) {
												prefs[k][j][i][h] = Trace.p.Defaults[k][j][i][h];
												changes = true;
												console.log("[PrefRepair]->", k, j, i, h);
											}
										}
									}
								}
							}
						}
					}
					if (changes === true){
						console.log("[prefd]-> Preferences repaired and saved.");
						Trace.v.s.set(prefs);
					}

					if (typeof prefs.Pref_WebController.installCodes.a00000003 === "undefined"){
						if (prefs.Main_Trace.PremiumCode.length > 5) {
							prefs.Pref_WebController.installCodes["a00000003"] = true;
							prefs.Pref_WebController.installCodes["a00000001"] = true;
							console.log("Fixed premium list");
						}
					}

					// Set settings
					Trace.p.Current = prefs;

					// Callback
					cb();
				}
			);
		},
		ToggleSetting:function(setting,cb){
			var data = Trace.p.Current;

			if (setting.includes(".")){
				var sett = setting.split(".");
				data[sett[0]][sett[1]]["enabled"] = !Trace.p.Current[sett[0]][sett[1]]["enabled"];
			} else {
				data[setting]["enabled"] = !Trace.p.Current[setting]["enabled"];
			}

			Trace.v.s.set(data,function(){
				if (Trace.DEBUG) console.info("[stord]-> Toggled setting",setting);

				Trace.p.TakeAction(setting,(setting.includes(".") ? Trace.p.Current[sett[0]][sett[1]]["enabled"]: data[setting]));
				if (cb) cb();
			});
		},
		SetSetting:function(setting,val){
			var data = Trace.p.Current;
			var sett = setting.split(".");

			if (sett.length === 1) {
				data[setting] = val;
			} else if (sett.length === 2){
				data[sett[0]][sett[1]] = val;
			} else if (sett.length === 3) {
				data[sett[0]][sett[1]][sett[2]] = val;
			} else if (sett.length === 4) {
				data[sett[0]][sett[1]][sett[2]][sett[3]] = val;
			} else if (sett.length === 5) {
				data[sett[0]][sett[1]][sett[2]][sett[3]][sett[4]] = val;
			}

			Trace.v.s.set(data,function(){
				if (Trace.DEBUG) console.info("[stord]-> Updated setting",setting,"to",val);

				Trace.p.TakeAction(setting,val);
			});
		},
		TakeAction:function(setting,val){
			if (Trace.DEBUG) console.info("[prefd]-> Updating",setting,"to",val);

			// Toggle debug messages
			if (setting === "Main_Trace.DebugApp"){
				Trace.DEBUG = val;
			}

			// Toggle web-rtc protection
			if (setting === "Pref_WebRTC.wrtcInternal.enabled" || setting === "Pref_WebRTC"){
				Trace.f.ToggleWebRtc();
			}

			// Toggle domain blocking protection
			if (setting === "Pref_WebController" || setting === "Pref_WebController.enabled"){
				if (val.enabled){
					Trace.b.BlocklistLoader(false);
					Trace.d.AssignChecker();
				} else {
					Trace.d.RemoveChecker();
				}
			}

			// Toggle E-Tag protection
			if (setting === "Pref_ETagTrack"){
				if (val.enabled){
					Trace.f.StartEtagProtection();
				} else {
					Trace.f.StopEtagProtection();
				}
			}

			// Toggle user-agent randomiser background task
			if (setting === "Pref_UserAgent"){
				Trace.f.ToggleUserAgentRandomiser(false);
			}

			if (setting === "Pref_PingBlock.pingRequest.enabled" || setting === "Pref_PingBlock"){
				Trace.b.ToggleBlockPings();
			}

			// Load TracePage settings
			if (setting === "Pref_TracePage"){
				if (val.enabled === false){
					Trace.p.SetSetting("Pref_AudioFingerprint.enabled",false);
					Trace.p.SetSetting("Pref_CanvasFingerprint.enabled",false);
					Trace.p.SetSetting("Pref_PingBlock.enabled",false);
					Trace.p.SetSetting("Pref_PluginHide.enabled",false);
					Trace.p.SetSetting("Pref_UserAgent.enabled",false);
					Trace.p.SetSetting("Pref_NetworkInformation.enabled",false);
				}
			}

			// Load IPSpoof settings
			if (setting.includes("Pref_IPSpoof")){
				Trace.i.ToggleIPSpoof(false);
			}

			// Load BadTLD settings
			if (setting === "Pref_WebController.tld" || setting === "Pref_WebController.tld.level"){
				Trace.g.BadTopLevelDomain.ToggleProtection();
			}

			// Toggle error reporting
			if (setting === "Main_Trace.ErrorReporting"){
				Trace.v.eReporting = val;
			}

			// Toggle browser notifications
			if (setting === "Main_Trace.BrowserNotifications"){
				Trace.v.bNotifications = val;
			}

			// Update current premium code
			if (setting === "Main_Trace.PremiumCode"){
				Trace.v.Premium = val;
			}
		},
		EchoStorage:function(){
			Trace.v.s.get(null, function(items) {
				console.log(items);
			});
		},
		ClearStorage:function(){
			chrome.storage.local.clear(function() {
				var error = chrome.runtime.lastError;
				if (error) {
					console.error(error);
				}
			});
		}
	}
};

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

// Assign runtime events
chrome.runtime.onInstalled.addListener(Trace.a.NewInstall);
chrome.runtime.onMessage.addListener(Trace.a.ContentTalk);
Trace.a.AssignRuntime();

// Start Protection
Trace.f.StartTrace();

/*chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		if (key === "stats_main" || key === "stats_db") return;
		var storageChange = changes[key];
		console.log('[brows] Storage key "'+key+'" in namespace "'+namespace+'" changed. Old value was "'+storageChange.oldValue+'", new value is "'+storageChange.newValue+'".');
	}
});*/