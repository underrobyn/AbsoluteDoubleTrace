var Trace = {

	DEBUG:true,

	Notify:function(msg,sect){
		if (Vars.bNotifications === false){
			if (Trace.DEBUG) console.info("%c[%s]-> !(%s)",'color:red',sect,msg);
			return;
		}

		if (Trace.DEBUG) console.info("%c[%s]-> Notified: %s",'color:darkblue',sect,msg);

		var opts = {
			"type":"basic",
			"message":msg,
			"title":"Trace",
			"iconUrl":Vars.notifIcon
		};
		try {
			chrome.notifications.create("notification",opts);
		} catch(e){
			console.log("Looks like notifications aren't actually allowed at a browser level.");
		}
	},

	// Chrome runtime functions
	a:{
		AssignRuntime:function(){
			var uninstallUrl = "https://absolutedouble.co.uk/trace/extension-uninstall?e=";

			if (/Chrome/.test(navigator.userAgent)) {
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
				Prefs.SetDefaults();
				Vars.s.set({"trace_installdate":Stats.GenTime()[0]});
				Stats.SaveStats();
				Web.BlocklistLoader(true);
				chrome.tabs.create({url:"/html/options.html#v2installed"});
			} else if (details.reason && details.reason === "update") {
				if (Trace.DEBUG) console.info("[mangd]-> Updated from: " + details.previousVersion);
			}
		},
		SuspendSave:function(){
			if (Prefs.Current.Main_Trace.ProtectionStats.enabled === true){
				Stats.SaveStats();
			}
		},
		ContentTalk:function(request, sender, sendResponse){
			switch (request.msg) {
				case "uaReq":
					sendResponse({
						userAgentString:Vars.useragent,
						osCPUString:Vars.oscpu,
						platformString:Vars.platform
					});
					break;
				case "gpuReq":
					sendResponse({
						gpuChose:Vars.gpuChose
					});
					break;
				case "checkList":
					// See if the whitelist can sort this one out for us
					if (Whitelist.wlEnabled === true){
						var reqUrl = request.url;

						var wl = Whitelist.GetWhitelist();
						for (var i = 0, l = wl.keys.length;i<l;i++){
							if (wl.keys[i].test(reqUrl)){
								var send = wl.values[i].Protections;
								sendResponse({
									"prefs":Prefs.Current,
									"tracePaused":Vars.paused,
									"runProtection":true,
									"data":send
								});
								return;
							}
						}
					}

					// Okay so the whitelist couldn't...
					var protections = Whitelist.whitelistDefaults;
					var keys = Object.keys(protections);
					for (var l = keys.length, i = 0;i<l;i++){
						protections[keys[i]] = Prefs.Current.Main_ExecutionOrder.PerPage.indexOf(keys[i]) === -1;
					}
					sendResponse({
						"prefs":Prefs.Current,
						"tracePaused":Vars.paused,
						"runProtection":false,
						"data":protections
					});
					break;
				case "getsetting":
					if (request.setting) {
						sendResponse({
							"data":Prefs.Current[request.setting]
						});
					} else {
						sendResponse(Prefs.Current);
					}
					break;
				case "getLoadedSettings":
					sendResponse({
						"pingAttr":Prefs.Current.Pref_PingBlock.removePingAttr.enabled,
						"relOpener":Prefs.Current.Pref_NativeFunctions.windowOpen.enabled
					});
					break;
				case "protectionUpdate":
					if (Trace.DEBUG) console.log("[TracePage] " + sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
					//console.log(request);

					sendResponse({
						"pingAttr":Prefs.Current.Pref_PingBlock.removePingAttr.enabled,
						"relOpener":Prefs.Current.Pref_NativeFunctions.windowOpen.enabled
					});
					break;
				default:
					console.error("Invalid message recieved");
					console.warn(request);
					break;
			}
		}
	},

	// Functions
	f:{
		StartTrace:function(){
			// Echo some console information
			console.log("\nStarting Trace v." + chrome.runtime.getManifest().version + "\nSource code: https://github.com/jake-cryptic/AbsoluteDoubleTrace/\n");

			// Create current object and prepare for loading
			Prefs.Current = Prefs.Defaults;
			Prefs.Defaults["tracenewprefs"] = true;

			// Load settings from storage
			Prefs.Load(function(){
				Trace.f.StartModules();
			});
		},
		StartModules:function(){
			// Load some settings into program
			Vars.bNotifications = Prefs.Current.Main_Trace.BrowserNotifications.enabled;
			Vars.eReporting = Prefs.Current.Main_Trace.ErrorReporting.enabled;
			Vars.pSessions = Prefs.Current.Main_Trace.ProtectionSessions.enabled;
			Vars.Premium = Prefs.Current.Main_Trace.PremiumCode;
			Tabs.TabInfo = Prefs.Current.Main_Trace.TabStats.enabled;
			Trace.DEBUG = Prefs.Current.Main_Trace.DebugApp.enabled;

			// Tell users that they can debug trace if they wish
			if (Trace.DEBUG === false){
				console.log("%cYou can see more debug messages by running this code: (function(){Prefs.Set('Main_Trace.DebugApp.enabled',true);window.location.reload();})();",'color:#fff;background-color:#1a1a1a;font-size:1.2em;padding:5px;');
			}

			// It's time to begin
			Trace.Notify("Starting Modules...","initd");

			// Load statistics into program
			if (Prefs.Current.Main_Trace.ProtectionStats.enabled === true)
				Stats.LoadStats();

			// Load statistics into program
			if (Prefs.Current.Main_Trace.ProtectionSessions.enabled === true)
				Trace.f.GenerateSession();

			// Assign keyboard shortcuts
			if (chrome.commands){
				if (Trace.DEBUG) console.log("[commd]-> Assigned commands event");
				chrome.commands.onCommand.addListener(Trace.f.KeyboardCommand);
			}

			// Ping blocks
			Web.ToggleBlockPings();

			// Load whitelist into Trace
			Whitelist.GetStoredWhitelist();

			if (Prefs.Current.Pref_WebController.enabled === true){
				WebBlocker.AssignChecker();
				Web.BlocklistLoader(false);
			}

			// Any post-header modifications start here
			if (Prefs.Current.Pref_CookieEater.enabled === true)
				Headers.Cookie.Start();

			if (Prefs.Current.Pref_ETagTrack.enabled === true)
				Headers.Etag.Start();

			if (Prefs.Current.Pref_GoogleHeader.enabled === true)
				Headers.Google.Start();

			if (Prefs.Current.Pref_ReferHeader.enabled === true)
				Headers.Referer.Start();

			if (Prefs.Current.Pref_UserAgent.enabled === true)
				Headers.UserAgent.Start();

			if (Prefs.Current.Pref_IPSpoof.enabled === true)
				Headers.IPSpoof.Start();

			// Start keeping tabs on the tabs
			Tabs.Init();

			// Alarm events to change UserAgent
			Trace.f.StartAlarmEvent();

			// Toggle alarms
			Trace.f.ToggleUserAgentRandomiser(true);
			Trace.f.ToggleGPURandomiser(true);
			Trace.i.ToggleIPSpoof(true);

			// Toggle WebRTC protection
			Trace.f.ToggleWebRtc();


			// Tell the user that we're done!
			Trace.Notify("Finished setting up.","initd");
		},
		GenerateSession:function(){
			var newSession = {};
			var keys = Prefs.Current.Main_Trace.ProtectionSessions.affects;

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
			cb(Prefs.Current.Main_ExecutionOrder);
		},
		ChangeExecOrder:function(prot,cb){
			var current = "AllPage", goto = "PerPage", duplicate = false, inArr = false;
			if (Prefs.Current.Main_ExecutionOrder.AllPage.indexOf(prot) !== -1){
				console.log("All:",prot);
				inArr = true;
			}
			if (Prefs.Current.Main_ExecutionOrder.PerPage.indexOf(prot) !== -1){
				console.log("Per:",prot);
				current = "PerPage";
				goto = "AllPage";

				if (inArr === true) duplicate = true;
			}

			console.log("[execd]-> Moving %s to %s",prot,goto);

			// Remove item
			var index = Prefs.Current.Main_ExecutionOrder[current].indexOf(prot);
			Prefs.Current.Main_ExecutionOrder[current].splice(index,1);

			// Add item
			if (!duplicate)
				Prefs.Current.Main_ExecutionOrder[goto].push(prot);

			// Save data
			Vars.s.set({
				"Main_ExecutionOrder":Prefs.Current.Main_ExecutionOrder
			},function(){
				if (cb) cb();
			});
		},
		KeyboardCommand:function(c){
			// This function is called whenever a keyboard shortcut is pressed
			if (Prefs.Current.Main_Trace.KeyboardCommand.enabled !== true){
				return;
			}

			if (Trace.DEBUG) console.log("[commd]-> User Command:",c);
			if (c === "ToggleTraceWeb"){
				if (Trace.DEBUG) console.info("Toggled Trace Web");
				Prefs.ToggleSetting("Pref_WebController");
			} else if (c === "ForceBlocklistUpdate") {
				if (Trace.DEBUG) console.info("Forcing the blocklist to update");
				Web.BlocklistLoader(true);
			} else if (c === "OpenTraceSettings") {
				if (Trace.DEBUG) console.info("Opening Trace's settings");
				chrome.tabs.create({url:"/html/options.html"});
			} else {
				Trace.Notify("Unknown Command","commd");
			}
		},
		ToggleUserAgentRandomiser:function(onlyStart){
			if (Prefs.Current.Pref_UserAgent.enabled === true){
				// Create random user agent
				Trace.f.ChooseUserAgent();

				// Assign browser event
				chrome.alarms.create("UserAgentRefresh",{periodInMinutes: Vars.UserAgentInterval});
			} else {
				if (!onlyStart){
					chrome.alarms.clear("UserAgentRefresh",function(success) {
						if (!success) Trace.Notify("Failed to stop user-agent refresh process (It probably wasn't running)","uabgd");
					});
				}
			}
		},
		ToggleGPURandomiser:function(onlyStart){
			if (Prefs.Current.Pref_WebGLFingerprint.enabled === true){
				// Create random user agent
				Trace.f.ChooseGPU();

				// Assign browser event
				chrome.alarms.create("GPURefresh",{periodInMinutes: Vars.GPUInterval});
			} else {
				if (!onlyStart){
					chrome.alarms.clear("GPURefresh",function(success) {
						if (!success) Trace.Notify("Failed to stop GPU refresh process (It probably wasn't running)","gpupd");
					});
				}
			}
		},

		ChooseGPU:function(){
			if (Prefs.Current.Pref_WebGLFingerprint.enabled === false) return;

			Vars.gpuChose = rA(Vars.gpuModels);
		},

		ChooseUserAgent:function(){
			// If user has enabled custom user agents and set some
			if (Prefs.Current.Pref_UserAgent.uaCust.enabled === true && Prefs.Current.Pref_UserAgent.uaCust.customUAs.length > 0){
				return rA(Prefs.Current.Pref_UserAgent.uaCust.customUAs);
			}

			// Choose OS
			var uaOSPool = [];
			if (Prefs.Current.Pref_UserAgent.uaOSConfig.AllowLinux.enabled === true){
				uaOSPool = uaOSPool.concat(Object.values(Vars.uaSettings.os.linux));
			}
			if (Prefs.Current.Pref_UserAgent.uaOSConfig.AllowMac.enabled === true){
				uaOSPool = uaOSPool.concat(Object.values(Vars.uaSettings.os.macos));
			}
			if (Prefs.Current.Pref_UserAgent.uaOSConfig.AllowWindows.enabled === true){
				uaOSPool = uaOSPool.concat(Object.values(Vars.uaSettings.os.windows));
			}

			// Choose browser
			var uaWBPool = [];
			if (Prefs.Current.Pref_UserAgent.uaWBConfig.AllowChrome.enabled === true){
				uaWBPool = uaWBPool.concat(Object.values(Vars.uaSettings.wb.chrome));
			}
			if (Prefs.Current.Pref_UserAgent.uaWBConfig.AllowFirefox.enabled === true){
				uaWBPool = uaWBPool.concat(Object.values(Vars.uaSettings.wb.firefox));
			}
			if (Prefs.Current.Pref_UserAgent.uaWBConfig.AllowEdge.enabled === true){
				uaWBPool = uaWBPool.concat(Object.values(Vars.uaSettings.wb.edge));
			}
			if (Prefs.Current.Pref_UserAgent.uaWBConfig.AllowSafari.enabled === true){
				uaWBPool = uaWBPool.concat(Object.values(Vars.uaSettings.wb.safari));
			}
			if (Prefs.Current.Pref_UserAgent.uaWBConfig.AllowVivaldi.enabled === true){
				uaWBPool = uaWBPool.concat(Object.values(Vars.uaSettings.wb.vivaldi));
			}

			Vars.oscpu = rA(uaOSPool);
			var browser = rA(uaWBPool);

			// Special case for firefox on mac, Thanks: https://github.com/jake-cryptic/AbsoluteDoubleTrace/issues/3#issuecomment-437178452
			if (Vars.oscpu.toLowerCase().includes("mac")){
				if (browser.includes("Firefox")){
					Vars.oscpu = Vars.oscpu.replace(/_/g,".");
				}
			}

			Vars.useragent = "Mozilla/5.0 (" + Vars.oscpu + ") " + browser;

			if (Vars.oscpu.toLowerCase().includes("win")){
				Vars.platform = rA(["Win32","Win64"]);
			} else if (Vars.oscpu.toLowerCase().includes("mac")){
				Vars.platform = rA(["MacIntel","MacPPC"]);
			} else {
				Vars.platform = rA(["Linux","X11","Linux 1686"]);
			}
		},
		StartAlarmEvent:function(){
			if (!chrome.alarms) {
				console.error("Alarms aren't supported in this browser.");
				return false;
			}
			try{
				chrome.alarms.onAlarm.addListener(function(a){
					if (a.name === "UserAgentRefresh" && Prefs.Current.Pref_UserAgent.enabled === true){
						Trace.f.ChooseUserAgent();
					}
					if (a.name === "GPURefresh" && Prefs.Current.Pref_WebGLFingerprint.enabled === true){
						Trace.f.ChooseGPU();
					}
					if (a.name === "StatsDatabaseRefresh" && Prefs.Current.Main_Trace.ProtectionStats.enabled === true){
						Stats.SaveStats();
					}
					if (a.name === "UserFakeIPRefresh" && Prefs.Current.Pref_IPSpoof.enabled === true){
						if (Prefs.Current.Pref_IPSpoof.traceIP.enabled === true){
							Trace.i.StopIPRefresh();
							return;
						}
						Trace.i.RefreshFakeUserIP();
					} else if (a.name === "UserFakeIPRefresh" && Prefs.Current.Pref_IPSpoof.enabled !== true){
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
				value:((Prefs.Current.Pref_WebRTC.enabled && Prefs.Current.Pref_WebRTC.wrtcInternal.enabled) ? "default_public_interface_only" : "default")
			});
		},
		RemovePremium:function(){
			Prefs.Set("Main_Trace.PremiumCode","");
			Prefs.Current.Main_Trace.PremiumCode = "";
		}
	},

	beta:{
		AssignEvents:function(){
			chrome.webRequest.onBeforeRequest.addListener(Trace.e.RequestCleaner,{
				"types":["image"],
				"urls":["http://*/*","https://*/*"]
			},["blocking"]);
		},
		RequestCleaner:function(request){
			// Check if URL is valid
			if (request.tabId === -1 || typeof request.url !== "string" || request.url.substring(0,4) !== "http"){
				return {cancel:false};
			}

			var newUrl = request.url;
			console.log(newUrl);

			newUrl = newUrl.split("?")[0];
			console.log(newUrl);

			return {redirectUrl:newUrl};
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
			if (Prefs.Current.Pref_IPSpoof.enabled !== true){
				Trace.i.StopIPRefresh();
				return;
			}

			var Rand = function(l,m){
				return Math.floor(Math.random()*(m-l)+l);
			};

			var digits = [
				Rand(Trace.i.IPRange[0][0],Trace.i.IPRange[0][1]),
				Rand(Trace.i.IPRange[1][0],Trace.i.IPRange[1][1]),
				Rand(Trace.i.IPRange[2][0],Trace.i.IPRange[2][1]),
				Rand(Trace.i.IPRange[3][0],Trace.i.IPRange[3][1])
			];

			Trace.i.CurrentFakeIP = digits[0] + "." + digits[1] + "." + digits[2] + "." + digits[3];
		},
		ToggleIPSpoof:function(onlyStart){
			if (Prefs.Current.Pref_IPSpoof.enabled === true){
				Headers.IPSpoof.Start();

				// Set custom via header
				if (Prefs.Current.Pref_IPSpoof.traceVia.enabled || typeof Prefs.Current.Pref_IPSpoof.traceVia.value !== "string"){
					Trace.i.CurrentViaHeader = "Proxy";
					if (Trace.DEBUG) console.log("[pipsd]-> Using standard via header");
				} else {
					Trace.i.CurrentViaHeader = Prefs.Current.Pref_IPSpoof.traceVia.value;
					if (Trace.DEBUG) console.log("[pipsd]-> Set Via Header to:",Prefs.Current.Pref_IPSpoof.traceVia.value);
				}

				// Set custom IP or start randomiser alarm
				if (Prefs.Current.Pref_IPSpoof.traceIP.enabled === true && chrome.alarms){
					Trace.i.RefreshFakeUserIP();
					chrome.alarms.create("UserFakeIPRefresh", {periodInMinutes: Vars.FakeIPInterval});
					if (Trace.DEBUG) console.log("[pipsd]-> Using Random IP Spoofer");
				} else {
					if (!onlyStart){
						Trace.i.StopIPRefresh();
						Headers.IPSpoof.Stop();
					}
					if (typeof Prefs.Current.Pref_IPSpoof.traceIP.user_set !== "string" || Prefs.Current.Pref_IPSpoof.traceIP.user_set.length < 7){
						Prefs.Set("Pref_IPSpoof.traceIP.user_set","128.128.128.128");
						Trace.i.CurrentFakeIP = "128.128.128.128";
						Trace.Notify("Proxy IP Spoofing found an error with the IP used, using 128.128.128.128 instead.","pipsd");
						return;
					}

					// Set fake IP as one set by user
					Trace.i.CurrentFakeIP = Prefs.Current.Pref_IPSpoof.traceIP.user_set;
					if (Trace.DEBUG) console.log("[pipsd]-> Set IP to:",Prefs.Current.Pref_IPSpoof.traceIP.user_set);
				}
			} else {
				// Stop ip refresh if
				if (!onlyStart) {
					Trace.i.StopIPRefresh();
					Headers.IPSpoof.Stop();
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
				if (Prefs.Current.Pref_CookieEater.enabled !== true){
					return [false];
				}

				// Create array to return
				var s = Prefs.Current.Pref_CookieEater.list;
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
				if (Prefs.Current.Pref_WebController.enabled !== true){
					Trace.Notify("Trace will protect against bad top level domains when domain blocking is enabled.","atld");
					return;
				}

				if (Prefs.Current.Pref_WebController.tld.enabled === true){
					Trace.Notify("Adding bad top level domains to blocklist","atld");
				} else {
					Trace.Notify("Removing bad top level domains from blocklist","atld");
				}

				setTimeout(Web.BlocklistLoader,1000);
			},
			GetList:function(){
				if (Prefs.Current.Pref_WebController.enabled !== true){
					return [false];
				}
				if (Prefs.Current.Pref_WebController.tld.enabled !== true){
					return [];
				}

				// Create array to return
				var s = Prefs.Current.Pref_WebController.tld.settings;
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
				if (Prefs.Current.Pref_WebController.enabled !== true){
					Trace.Notify("Trace will clean URLs when the WebRequest Controller is enabled.","urlcd");
					return;
				}
				Trace.Notify("Updated settings for URL Cleaner","urlcd");

				setTimeout(Web.BlocklistLoader,1000);
			},
			GetList:function(){
				if (Prefs.Current.Pref_WebController.enabled !== true){
					return [false];
				}
				if (Prefs.Current.Pref_WebController.urlCleaner.queryString.enabled !== true){
					return [];
				}

				// Create array to return
				var s = Prefs.Current.Pref_WebController.urlCleaner.queryString.params;
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
	}
};

// Assign runtime events
chrome.runtime.onInstalled.addListener(Trace.a.NewInstall);
chrome.runtime.onMessage.addListener(Trace.a.ContentTalk);
Trace.a.AssignRuntime();

// Start Protection
Trace.f.StartTrace();