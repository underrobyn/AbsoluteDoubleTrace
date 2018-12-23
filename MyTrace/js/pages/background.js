/*
 * 	Trace background script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

window.URL = window.URL || window.webkitURL;

var Trace = {

	DEBUG:true,

	Notify:function(msg,sect){
		if (Trace.v.bNotifications === false){
			if (Trace.DEBUG) console.info("%c[%s]-> !(%s)",'color:red',sect,msg);
			return;
		}

		if (Trace.DEBUG) console.info("%c[%s]-> Notified: %s",'color:darkblue',sect,msg);

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

	// Thanks to: https://stackoverflow.com/a/4900484/
	getChromeVersion:function() {
		var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
		return raw ? parseInt(raw[2], 10) : false;
	},

	// Chrome runtime functions
	a:{
		AssignRuntime:function(){
			var uninstallUrl = "https://absolutedouble.co.uk/trace/extension-uninstall?e=";

			if (/Chrome/.test(navigator.userAgent) && !(/Edge/.test(navigator.userAgent))) {
				chrome.runtime.onSuspend.addListener(Trace.a.SuspendSave);

				// Set uninstall URL
				var storage_type = (!window.chrome.storage.sync ? window.chrome.storage.local : window.chrome.storage.sync);
				storage_type.get('userid',function(items) {

					if (typeof items === "undefined" || !items.hasOwnProperty("userid")) {
						items = {'userid': "Unknown"};
					}

					// We pass the users error reporting ID so that their data can be purged from the error reporting database
					var usr = items.userid;
					uninstallUrl = uninstallUrl + usr;

					try {
						chrome.runtime.setUninstallURL(uninstallUrl,function(){
							if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL");
						});
					} catch(e){
						chrome.runtime.setUninstallURL(uninstallUrl);
						if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL using method 2");
					}
				});
			} else {
				chrome.runtime.setUninstallURL(uninstallUrl);
			}
		},
		NewInstall:function(details){
			// If this is a new install, open welcome page and set default settings
			if (details.reason && details.reason === "install"){
				Trace.p.SetDefaults();
				Trace.v.s.set({"trace_installdate":Trace.s.GenTime()[0]});
				Trace.s.SaveStats();
				Trace.b.BlocklistLoader(true);
				chrome.tabs.create({url:"/html/options.html#v2installed"});
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
				sendResponse({
					userAgentString:Trace.n.useragent,
					osCPUString:Trace.n.oscpu,
					platformString:Trace.n.platform
				});
			} else if (request.msg === "checkList"){

				// See if the whitelist can sort this one out for us
				if (Trace.c.wlEnabled === true){
					var reqUrl = request.url;

					var wl = Trace.c.GetWhitelist();
					for (var i = 0, l = wl.keys.length;i<l;i++){
						if (wl.keys[i].test(reqUrl)){
							var send = wl.values[i].Protections;
	 						sendResponse({
								"runProtection":true,
								"data":send
							});
							return;
						}
					}
				}

				// Okay so the whitelist couldn't...
				var protections = Trace.c.whitelistDefaults;
				var keys = Object.keys(protections);
				for (var l = keys.length, i = 0;i<l;i++){
					protections[keys[i]] = Trace.p.Current.Main_ExecutionOrder.PerPage.indexOf(keys[i]) === -1;
				}
				sendResponse({
					"runProtection":false,
					"data":protections
				});
			} else if (request.msg === "getsetting"){

				if (request.setting) {
					sendResponse({
						"data":Trace.p.Current[request.setting]
					});
				} else {
					sendResponse(Trace.p.Current);
				}

			} else {
				console.error("Invalid message recieved");
			}
		}
	},

	// Variables
	v:{
		// From storage
		eReporting:false,
		bNotifications:false,
		pSessions:false,
		sessionData:{},
		Premium:"",

		// Refresh constants
		UserAgentInterval:1,
		FakeIPInterval:1,

		// Storage type
		s:(/Edge/.test(navigator.userAgent) ? browser.storage.local : chrome.storage.local),

		// Blocklist URLs
		blocklistURL:"https://absolutedouble.co.uk/trace/app/weblist.php",
		blocklistFallback:"https://raw.githubusercontent.com/jake-cryptic/hmfp_lists/master/fallback.json",
		blocklistOffline:(chrome.hasOwnProperty("extension") ? chrome.runtime.getURL("data/blocklist.json") : browser.extension.getURL("data/blocklist.json")),
		blocklistBase:"https://absolutedouble.co.uk/trace/app/weblist.php?p=",

		// Notification constant
		notifIcon:"icons/trace_256.png",

		// User agent values (move these later)
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
					"macos mojave2":"Macintosh; Intel Mac OS X 10_14_0",
					"macos mojave":"Macintosh; Intel Mac OS X 10_14",
					"macos high sierra2":"Macintosh; Intel Mac OS X 10_13_6",
					"macos high sierra":"Macintosh; Intel Mac OS X 10_13",
					"macos sierra":"Macintosh; Intel Mac OS X 10_12_2",
					"macos el capitan":"Macintosh; Intel Mac OS X 10_11_6",
					"macos yosemite":"Macintosh; Intel Mac OS X 10_10_5"
				}
			},
			"wb":{
				"chrome":{
					"70":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36",
					"69":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3493.3 Safari/537.36",
					"68":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36",
					"67":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.79 Safari/537.36",
					"66":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36",
					"65":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.162 Safari/537.36",
					"64":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.4096.9 Safari/537.36",
					"63":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36"
				},
				"firefox":{
					"62":"Gecko/20100101 Firefox/62.0",
					"61":"Gecko/20100101 Firefox/61.0",
					"60":"Gecko/20100101 Firefox/60.0",
					"59":"Gecko/20100101 Firefox/59.0",
					"58":"Gecko/20100101 Firefox/58.0",
					"57":"Gecko/20100101 Firefox/57.0"
				},
				"vivaldi":{
					"1.96":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.183 Safari/537.36 Vivaldi/1.96.1147.47"
				},
				"opera":{
					"54":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.54"
				},
				"edge":{
					"17":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134",
					"15":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2743.116 Safari/537.36 Edge/15.15063",
					"14":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/14.14359"
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
		useragent:"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0",
		oscpu:"Windows NT 6.1; Win64; x64; rv:57.0",
		platform:"Win32",

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

		// Thanks to https://gist.github.com/donmccurdy/6d073ce2c6f3951312dfa45da14a420f
		wildcardToRegExp:function(s){
			return new RegExp('^' + s.split(/\*+/).map(Trace.n.regExpEscape).join('.*') + '$');
		},
		regExpEscape:function(s){
			return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
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

			var bitwise = (max <= 2147483647);
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
			// Echo some console information
			console.log("\nStarting Trace v." + chrome.runtime.getManifest().version + "\nSource code: https://github.com/jake-cryptic/AbsoluteDoubleTrace/\n");

			// Create current object and prepare for loading
			Trace.p.Current = Trace.p.Defaults;
			Trace.p.Defaults["tracenewprefs"] = true;

			// Load settings from storage
			Trace.p.Load(function(){
				Trace.f.StartModules();
			});
		},
		StartModules:function(){
			// Load some settings into program
			Trace.v.bNotifications = Trace.p.Current.Main_Trace.BrowserNotifications.enabled;
			Trace.v.eReporting = Trace.p.Current.Main_Trace.ErrorReporting.enabled;
			Trace.v.pSessions = Trace.p.Current.Main_Trace.ProtectionSessions.enabled;
			Trace.v.Premium = Trace.p.Current.Main_Trace.PremiumCode;
			Trace.t.TabInfo = Trace.p.Current.Main_Trace.TabStats.enabled;
			Trace.DEBUG = Trace.p.Current.Main_Trace.DebugApp.enabled;

			// Tell users that they can debug trace if they wish
			if (Trace.DEBUG === false){
				console.log("%cYou can see more debug messages by running this code: (function(){Trace.p.Set('Main_Trace.DebugApp.enabled',true);window.location.reload();})();",'color:#fff;background-color:#1a1a1a;font-size:1.2em;padding:5px;');
			}

			// It's time to begin
			Trace.Notify("Starting Modules...","initd");

			// Load statistics into program
			if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === true)
				Trace.s.LoadStats();

			// Load statistics into program
			if (Trace.p.Current.Main_Trace.ProtectionSessions.enabled === true)
				Trace.f.GenerateSession();

			// Assign keyboard shortcuts
			if (chrome.commands){
				if (Trace.DEBUG) console.log("[commd]-> Assigned commands event");
				chrome.commands.onCommand.addListener(Trace.f.KeyboardCommand);
			}

			// Ping blocks
			Trace.b.ToggleBlockPings();

			if (Trace.p.Current.Pref_WebController.enabled === true){
				Trace.c.GetStoredWhitelist();
				Trace.d.AssignChecker();
				Trace.b.BlocklistLoader(false);
			}

			// Any post-header modifications start here
			if (Trace.p.Current.Pref_CookieEater.enabled === true)
				Trace.h.Cookie.Start();

			if (Trace.p.Current.Pref_ETagTrack.enabled === true)
				Trace.h.Etag.Start();

			if (Trace.p.Current.Pref_GoogleHeader.enabled === true)
				Trace.h.Google.Start();

			if (Trace.p.Current.Pref_ReferHeader.enabled === true)
				Trace.h.Referer.Start();

			if (Trace.p.Current.Pref_UserAgent.enabled === true)
				Trace.h.UserAgent.Start();

			if (Trace.p.Current.Pref_IPSpoof.enabled === true)
				Trace.h.IPSpoof.Start();
			
			// Start keeping tabs on the tabs
			/*if (Math.random() > .5)*/ Trace.t.Init();

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
		GenerateSession:function(){
			var newSession = {};
			var keys = Trace.p.Current.Main_Trace.ProtectionSessions.affects;

			// Generate resolution & colour depth
			if (keys.indexOf("Pref_ScreenRes") !== -1){
				//newSession = Trace.
			}

			// Generate effectiveType, downlink and rtt
			if (keys.indexOf("Pref_NetworkInformation") !== -1){

			}

			// Generate browser and os
			if (keys.indexOf("Pref_UserAgent") !== -1){

			}
		},
		ReturnExecOrder:function(cb){
			cb(Trace.p.Current.Main_ExecutionOrder);
		},
		ChangeExecOrder:function(prot,cb){
			var current = "AllPage", goto = "PerPage", duplicate = false, inArr = false;
			if (Trace.p.Current.Main_ExecutionOrder.AllPage.indexOf(prot) !== -1){
				console.log("All:",prot);
				inArr = true;
			}
			if (Trace.p.Current.Main_ExecutionOrder.PerPage.indexOf(prot) !== -1){
				console.log("Per:",prot);
				current = "PerPage";
				goto = "AllPage";

				if (inArr === true) duplicate = true;
			}

			console.log("[execd]-> Moving %s to %s",prot,goto);

			// Remove item
			var index = Trace.p.Current.Main_ExecutionOrder[current].indexOf(prot);
			Trace.p.Current.Main_ExecutionOrder[current].splice(index,1);

			// Add item
			if (!duplicate)
				Trace.p.Current.Main_ExecutionOrder[goto].push(prot);

			// Save data
			Trace.v.s.set({
				"Main_ExecutionOrder":Trace.p.Current.Main_ExecutionOrder
			},function(){
				if (cb) cb();
			});
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
				Trace.f.ChooseUserAgent();

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

			// If user has enabled custom user agents and set some
			if (Trace.p.Current.Pref_UserAgent.uaCust.enabled === true && Trace.p.Current.Pref_UserAgent.uaCust.customUAs.length > 0){
				return rA(Trace.p.Current.Pref_UserAgent.uaCust.customUAs);
			}

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

			Trace.n.oscpu = rA(uaOSPool);
			var browser = rA(uaWBPool);

			// Special case for firefox on mac, Thanks: https://github.com/jake-cryptic/AbsoluteDoubleTrace/issues/3#issuecomment-437178452
			if (Trace.n.oscpu.toLowerCase().includes("mac")){
				if (browser.includes("Firefox")){
					Trace.n.oscpu = Trace.n.oscpu.replace(/_/g,".");
				}
			}

			Trace.n.useragent = "Mozilla/5.0 (" + Trace.n.oscpu + ") " + browser;

			if (Trace.n.oscpu.toLowerCase().includes("win")){
				Trace.n.platform = rA(["Win32","Win64"]);
			} else if (Trace.n.oscpu.toLowerCase().includes("mac")){
				Trace.n.platform = rA(["MacIntel","MacPPC"]);
			} else {
				Trace.n.platform = rA(["Linux","X11","Linux 1686"]);
			}
		},
		StartAlarmEvent:function(){
			if (!chrome.alarms) {
				console.error("Alarms aren't supported in this browser.");
				return false;
			}
			try{
				chrome.alarms.onAlarm.addListener(function(a){
					if (a.name === "UserAgentRefresh" && Trace.p.Current.Pref_UserAgent.enabled === true){
						Trace.f.ChooseUserAgent();
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
			} catch(e){
				if (e.message){
					console.log(e.message);
				} else {
					console.warn("Error starting alarm events, mabye browser doesn't support them?");
				}
			}
		},
		ToggleWebRtc:function(){
			if (!window.chrome.privacy) {
				Trace.Notify("WebRTC Setting isn't supported in this browser or Trace doesn't have permission to access it.");
				return false;
			}
			if (!chrome.privacy.network.webRTCIPHandlingPolicy) {
				Trace.Notify("WebRTC Setting requires Chrome 48 or newer.");
				return false;
			}

			chrome.privacy.network.webRTCIPHandlingPolicy.set({
				value:((Trace.p.Current.Pref_WebRTC.enabled && Trace.p.Current.Pref_WebRTC.wrtcInternal.enabled) ? "default_public_interface_only" : "default")
			});
		},
		RemovePremium:function(){
			Trace.p.Set("Main_Trace.PremiumCode","");
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
					timeout:50000,
					beforeSend:function(){
						if (Trace.DEBUG) console.log("[cachd]-> Checking blocklist version against main server");
					},
					success:function(version){
						if (Trace.DEBUG) console.log("[cachd]-> Got version from server, server version is",version);

						try{
							var vInfo = JSON.parse(version);
						} catch(e){
							console.error(e);
							Trace.b.GetBlockList(0,0);
							return;
						}

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
			// Check if user is online
			if (!navigator.onLine) {
				Trace.Notify("Couldn't download blocklist because you don't seem to be connected to the internet.", "protd");
				return false;
			}

			if (attempt > 4){
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
							console.log("[protd]-> Notifications aren't allowed.");
						}
					}
				};
			}

			xhr.onreadystatechange = function(){
				if (xhr.readyState !== 4){
					return;
				}

				var status = xhr.status,
					sName = (server === 0 ? "main" : "secondary"),
					data;

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
					Trace.Notify("Got blocklist from " + sName + " server","protd");
					Trace.b.ApplyWebBlocklist(data,false);
					return true;
				}

				var headerResp = xhr.getResponseHeader("x-trace-list");
				if (headerResp !== null && headerResp !== "x-trace-list"){
					console.error(JSON.stringify({"Event":"GetBlocklistDownloadFailure","TraceListHead":headerResp,"ErrorObj":{"status":status,"text":xhr.statusText}}));
				}

				switch (status){
					case 0:
						Trace.Notify("Couldn't download blocklist because a connection couldn't be made to the server.", "protd");
						break;
					case 402:
						Trace.Notify("Your premium code is invalid! It has been removed from Trace's storage", "protd");
						break;
					case 403:
						Trace.Notify("One or more security parameters were missing when updating the blocklist", "protd");
						break;
					case 404:
						Trace.Notify("Trace recieved a 404 from " + sName + " blocklist server.","protd");
						break;
					case 508:
						Trace.Notify("Cloudflare error 508 when downloading update to blocklist.", "protd");
						break;
					case 520:
						Trace.Notify("Cloudflare error 520 when downloading update to blocklist.", "protd");
						break;
					default:
						Trace.Notify("Trace couldn't download the blocklist, unknown error from " + sName + " blocklist server.","protd");
						break;
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
			if (Trace.d.blocked.file.length > 0) Trace.d.validate.file = true;

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
						if (e.message && e.message.toLowerCase().includes("invalid value for argument 1")){
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
		/*
			If setting in allPage and is true - run it
			If setting in allPage and is false - don't run
			If setting in perPage and is true - run it
			If setting in perPage and is false - don't run
		*/
		whitelistDefaults:{
			"Pref_AudioFingerprint":true,
			"Pref_BatteryApi":true,
			"Pref_CanvasFingerprint":true,
			"Pref_ClientRects":true,
			"Pref_CookieEater":true,
			"Pref_ETagTrack":true,
			"Pref_GoogleHeader":true,
			"Pref_IPSpoof":true,
			"Pref_NetworkInformation":true,
			"Pref_HardwareSpoof":true,
			"Pref_PingBlock":true,
			"Pref_PluginHide":true,
			"Pref_ReferHeader":true,
			"Pref_ScreenRes":true,
			"Pref_UserAgent":true,
			"Pref_WebRTC":true
		},
		storedWhitelist:{},
		decodedWhitelist:{
			"keys":[],
			"values":[]
		},
		wlEnabled:true,
		NewWhitelistFormat:function(old){
			console.log("Saved new whitelist format");
			var trNewWl = {};
			for (var i = 0, l = Object.keys(old).length;i<l;i++){
				trNewWl["*"+Object.keys(old)[i]+"*"] = {
					"SiteBlocked":false,	// Allow access to the site
					"InitRequests":true,	// Allow the site to make requests to sites in the blocklist
					"Protections":Trace.c.whitelistDefaults		// Object of protections to change on the site
				};
			}
			return trNewWl;
		},
		GetStoredWhitelist:function(cb){
			delete Trace.c.storedWhitelist;

			Trace.c.storedWhitelist = {};
			Trace.v.s.get(["WebData_Whitelist","Main_PageList"],function(s){
				if ((typeof s.Main_PageList === "undefined" || s.Main_PageList === null) && typeof s.WebData_Whitelist !== "object"){
					// If new whitelist isn't set and old one isn't either save a blank one
					Trace.c.SaveWhitelist();
				} else if (typeof s.WebData_Whitelist === "object") {
					// If old whitelist is set convert to new format
					Trace.c.storedWhitelist = Trace.c.NewWhitelistFormat(s.WebData_Whitelist);
					Trace.v.s.remove(["WebData_Whitelist"]);
					Trace.c.SaveWhitelist();
					if (cb) cb(true);
				} else {
					// If new whitelist is there, set it.
					Trace.c.storedWhitelist = s.Main_PageList;
				}
				// Load Whitelist
				Trace.c.LoadWhitelist(cb);
			});
		},
		LoadWhitelist:function(cb){
			delete Trace.c.decodedWhitelist;
			Trace.c.decodedWhitelist = {
				"keys":[],
				"values":[]
			};

			var keys = Object.keys(Trace.c.storedWhitelist);
			var vals = Object.values(Trace.c.storedWhitelist);
			var defKeys = Object.keys(Trace.c.whitelistDefaults);
			var decoded = {
				"keys":[],
				"values":[]
			};
			var l = keys.length;

			for (var i = 0;i<l;i++){
				decoded["keys"].push(Trace.n.wildcardToRegExp(keys[i]));

				if (typeof vals[i] !== "object"){
					continue;
				}

				try {
					if (typeof vals[i].Protections !== "object" || Object.keys(vals[i].Protections).length !== defKeys.length){
						var repairedProts = vals[i].Protections;
						for (var j = 0, k = defKeys.length;j<k;j++){
							if (typeof repairedProts[defKeys[j]] === "undefined"){
								repairedProts[defKeys[j]] = Trace.c.whitelistDefaults[defKeys[j]];
								console.log("[plstd]-> Updated protections for",keys[i],defKeys[j]);
							}
						}
						vals[i].Protections = repairedProts;
						Trace.c.storedWhitelist[keys[i]].Protections = repairedProts;
						Trace.c.UpdateStorage();
					}
				} catch(e){
					console.warn("Caught error");
					console.error(e);
					onerror("WhiteListDecodeError","backgroundscript",1052,0,e);
				}

				decoded["values"].push(vals[i]);
			}
			Trace.c.decodedWhitelist = decoded;
			Trace.c.wlEnabled = l !== 0;

			if (Trace.DEBUG) console.log("[plstd]-> Decoded pagelist!");
			if (cb) cb();
		},
		SaveWhitelist:function(cb){
			if (Trace.DEBUG) console.log("[plstd]-> Saving pagelist!");
			Trace.v.s.set({
				"Main_PageList":Trace.c.storedWhitelist
			},function(){
				Trace.c.LoadWhitelist(cb);
			});
		},
		UpdateStorage:function(cb){
			Trace.v.s.set({
				"Main_PageList":Trace.c.storedWhitelist
			},function(){
				window.location.reload();
				if (cb) cb();
			});
		},
		ReturnWhitelist:function(callback){
			callback(Trace.c.storedWhitelist);
		},
		GetWhitelist:function(){
			return Trace.c.decodedWhitelist;
		},
		EmptyList:function(){
			Trace.c.storedWhitelist = {};
			Trace.c.SaveWhitelist();
		},
		EditItem:function(removeItem,addItem,newObject,cb){
			Trace.c.RemoveItem(removeItem);
			Trace.c.AddItem(addItem,newObject,cb);
		},
		AddItem:function(item,newObject,cb){
			if (typeof item !== "string" || item.length < 2){
				return "Invalid entry";
			}
			// this needs to stay as a variable statement to do some memory assignment trickery in firefox to fix issue #4
			var newSafeObject = JSON.parse(JSON.stringify(newObject));

			Trace.c.storedWhitelist[item] = newSafeObject;
			//Trace.c.storedWhitelist[item] = newObject;
			Trace.c.SaveWhitelist(cb);
		},
		RemoveItem:function(item,cb){
			delete Trace.c.storedWhitelist[item];
			if (cb) Trace.c.SaveWhitelist(cb);
		},
		CheckItem:function(url,protections){
			var execOrder = Trace.p.Current.Main_ExecutionOrder;
			var allowed = {};
			var entryInfo = {};

			for (var i = 0, l = Trace.c.decodedWhitelist.keys.length;i<l;i++){
				if (Trace.c.decodedWhitelist.keys[i].test(reqUrl)){
					entryInfo = Trace.c.decodedWhitelist.values[i];
					break;
				}
			}

			for (var j = 0, k = protections.length;j<k;i++){
				allowed[protections[j]] = execOrder.AllPage.indexOf(protections[j]) !== -1;
			}
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
		PingBlocker:function(d){
			if (d.type === "ping" && d.tabId < 0){
				Trace.s.LogStat(d.type);
				return {cancel:true};
			}
		},
		AssignChecker:function(){
			if (Trace.d.meta.isBlocking){
				Trace.d.RestartChecker();
				return false;
			}

			if (typeof chrome.webRequest === "undefined") {
				Trace.Notify("Failed to access browser WebRequest API. Maybe we don't have permission","webcd");
				return false;
			}

			try {
				chrome.webRequest.onBeforeRequest.addListener(Trace.d.RequestChecker,{
					"types":Trace.d.params.dataTypes,
					"urls":Trace.d.params.urlPatterns
				},["blocking"]);
			} catch(e){
				if (e.message && e.message.toLowerCase().includes("invalid value for argument 1.")){
					Trace.d.params.dataTypes.splice(8,4);
					Trace.d.params.dataTypes.splice(7,1);
					chrome.webRequest.onBeforeRequest.addListener(Trace.d.RequestChecker,{
						"types":Trace.d.params.dataTypes,
						"urls":Trace.d.params.urlPatterns
					},["blocking"]);
				}
			}
			Trace.d.meta.isBlocking = true;
		},
		RemoveChecker:function(){
			Trace.Notify("Stopping WebRequestController","webcd");
			chrome.webRequest.onBeforeRequest.removeListener(Trace.d.RequestChecker);
			Trace.d.meta.isBlocking = false;
		},
		RestartChecker:function(){
			Trace.d.RemoveChecker();
			setTimeout(Trace.d.AssignChecker,2000);
		},
		CleanURL:function(s,type){
			// If no params to edit, return
			if (!s.includes("?")) return s;

			if (Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].level === 4){
				return s.split('?')[0];
			}

			var params = Trace.g.URLCleaner.GetList(type);
			var parsed = new URL(s);

			for(var key of parsed.searchParams.keys()) {
				if (params.indexOf(key) === -1) continue;

				if (Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].method === "randomise"){
					parsed.searchParams.set(key,Trace.makeRandomID(10));
					if (Trace.DEBUG) console.log("%c -Rand Param: "+key,"color:#f00;font-size:1.2em");
				} else {
					parsed.searchParams.delete(key);
					if (Trace.DEBUG) console.log("%c -Remv Param: "+key,"color:#f00;font-size:1.2em");
				}
			}

			return parsed.href;
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

			if (Trace.c.wlEnabled === true){
				var initUrl, reqUrl = request.url;
				if (typeof request.initiator === "string") initUrl = request.initiator;
				if (typeof request.originUrl === "string") initUrl = request.originUrl;

				var wl = Trace.c.GetWhitelist();
				for (var i = 0, l = wl.keys.length;i<l;i++){
					//console.log(wl.keys[i]);
					//console.log(reqUrl,initUrl);
					// Check if this page is allowed to be accessed
					if (wl.keys[i].test(reqUrl)){
						if (wl.values[i].SiteBlocked === false){
							return {cancel:false};
						} else {
							return {cancel:true};
						}
					}
					// Check if this item is allowed to make requests
					if (typeof initUrl !== "undefined"){
						if (wl.keys[i].test(initUrl)){
							if (wl.values[i].InitRequests === true){
								return {cancel:false};
							}
						}
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
				if (file.length !== 0){
					if (Trace.n.arraySearch(Trace.d.blocked.file,file) !== -1){
						blockType = 5;
					}
				}
			}

			// Check if we need to block the request
			if (blockType !== 0){
				if (Trace.p.Current.Main_Trace.ProtectionStats.enabled === true){
					Trace.s.LogStat(request.type);
				}

				if (redirectToBlocked){
					return {redirectUrl:(chrome.runtime.getURL("html/blocked.html") + "#u;" + btoa(request.url) + "&" + blockType)};
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
					modifiedUrl = false;

					// Remove fragment before cleaning URL
					//if (fragment.length === 2){
						//newUrl = fragment[0];
					//}
					if ((request.type === "main_frame" || request.type === "sub_frame") && Trace.p.Current.Pref_WebController.urlCleaner.queryString.main_frame.level !== -1) {
						newUrl = Trace.d.CleanURL(newUrl,"main_frame");
						modifiedUrl = true;
					}

					// Re-add fragment
					//if (fragment.length === 2){
					//	newUrl = newUrl + "#" + fragment[1];
					//}
				}

				// If modifications were made then we redirect the user to the modified version
				if (modifiedUrl){
					return {redirectUrl:newUrl};
				}
			}

			return {cancel:false};
		}
	},

	// Main Header Functions
	h:{
		Helpers:{
			// URL that made the request (Cross browser solution)
			getInitiator:function(request){
				if (typeof request.initiator === "string") return request.initiator;	// Chrome, Opera...
				if (typeof request.originUrl === "string") return request.originUrl;	// Firefox
				if (typeof request.url === "string") return request.url;				// Started by user

				return "";
			},
			isRequestThirdParty:function(request){
				var reqUrl = Trace.n.extractRootDomain(request.url);
				var reqIni = Trace.n.extractRootDomain(Trace.h.Helpers.getInitiator(request));

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
				if (/Chrom(e|ium)/.test(navigator.userAgent)) {
					if (Trace.getChromeVersion() >= 72){
						cookieOpt_extraInfoSpec.push("extraHeaders");
						setCookieOpt_extraInfoSpec.push("extraHeaders");
					}
				}

				chrome.webRequest.onBeforeSendHeaders.addListener(
					Trace.h.Cookie.ModifySend,
					{urls:["http://*/*","https://*/*"]},
					cookieOpt_extraInfoSpec
				);
				chrome.webRequest.onHeadersReceived.addListener(
					Trace.h.Cookie.ModifyRecv,
					{urls:["http://*/*","https://*/*"]},
					setCookieOpt_extraInfoSpec
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onBeforeSendHeaders.removeListener(Trace.h.Cookie.ModifySend);
					chrome.webRequest.onHeadersReceived.removeListener(Trace.h.Cookie.ModifyRecv);
				}catch(e){
					console.error(e);
				}
			},
			ModifySend:function(details){
				// Do a large amount of checks to see if we are gonna edit these cookies
				if (Trace.p.Current.Pref_CookieEater.enabled !== true) return;

				var settings = Trace.p.Current.Pref_CookieEater.settings.cookie;

				if (settings.enabled !== true) return;
				if (settings.fp_method === "nothing" && settings.tp_method === "nothing") return;

				if (details.frameId < 0) return;
				if (details.url.substring(0,4).toLowerCase() !== "http") return;

				var cookieList = Trace.g.CookieEater.GetList();
				var method = "fp_method";

				if (Trace.h.Helpers.isRequestThirdParty(details)) {
					method = "tp_method";
				}

				// Loop each header
				for (var i=0;i<details.requestHeaders.length;++i){
					var headerName = details.requestHeaders[i].name.toString().toLowerCase();

					if (headerName !== "cookie") continue;

					var cp = new CookieParser(details.requestHeaders[i].value);

					if (settings[method] === "removeall"){
						details.requestHeaders.splice(i,1);
					} else if (settings[method] === "randomiseall"){
						cp.updateAllCookies(function(){
							return Trace.makeRandomID(15);
						});
						details.requestHeaders[i].value = cp.getString();
					} else if (settings[method] === "remove"){
						cp.removeCookies(cookieList);
						details.requestHeaders[i].value = cp.getString();
					} else if (settings[method] === "randomise"){
						cp.updateCookies(cookieList,function(){
							return Trace.makeRandomID(15);
						});
						details.requestHeaders[i].value = cp.getString();
					}

					break;
				}

				return {requestHeaders:details.requestHeaders};
			},
			ModifyRecv:function(details){
				// Do a large amount of checks to see if we are gonna edit these set-cookies
				if (Trace.p.Current.Pref_CookieEater.enabled !== true) return;

				var settings = Trace.p.Current.Pref_CookieEater.settings.setcookie;

				if (settings.enabled !== true) return;
				if (settings.fp_method === "nothing" && settings.tp_method === "nothing") return;

				if (details.frameId < 0) return;
				if (details.url.substring(0,4).toLowerCase() !== "http") return;

				var cookieList = Trace.g.CookieEater.GetList();
				var method = "fp_method";

				if (Trace.h.Helpers.isRequestThirdParty(details)) {
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
					} else if (settings[method] === "randomiseall"){
						p.updateCookie(Trace.makeRandomID(15));
						details.responseHeaders[i].value = p.setcookie;
					} else if (settings[method] === "remove"){
						if (cookieList.indexOf(p.cookiename) !== -1){
							details.responseHeaders.splice(i,1);
						}
					} else if (settings[method] === "randomise"){
						if (cookieList.indexOf(p.cookiename) !== -1){
							p.updateCookie(Trace.makeRandomID(15));
							details.responseHeaders[i].value = p.setcookie;
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
					Trace.h.Etag.Modify,
					{urls:["http://*/*","https://*/*"]},
					["responseHeaders"]
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onHeadersReceived.removeListener(Trace.h.Etag.Modify);
				}catch(e){
					console.error(e);
				}
			},
			Modify:function(details){
				if (Trace.p.Current.Pref_ETagTrack.enabled !== true) return;
				if (details.frameId < 0) return;
				if (details.url.substring(0,4).toLowerCase() !== "http") return;

				for (var i=0;i<details.responseHeaders.length;++i){
					var headerName = details.responseHeaders[i].name.toString().toLowerCase();

					// Skip headers that aren't etag
					if (headerName !== "etag") continue;

					details.responseHeaders.splice(i,1);
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
					Trace.h.Google.Modify,
					{urls:["<all_urls>"]},
					["blocking","requestHeaders"]
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onBeforeSendHeaders.removeListener(Trace.h.Google.Modify);
				}catch(e){
					console.error(e);
				}
			},
			Modify:function(details){
				// Check if we have any modifications to make, if not then don't waste resources
				var ghm = (
					(Trace.p.Current.Pref_GoogleHeader.rmChromeConnected.enabled === true) ||
					(Trace.p.Current.Pref_GoogleHeader.rmChromeUMA.enabled === true) ||
					(Trace.p.Current.Pref_GoogleHeader.rmChromeVariations.enabled === true) ||
					(Trace.p.Current.Pref_GoogleHeader.rmClientData.enabled === true)
				);
				if (Trace.p.Current.Pref_GoogleHeader.enabled !== true && ghm !== true) {
					return {requestHeaders:details.requestHeaders};
				}

				for (var i=0;i<details.requestHeaders.length;++i) {
					var headerName = details.requestHeaders[i].name.toString().toLowerCase();

					if (Trace.p.Current.Pref_GoogleHeader.rmChromeConnected.enabled === true) {
						if (headerName === "x-chrome-connected") {
							console.log("Removed x-c-c");
							details.requestHeaders.splice(i, 1);
							continue;
						}
					}
					if (Trace.p.Current.Pref_GoogleHeader.rmChromeUMA.enabled === true) {
						if (headerName === "x-chrome-uma-enabled") {
							details.requestHeaders.splice(i, 1);
							continue;
						}
					}
					if (Trace.p.Current.Pref_GoogleHeader.rmChromeVariations.enabled === true) {
						if (headerName === "x-chrome-variations") {
							console.log("Removed x-c-v");
							details.requestHeaders.splice(i, 1);
							continue;
						}
					}
					if (Trace.p.Current.Pref_GoogleHeader.rmClientData.enabled === true) {
						if (headerName === "x-client-data") {
							details.requestHeaders.splice(i, 1);
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
					Trace.h.IPSpoof.Modify,
					{urls:["<all_urls>"]},
					["blocking","requestHeaders"]
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onBeforeSendHeaders.removeListener(Trace.h.IPSpoof.Modify);
				}catch(e){
					console.error(e);
				}
			},
			Modify:function(details){
				if (Trace.p.Current.Pref_IPSpoof.enabled !== true){
					return {requestHeaders:details.requestHeaders};
				}

				// Attempt forge IP
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
				if (/Chrom(e|ium)/.test(navigator.userAgent)) {
					if (Trace.getChromeVersion() >= 72){
						refererOpt_extraInfoSpec.push("extraHeaders");
					}
				}

				chrome.webRequest.onBeforeSendHeaders.addListener(
					Trace.h.Referer.Modify,
					{urls:["<all_urls>"]},
					refererOpt_extraInfoSpec
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onBeforeSendHeaders.removeListener(Trace.h.Referer.Modify);
				}catch(e){
					console.error(e);
				}
			},
			Modify:function(details){
				if (Trace.p.Current.Pref_ReferHeader.enabled !== true){
					return {requestHeaders:details.requestHeaders};
				}

				var s = Trace.p.Current.Pref_ReferHeader.httpHeader;

				// Loop each header
				for (var i=0;i<details.requestHeaders.length;++i){
					var headerName = details.requestHeaders[i].name.toString().toLowerCase();

					if (headerName !== "referer") continue;

					//console.log("Referer->",details.url,details.requestHeaders[i].value.toString().toLowerCase());

					// Allow only secure origins
					if (Trace.p.Current.Pref_ReferHeader.httpHeader.onlySecureOrigins.enabled){
						if (details.url.substr(0,5) !== "https"){
							details.requestHeaders.splice(i,1);
							break;
						}
					}

					// Break out of loop if these conditions are met
					var headerVal = details.requestHeaders[i].value.toString();
					var hostname = Trace.n.extractHostname(headerVal);
					var sameHost = hostname === Trace.n.extractHostname(details.url);
					var sameRoot = Trace.n.extractRootDomain(headerVal) === Trace.n.extractRootDomain(details.url);

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
					Trace.h.UserAgent.Modify,
					{urls:["<all_urls>"]},
					["blocking","requestHeaders"]
				);
			},
			Stop:function(){
				try{
					chrome.webRequest.onBeforeSendHeaders.removeListener(Trace.h.UserAgent.Modify);
				}catch(e){
					console.error(e);
				}
			},
			Modify:function(details){
				if (Trace.p.Current.Pref_UserAgent.enabled 	!== true){
					return {requestHeaders:details.requestHeaders};
				}

				for (var i=0;i<details.requestHeaders.length;++i){
					var headerName = details.requestHeaders[i].name.toString().toLowerCase();

					// Skip headers that aren't user agent
					if (headerName !== "user-agent") continue;

					// Change header then break
					if (details.requestHeaders[i].value !== Trace.n.useragent){
						details.requestHeaders[i].value = Trace.n.useragent;
					}
					break;
				}

				// Return new headers to be sent
				return {requestHeaders:details.requestHeaders};
			}
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
				Trace.h.IPSpoof.Start();

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
						Trace.h.IPSpoof.Stop();
					}
					if (typeof Trace.p.Current.Pref_IPSpoof.traceIP.user_set !== "string" || Trace.p.Current.Pref_IPSpoof.traceIP.user_set.length < 7){
						Trace.p.Set("Pref_IPSpoof.traceIP.user_set","128.128.128.128");
						Trace.i.CurrentFakeIP = "128.128.128.128";
						Trace.Notify("Proxy IP Spoofing found an error with the IP used, using 128.128.128.128 instead.","pipsd");
						return;
					}

					// Set fake IP as one set by user
					Trace.i.CurrentFakeIP = Trace.p.Current.Pref_IPSpoof.traceIP.user_set;
					if (Trace.DEBUG) console.log("[pipsd]-> Set IP to:",Trace.p.Current.Pref_IPSpoof.traceIP.user_set);
				}
			} else {
				// Stop ip refresh if
				if (!onlyStart) {
					Trace.i.StopIPRefresh();
					Trace.h.IPSpoof.Stop();
				}
			}
		},
		StopIPRefresh:function(){
			if (!chrome.alarms) console.error("Alarms aren't supported in this browser.");
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
			GetList:function(){
				if (Trace.p.Current.Pref_CookieEater.enabled !== true){
					return [false];
				}

				// Create array to return
				var s = Trace.p.Current.Pref_CookieEater.list;
				var k = Object.keys(s);
				var r = [];
				for (var i = 0,l = k.length;i<l;i++){
					if (s[k[i]] === true){
						r.push(k[i]);
					}
				}

				return r;
			}
		},
		BadTopLevelDomain:{
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

				// Create array to return
				var s = Trace.p.Current.Pref_WebController.tld.settings;
				var k = Object.keys(s);
				var r = [];
				for (var i = 0,l = k.length;i<l;i++){
					if (s[k[i]] === true){
						r.push(k[i]);
					}
				}

				return r;
			}
		},
		URLCleaner:{
			ToggleProtection:function(){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					Trace.Notify("Trace will clean URLs when the WebRequest Controller is enabled.","urlcd");
					return;
				}
				Trace.Notify("Updated settings for URL Cleaner","urlcd");

				setTimeout(Trace.b.BlocklistLoader,1000);
			},
			GetList:function(){
				if (Trace.p.Current.Pref_WebController.enabled !== true){
					return [false];
				}
				if (Trace.p.Current.Pref_WebController.urlCleaner.queryString.enabled !== true){
					return [];
				}

				// Create array to return
				var s = Trace.p.Current.Pref_WebController.urlCleaner.queryString.params;
				var k = Object.keys(s);
				var r = [];
				for (var i = 0,l = k.length;i<l;i++){
					if (s[k[i]] === true){
						r.push(k[i]);
					}
				}

				return r;
			}
		}
	},

	// Functions to account for tabs
	t:{
		TabInfo:true,
		TabList:{},
		ActiveTab:{
			"tab":0,
			"window":0
		},
		Init:function(){
			if (Trace.t.TabInfo !== true) return;

			Trace.Notify("Loading information about current tabs...","tabmd");
			if (Trace.DEBUG) console.log("[tabmd]-> Initialising...");

			Trace.t.AssignEvents();
			Trace.t.GetAllTabs();
		},
		Events:{
			removed:function(id) {
				if (Trace.t.TabAccounted(id)) {
					delete Trace.t.TabList[id];
					if (Trace.DEBUG) console.log("[tabmd]-> Removed tab id",id);
				} else {
					if (Trace.DEBUG) console.log("[tabmd]-> Failed to remove tab id",id);
				}
			},
			created:function(tab){
				Trace.t.TabList[tab.id] = {url: tab.url};
				if (Trace.DEBUG) console.log("[tabmd]-> Added tab id",tab.id);
			},
			activate:function(id){
				Trace.t.ActiveTab.tab = id.tabId;
				Trace.t.ActiveTab.window = id.windowId;
				Trace.t.GetTabId(id.tabId);
			},
			highlight:function(tab){
				console.log(tab);
			},
			updated:function(d,c,e){
				// Fired when an attribute changes, e.g. url, or audible
				console.log("=======================================");
				console.log(d);
				console.log(c);
				console.log(e);
				console.log("=======================================");
			}
		},
		AssignEvents:function(){
			chrome.tabs.onRemoved.addListener(Trace.t.Events.removed);
			chrome.tabs.onCreated.addListener(Trace.t.Events.created);
			chrome.tabs.onActivated.addListener(Trace.t.Events.activate);
			chrome.tabs.onHighlighted.addListener(Trace.t.Events.highlight);
			chrome.tabs.onUpdated.addListener(Trace.t.Events.updated);
		},
		RemoveEvents:function(){
			chrome.tabs.onRemoved.removeListener(Trace.t.Events.removed);
			chrome.tabs.onCreated.removeListener(Trace.t.Events.created);
			chrome.tabs.onActivated.removeListener(Trace.t.Events.activate);
			chrome.tabs.onHighlighted.removeListener(Trace.t.Events.highlight);
			chrome.tabs.onUpdated.removeListener(Trace.t.Events.updated);
		},
		TabAccounted:function(id){
			return (typeof Trace.t.TabList[id] !== "undefined");
		},
		GetTabId:function(id){
			if (!Trace.t.TabAccounted(id)){
				if (Trace.DEBUG) console.log("[tabmd]-> Found new tab!",id);
				chrome.tabs.get(id,function(tab){
					Trace.t.TabList[id] = {url: tab.url};
				});
			}
		},
		GetAllTabs:function(){
			chrome.tabs.query({}, function(tabs) {
				for (var i = 0;i<tabs.length;i++){
					if (Trace.t.TabAccounted(tabs[i].id)) {
						if (Trace.DEBUG) console.log("[tabmd]-> Skipped tab id", tabs[i].id);
						continue;
					}
					Trace.t.TabList[tabs[i].id] = {url: tabs[i].url};
					if (Trace.DEBUG) console.log("[tabmd]-> Found new tab id", tabs[i].id);
				}
			});
		},
		ReturnTabInfo:function(windowId,tabId){
			if (Trace.DEBUG) console.log("[tabmd]-> Providing information about tab id",tabId);
			return Trace.t.TabList[tabId];
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

			return [
				(d.getFullYear() + "-" + mon + "-" + day).toString(),
				Date.now()+3000
			];
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
			var keys = Object.keys(Trace.s.Current);
			if (amount >= keys.length){
				cb();
				return;
			}

			for (var i = keys.length-amount;i < keys.length;i++){
				newstats[keys[i]] = Trace.s.Current[keys[i]];
			}
			Trace.s.Current = newstats;
			Trace.s.SaveStats(cb);
		},
		MainText:function(cb){
			Trace.v.s.get("trace_installdate",function(s){
				var d = [], installDate = "today.";
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
		Defaults:{
			"Pref_WebController":{
				"enabled":true,
				"showBlocked":{
					"enabled":true
				},
				"tld":{
					"enabled":true,
					"settings":{
						"accountant":false,
						"ads":true,
						"asia":false,
						"bid":true,
						"cc":false,
						"cf":false,
						"christmas":false,
						"click":true,
						"country":true,
						"cricket":false,
						"date":false,
						"diet":false,
						"download":true,
						"faith":true,
						"gdn":true,
						"gq":true,
						"kim":true,
						"link":true,
						"loan":false,
						"men":false,
						"mom":false,
						"om":true,
						"online":false,
						"party":false,
						"pro":false,
						"racing":false,
						"ren":false,
						"review":false,
						"science":true,
						"space":true,
						"stream":false,
						"study":false,
						"systems":false,
						"top":true,
						"trade":false,
						"vip":false,
						"webcam":true,
						"win":true,
						"work":true,
						"xin":false,
						"yokohama":false,
						"zip":true
					}
				},
				"urlCleaner":{
					"enabled":false,
					"queryString":{
						"enabled":true,
						"params":{
							"ga_source":true,
							"ga_medium":true,
							"ga_term":true,
							"ga_content":true,
							"ga_campaign":true,
							"ga_place":true,
							"utm_source":true,
							"utm_campaign":true,
							"utm_content":true,
							"utm_medium":true,
							"utm_name":true,
							"utm_cid":true,
							"utm_reader":true,
							"utm_term":true,
							"ad_bucket":false,
							"ad_size":false,
							"ad_slot":false,
							"ad_type":false,
							"adid":false,
							"adserverid":false,
							"adserveroptimizerid":false,
							"adtype":false,
							"adurl":false,
							"clickid":false,
							"clkurlenc":false,
							"fb_source":false,
							"fb_ref":false,
							"CampaignID":false,
							"AffiliateGuid":false,
							"AdID":false,
							"ImpressionGuid":false,
							"ga_fc":false,
							"ga_hid":false,
							"ga_sid":false,
							"ga_vid":false,
							"piggiebackcookie":false,
							"pubclick":false,
							"pubid":false,
							"num_ads":false,
							"tracking":false,
							"usegapi":false,
							"affiliate":false,
							"first_visit":false,
							"trackId":false,
							"_trkparms":false,
							"bdref":false,
							"bstk":false,
							"campaignid":false,
							"dclid":false,
							"documentref":false,
							"exitPop":false,
							"flash":false,
							"matchid":false,
							"mediadataid":false,
							"minbid":false,
							"page_referrer":false,
							"referrer":false,
							"reftype":false,
							"revmod":false,
							"rurl":false,
							"siteid":false,
							"tldid":false,
							"zoneid":false,
							"site":false,
							"fb":false,
							"pk_campaign":false,
							"_reqid":false,
							"data":false,
							"payload":false,
							"providerid":false,
							"rev":false,
							"uid":false,
							"sourceid":false,
							"origin":false
						},
						"main_frame":{
							"method":"remove"
						},
						"resources":{
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
			"Pref_HardwareSpoof":{
				"enabled":true,
				"webgl":{
					"enabled":false
					//"spoofGpu":{
					//	"enabled":
					//}
				},
				"hardware":{
					"enabled":true,
					"hardwareConcurrency":{
						"enabled":true,
						"value":4
					},
					"deviceMemory":{
						"enabled":true,
						"value":4
					}
				}
			},
			"Pref_CookieEater":{
				"enabled":false,
				"settings":{
					"setcookie":{
						"enabled":true,
						"fp_method":"nothing",
						"fp_level":1,
						"tp_method":"remove",
						"tp_level":1
					},
					"cookie":{
						"enabled":false,
						"fp_method":"nothing",
						"fp_level":1,
						"tp_method":"remove",
						"tp_level":1
					}
				},
				"list":{
					"__mmapiwsid":false,
					"__utmz":false,
					"__utmc":false,
					"__utma":false,
					"__cfduid":false,
					"_chartbeat2":false,
					"_ga":false,
					"_v__chartbeat3":false,
					"_vwo_uuid_v2":false,
					"_vwo_uuid_":false,
					"1P_JAR":false,
					"ads_prefs":false,
					"external_referer":false,
					"GoogleAdServingTest":false,
					"personalization_id":false,
					"S_adsense3-ui":false
				}
			},
			"Pref_ReferHeader":{
				"enabled":false,
				"jsVariable":{
					"enabled":true,
					"method":"remove"
				},
				"httpHeader":{
					"allowSameHost":{
						"enabled":true,
						"fullUrl":true
					},
					"allowSameDomain":{
						"enabled":true,
						"fullUrl":true
					},
					"allowThirdParty":{
						"enabled":false,
						"fullUrl":false
					},
					"onlySecureOrigins":{
						"enabled":true
					}
				}
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
				"enabled":false,
				"randomOpts":{
					"enabled":true,
					"values":[-50,50]
				},
				"commonResolutions":{
					"enabled":false,
					"resolutions":[]
				},
				"modifyDepths":{
					"enabled":false
				}
			},
			"Pref_BatteryApi":{
				"enabled":false
			},
			"Pref_ClientRects":{
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
			"Main_Interface":{
				"enabled":true,
				"Theme":{
					"name":"tracedefault",
					"timeAlterations":true,
					"navPlacement":"nav_left"
				}
			},
			"Main_Trace":{
				"DebugApp":{
					"enabled":false
				},
				"DomainCache":{
					"enabled":true
				},
				"ProtectionSessions":{
					"enabled":true,
					"affects":[]
				},
				"ProtectionStats":{
					"enabled":true
				},
				"TabStats":{
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
			"Main_ExecutionOrder":{
				"AllPage":[
					"Pref_CanvasFingerprint",
					"Pref_AudioFingerprint",
					"Pref_GoogleHeader",
					"Pref_ETagTrack",
					"Pref_PingBlock",
					"Pref_NetworkInformation",
					"Pref_ClientRects",
					"Pref_HardwareSpoof",
					"Pref_ScreenRes",
					"Pref_PluginHide",
					"Pref_WebRTC",
					"Pref_CookieEater",
					"Pref_ReferHeader",
					"Pref_UserAgent",
					"Pref_BatteryApi",
					"Pref_IPSpoof"
				],
				"PerPage":[]
			}
		},
		Current:{},
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
			Trace.v.s.get(["tracenewprefs"],function(s){
				if (typeof s.tracenewprefs !== "boolean"){
					Trace.p.SetDefaults(true,cb);
				} else {
					Trace.p.NewLoad(cb);
				}
			});
		},
		NewLoad:function(cb){
			if (!window.chrome.storage) alert("Trace encountered an error: Couldn't access Storage API.");

			if (Trace.DEBUG) console.info("[prefd]-> Trace[1] is loading your settings.");
			Trace.v.s.get(
				[
					"Pref_WebController",
					"Pref_CanvasFingerprint",
					"Pref_AudioFingerprint",
					"Pref_HardwareSpoof",
					"Pref_CookieEater",
					"Pref_ReferHeader",
					"Pref_GoogleHeader",
					"Pref_ETagTrack",
					"Pref_PingBlock",
					"Pref_NetworkInformation",
					"Pref_ScreenRes",
					"Pref_BatteryApi",
					"Pref_ClientRects",
					"Pref_PluginHide",
					"Pref_UserAgent",
					"Pref_WebRTC",
					"Pref_IPSpoof",
					"Main_Interface",
					"Main_Trace",
					"Main_ExecutionOrder"
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
									if (k === "Main_ExecutionOrder") continue;

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

					var currProts = [], defProts = [];
					currProts = currProts.concat(prefs.Main_ExecutionOrder.AllPage,prefs.Main_ExecutionOrder.PerPage);
					defProts = defProts.concat(Trace.p.Defaults.Main_ExecutionOrder.AllPage,Trace.p.Defaults.Main_ExecutionOrder.PerPage);
					if (currProts.length < defProts.length){
						for (var p = 0;p<defProts.length;p++){
							if (currProts.indexOf(defProts[p]) === -1) {
								console.log("[PrefRepair]-> Fixing Main_ExecutionOrder",defProts[p]);
								prefs.Main_ExecutionOrder.PerPage.push(defProts[p]);
								changes = true;
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
							console.log("[prefd]-> Fixed premium list");
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
				Trace.p.TakeAction(setting,(setting.includes(".") ? Trace.p.Current[sett[0]][sett[1]]["enabled"]: data[setting]));
				if (cb) cb();
			});
		},
		GetSetting:function(setting){
			var data = Trace.p.Current;
			var sett = setting.split(".");

			if (sett.length === 1) {
				return data[setting];
			} else if (sett.length === 2){
				return data[sett[0]][sett[1]];
			} else if (sett.length === 3) {
				return data[sett[0]][sett[1]][sett[2]];
			} else if (sett.length === 4) {
				return data[sett[0]][sett[1]][sett[2]][sett[3]];
			} else if (sett.length === 5) {
				return data[sett[0]][sett[1]][sett[2]][sett[3]][sett[4]];
			}

			return null;
		},
		SetMultiple:function(settings){
			var keys = Object.keys(settings);
			for (var i = 0, l = keys.length;i<l;i++){
				Trace.p.Set(keys[i],settings[keys[i]]);
			}
		},
		Set:function(setting,val){
			var data = Trace.p.Current;
			var sett = setting.split(".");
			var deadSafe = JSON.parse(JSON.stringify(val));

			if (sett.length === 1) {
				data[setting] = deadSafe;
			} else if (sett.length === 2){
				data[sett[0]][sett[1]] = deadSafe;
			} else if (sett.length === 3) {
				data[sett[0]][sett[1]][sett[2]] = deadSafe;
			} else if (sett.length === 4) {
				data[sett[0]][sett[1]][sett[2]][sett[3]] = deadSafe;
			} else if (sett.length === 5) {
				data[sett[0]][sett[1]][sett[2]][sett[3]][sett[4]] = deadSafe;
			}

			Trace.v.s.set(data,function(){
				Trace.p.TakeAction(setting,deadSafe);
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

			// Toggle Coookie Eater protection
			if (setting === "Pref_CookieEater"){
				if (val.enabled){
					Trace.h.Cookie.Start();
				} else {
					Trace.h.Cookie.Stop();
				}
			}

			// Toggle E-Tag protection
			if (setting === "Pref_ETagTrack"){
				if (val.enabled){
					Trace.h.Etag.Start();
				} else {
					Trace.h.Etag.Stop();
				}
			}

			// Toggle Google Header overall protection
			if (setting === "Pref_GoogleHeader"){
				if (val.enabled){
					Trace.h.Google.Start();
				} else {
					Trace.h.Google.Stop();
				}
			}

			// Toggle Google Header overall protection
			if (setting === "Pref_ReferHeader"){
				if (val.enabled){
					Trace.h.Referer.Start();
				} else {
					Trace.h.Referer.Stop();
				}
			}

			// Toggle user-agent randomiser background task
			if (setting === "Pref_UserAgent"){
				Trace.f.ToggleUserAgentRandomiser(false);
				if (val.enabled){
					Trace.h.UserAgent.Start();
				} else {
					Trace.h.UserAgent.Stop();
				}
			}

			if (setting === "Pref_PingBlock.pingRequest.enabled" || setting === "Pref_PingBlock"){
				Trace.b.ToggleBlockPings();
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
		CreateBackup:function(cb){
			Trace.v.s.get(null, function(items) {
				var backupObj = {
					"compat":1,
					"maxStoreSize":Trace.v.s.QUOTA_BYTES || 0,
					"backupTime":(new Date).toString(),
					"version":chrome.runtime.getManifest().version || null,
					"computed":{
						"verified":null
					},
					"data":{}
				};
				var k = Object.keys(items);
				for (var i = 0, l = k.length;i<l;i++){
					//if (k[i].substr(0,4) === "Pref" || k[i].substr(0,4) === "Main" || k[i].substr(0,4) === "stats"){
					if (k[i].substr(0,4) !== "WebC") {
						backupObj["data"][k[i]] = items[k[i]];
					} //}
				}

				try{
					backupObj["computed"]["verified"] = MD5(JSON.stringify(backupObj["data"],null,2));
				} catch(e){
					_UserCrashReportService(e);
				}

				cb(backupObj);
			});
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

// MD5 function to verify backups
var MD5 = function(s){function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]| (G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()};

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

//chrome.webRequest.onActionIgnored.addListener(function(a){
//	console.log(a);
//});

/*chrome.storage.onChanged.addListener(function(changes, namespace) {
	for (key in changes) {
		if (key === "stats_main" || key === "stats_db") return;
		var storageChange = changes[key];
		console.log('[brows] Storage key "'+key+'" in namespace "'+namespace+'" changed. Old value was "'+storageChange.oldValue+'", new value is "'+storageChange.newValue+'".');
	}
});*/