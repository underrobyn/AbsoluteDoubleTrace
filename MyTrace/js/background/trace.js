var Trace = {

	DEBUG:true,

	Notify:function(msg,sect){
		if (Vars.bNotifications === false){
			if (Trace.DEBUG) console.info("%c[%s]-> !(%s)",'color:red',sect,msg);
			return;
		}

		if (Trace.DEBUG) console.info("%c[%s]-> Notified: %s",'color:darkblue',sect,msg);

		let opts = {
			"type":"basic",
			"message":msg,
			"title":"Trace",
			"iconUrl":Vars.notifIcon
		};
		try {
			chrome.notifications.create("notification",opts);
		} catch(e){
			console.warn("Looks like notifications aren't actually allowed at a browser level.");
		}
	},

	// Chrome runtime functions
	a:{
		AssignRuntime:function(){
			// Set uninstall URL
			let storage_type = (!window.chrome.storage.sync ? window.chrome.storage.local : window.chrome.storage.sync);

			storage_type.get('userid',function(items) {
				if (typeof items === "undefined" || !items.hasOwnProperty("userid")) {
					items = {'userid': "Unknown"};
				}

				// We pass the users error reporting ID so that their data can be purged from the error reporting database
				let usr = items.userid;
				let uninstallUrl = Vars.uninstallUrl + usr;

				try {
					chrome.runtime.setUninstallURL(uninstallUrl,function(){
						if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL");
					});
				} catch(e){
					chrome.runtime.setUninstallURL(uninstallUrl);
					if (Trace.DEBUG) console.log("[mangd]-> Set uninstall URL using method 2");
				}
			});
		},

		NewInstall:function(details){
			if (!details.reason) return;

			if (details.reason === "update") {
				if (Trace.DEBUG) console.info("[mangd]-> Updated from: " + details.previousVersion);

				if (details.previousVersion === "2.4.3" || details.previousVersion === "2.4.4"){
					try {
						Prefs.Set("Main_Simple.presets.enabled", false);
					} catch (e){
						console.warn(e);
					}
				}
			} else if (details.reason === "install"){
				// If this is a new install, open welcome page and set default settings
				Prefs.SetDefaults();
				Prefs.s.set({"trace_installdate":Stats.GenTime()[0]});

				Stats.SaveStats();
				Web.BlocklistLoader(true);
				_UserCrashReportService({"NewInstall":true});

				chrome.tabs.create({url:"/html/settings.html#installed"});
			} else {
				console.error("Unknown reason: " + details.reason);
			}
		},

		ContentTalk:function(request, sender, sendResponse){
			switch (request.msg) {
				case "tracepage": Trace.a.TracePage(request, sender, sendResponse); break;
				case "traceload": Trace.a.TraceLoaded(request, sender, sendResponse); break;

				case "protectionRan":
					Trace.f.HandleCsUpdate(request);
					sendResponse({});
					break;

				default:
					console.error("Invalid message recieved");
					console.warn(request);
					break;
			}
		},

		TraceLoaded:function(request, sender, sendResponse){
			sendResponse({
				"pingAttr":Prefs.Current.Pref_PingBlock.removePingAttr.enabled,
				"relOpener":Prefs.Current.Pref_NativeFunctions.windowOpen.enabled
			});
		},

		TracePage:function(request, sender, sendResponse){
			let response = {
				"additional":{
					"Pref_UserAgent":{
						ua:Vars.useragent,
						os:Vars.oscpu,
						plat:Vars.platform
					},
					"Pref_WebGLFingerprint":{
						gpuChose:Vars.gpuChose
					}
				},
				"prefs":Prefs.Current,
				"tracePaused":Vars.paused,
				"url":request.url
			};

			let entryInWhitelist = false;

			// See if the whitelist can sort this one out for us
			if (Whitelist.wlEnabled === true || Whitelist.useTempWl === true){
				let reqUrl = request.url;
				let wl = Whitelist.GetWhitelist();

				for (let i = 0, l = wl.keys.length;i<l;i++){
					if (!wl.keys[i].test(reqUrl)) continue;

					response["data"] = wl.values[i].Protections;
					entryInWhitelist = true;
					break;
				}
			}

			if (!entryInWhitelist){
				let protections = Whitelist.whitelistDefaults;
				let keys = Object.keys(protections);
				for (let l = keys.length, i = 0;i<l;i++){
					protections[keys[i]] = Prefs.Current.Main_ExecutionOrder.PerPage.indexOf(keys[i]) === -1;
				}
				response["data"] = protections;
			}

			sendResponse(response);
		}
	},

	// Functions for Trace's start up
	f:{
		StartTrace:function(){
			// Echo some console information
			console.log("\nStarting Trace v." + chrome.runtime.getManifest().version + "\nSource code: https://github.com/jake-cryptic/AbsoluteDoubleTrace/\n");

			// Create current object and prepare for loading
			Prefs.Current = Prefs.Defaults;

			// Load settings from storage
			Prefs.Load(Trace.f.StartModules);
		},

		LoadStateVars:function(){
			Vars.bNotifications = Prefs.Current.Main_Trace.BrowserNotifications.enabled;
			Vars.eReporting = Prefs.Current.Main_Trace.ErrorReporting.enabled;
			Vars.pSessions = Prefs.Current.Main_Trace.ProtectionSessions.enabled;
			Vars.Premium = Prefs.Current.Main_Trace.PremiumCode;
			Tabs.TabInfo = Prefs.Current.Main_Trace.TabStats.enabled;
			Trace.DEBUG = Prefs.Current.Main_Trace.DebugApp.enabled;

			Vars.usePresets = Prefs.Current.Main_Simple.presets.enabled;
			Vars.preset = Prefs.Current.Main_Simple.presets.global;
		},

		StartModules:function(){
			// Load some settings into program
			Trace.f.LoadStateVars();

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
			if (Vars.pSessions === true)
				Session.init();

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
			Headers.Execute(true);

			// Start keeping tabs on the tabs
			Tabs.Init();

			// Alarm events to change UserAgent
			Alarms.Start();

			// Toggle alarms
			Alarms.Toggle.UserAgentRandomiser(true);
			Alarms.Toggle.GPURandomiser(true);
			Trace.i.ToggleIPSpoof(true);

			// Toggle WebRTC protection
			Trace.f.ToggleWebRtc();

			// Tell the user that we're done!
			Trace.Notify("Finished setting up.","initd");
		},

		OpenSettingsPage:function(section){
			let page = "html/options.html";

			if (Prefs.Current.Main_Simple.enabled === true){
				page = "html/settings.html";
			}

			if (section) page += "#view=" + section;

			chrome.tabs.create({url:page});
		},

		KeyboardCommand:function(c){
			// This function is called whenever a keyboard shortcut is pressed
			if (Prefs.Current.Main_Trace.KeyboardCommand.enabled !== true) return;

			if (Trace.DEBUG) console.log("[commd]-> User Command:",c);

			if (c === "ToggleTraceWeb"){
				if (Trace.DEBUG) console.info("Toggled Trace Web");
				Prefs.ToggleSetting("Pref_WebController");
			} else if (c === "PauseTrace") {
				if (Trace.DEBUG) console.info("Updated paused state");
				Vars.paused = !Vars.paused;
				Trace.Notify(Vars.paused ? "Trace paused." : "Trace protections are active again.","commd");
			} else if (c === "OpenTraceSettings") {
				if (Trace.DEBUG) console.info("Opening Trace's settings");
				TraceBg(function(bg){
					bg.Trace.f.OpenSettingsPage();
				});
			} else {
				Trace.Notify("Unknown Command","commd");
			}
		},

		ToggleWebRtc:function(){
			if (!chrome.privacy || !chrome.privacy.network.webRTCIPHandlingPolicy) {
				Trace.Notify("WebRTC Setting cannot be accessed. Please contact the developer.");
				return false;
			}

			chrome.privacy.network.webRTCIPHandlingPolicy.set({
				value:((Prefs.Current.Pref_WebRTC.enabled && Prefs.Current.Pref_WebRTC.wrtcInternal.enabled) ? "default_public_interface_only" : "default")
			});
		},

		HandleCsUpdate:function(req){
			//console.log(req);
			return;
			if (req.update !== "ran") return;
			if (Trace.DEBUG) console.log("[csupd]-> Protection updated");

			switch(req.protection){
				case "clientrects":
					Trace.Notify("Client rects protection triggered: " + req.part,"csupd");
					break;
				case "clientrectsbounding":
					Trace.Notify("Client rects protection triggered: " + req.part,"csupd");
					break;
				default:
					console.log("Unsupported message encountered.");
					console.error(req.protection);
					break;
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
			if (Prefs.Current.Pref_IPSpoof.enabled !== true){
				Trace.i.StopIPRefresh();
				return;
			}

			let digits = [
				randrange(Trace.i.IPRange[0][0],Trace.i.IPRange[0][1]),
				randrange(Trace.i.IPRange[1][0],Trace.i.IPRange[1][1]),
				randrange(Trace.i.IPRange[2][0],Trace.i.IPRange[2][1]),
				randrange(Trace.i.IPRange[3][0],Trace.i.IPRange[3][1])
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
				for (let alarm in list){
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
				for (let i = 0,l = k.length;i<l;i++){
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
				let s = Prefs.Current.Pref_WebController.tld.settings;
				let k = Object.keys(s);
				let r = [];
				for (let i = 0,l = k.length;i<l;i++){
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
				for (let i = 0,l = k.length;i<l;i++){
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
if (chrome.runtime){
	chrome.runtime.onInstalled.addListener(Trace.a.NewInstall);
	chrome.runtime.onMessage.addListener(Trace.a.ContentTalk);
	Trace.a.AssignRuntime();
}

// Start Protection
try {
	Trace.f.StartTrace();
} catch(e){
	setTimeout(Trace.f.StartTrace,500);
}