var Prefs = {
	Defaults:{
		"Pref_WebController":{
			"enabled":true,
			"lastRequest":1551633680,
			"useLocal":{
				"enabled":true
			},
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
					"club":true,
					"country":true,
					"cricket":false,
					"date":false,
					"diet":false,
					"download":true,
					"faith":true,
					"gdn":true,
					"gq":true,
					"icu":false,
					"jetzt":true,
					"kim":true,
					"link":true,
					"loan":false,
					"market":true,
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
					"wang":true,
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
				"a00000001":false,
				"a00000002":true,
				"a00000003":false,
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
		"Pref_WebGLFingerprint":{
			"enabled":false,
			"gpuList":{
				"enabled":true,
				"list":[]
			},
			"parameters":{
				"enabled":true,
				"list":{
					"MAX_TEXTURE_SIZE":13,
					"MAX_VIEWPORT_DIMS":14,
					"RED_BITS":3,
					"GREEN_BITS":3,
					"BLUE_BITS":3,
					"ALPHA_BITS":3,
					"STENCIL_BITS":3,
					"MAX_RENDERBUFFER_SIZE":14,
					"MAX_CUBE_MAP_TEXTURE_SIZE":14,
					"MAX_VERTEX_ATTRIBS":4,
					"MAX_TEXTURE_IMAGE_UNITS":4,
					"MAX_VERTEX_TEXTURE_IMAGE_UNITS":4,
					"MAX_VERTEX_UNIFORM_VECTORS":12
				}
			}
		},
		"Pref_NativeFunctions":{
			"enabled":false,
			"windowOpen":{
				"enabled":true
			}
		},
		"Pref_CommonTracking":{
			"enabled":false,
			"settings":{
				"piwik":{
					"enabled":false
				},
				"google":{
					"enabled":true
				},
				"segment":{
					"enabled":false
				},
				"countly":{
					"enabled":false
				},
				"fbevents":{
					"enabled":true
				}
			}
		},
		"Pref_HardwareSpoof":{
			"enabled":true,
			"hardware":{
				"enabled":true,
				"hardwareConcurrency":{
					"enabled":true,
					"value":4
				},
				"deviceMemory":{
					"enabled":true,
					"value":4
				},
				"hwVrDisplays":{
					"enabled":true
				},
				"hwGamepads":{
					"enabled":true
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
					"fullUrl":false
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
		"Pref_FontFingerprint":{
			"enabled":false,
			"measureText":{
				"enabled":true
			}
		},
		"Pref_PingBlock":{
			"enabled":true,
			"removePingAttr":{
				"enabled":false
			},
			"pingRequest":{
				"enabled":true
			},
			"sendBeacon":{
				"enabled":true
			}
		},
		"Pref_NetworkInformation":{
			"enabled":false
		},
		"Pref_ScreenRes":{
			"enabled":false,
			"randomOpts":{
				"enabled":false,
				"values":[-50,50]
			},
			"commonResolutions":{
				"enabled":true,
				"resolutions":[
					[1920,1080,24],
					[1920,1280,24],
					[1920,1440,24]
				]
			},

			// TODO: Add options to change this
			"modifyDepths":{
				"enabled":true
			},
			"modifyPixelRatio":{
				"enabled":false
			}
		},
		"Pref_BatteryApi":{
			"enabled":true
		},
		"Pref_ClientRects":{
			"enabled":true,
			"element":{
				"getclientrects":{
					"enabled":true
				},
				"getboundingclientrects":{
					"enabled":false
				}
			},
			"range":{
				"getclientrects":{
					"enabled":true
				},
				"getboundingclientrects":{
					"enabled":true
				}
			}
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
					"enabled":false
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
					"enabled":false
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
			},
			"deviceEnumeration":{
				"enabled":true
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
			// TODO: figure out what to do with this useless key
			"AdvancedUi":{
				"enabled":false
			},
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
		"Main_Simple":{
			"enabled":true,
			"presets":{
				"enabled":false,
				"global":2
			}
		},
		"Main_ExecutionOrder":{
			"AllPage":[
				"Pref_CanvasFingerprint",
				"Pref_AudioFingerprint",
				"Pref_GoogleHeader",
				"Pref_ETagTrack",
				"Pref_PingBlock",
				"Pref_NativeFunctions",
				"Pref_NetworkInformation",
				"Pref_ClientRects",
				"Pref_CommonTracking",
				"Pref_HardwareSpoof",
				"Pref_ScreenRes",
				"Pref_PluginHide",
				"Pref_WebRTC",
				"Pref_CookieEater",
				"Pref_ReferHeader",
				"Pref_UserAgent",
				"Pref_BatteryApi",
				"Pref_IPSpoof",
				"Pref_WebGLFingerprint"
			],
			"PerPage":[]
		}
	},
	Current:{},

	// Storage Type
	s:(!!chrome.storage ? chrome.storage.local : browser.storage.local),

	SetDefaults:function(cb){
		Trace.Notify("Setting new default settings...","prefd");

		Prefs.s.set(Prefs.Defaults);

		if (cb) cb();
	},

	Migrations:function(prefs){
		let changes = false;
		for (let i in prefs["Pref_ScreenRes"]["commonResolutions"]["resolutions"]){
			let that = prefs["Pref_ScreenRes"]["commonResolutions"]["resolutions"][i];
			if (that.length === 3) continue;

			changes = true;
			prefs["Pref_ScreenRes"]["commonResolutions"]["resolutions"][i][2] = 24;
		}

		return [prefs,changes];
	},

	Load:function(cb){
		if (!window.chrome.storage) alert("Trace encountered an error: Couldn't access Storage API.");

		if (Trace.DEBUG) console.info("[prefd]-> Trace is loading your settings.");
		Prefs.s.get(
			Object.keys(Prefs.Defaults),
			function(prefs){
				// Check that there are settings
				if (Object.keys(prefs).length === 0){
					Prefs.SetDefaults();
				}

				// Fix broken preferences
				let changes = false;
				for (let k in Prefs.Defaults){
					if (typeof prefs[k] !== typeof Prefs.Defaults[k]){
						prefs[k] = Prefs.Defaults[k];
						changes = true;
						console.log("[PrefRepair]->",k);
					}

					for (let j in Prefs.Defaults[k]){
						if (typeof prefs[k][j] !== typeof Prefs.Defaults[k][j]) {
							prefs[k][j] = Prefs.Defaults[k][j];
							changes = true;
							console.log("[PrefRepair]->", k, j);
						}

						if (typeof Prefs.Defaults[k][j] === "object"){
							for (let i in Prefs.Defaults[k][j]){
								if (k === "Main_ExecutionOrder") continue;

								if (typeof prefs[k][j][i] !== typeof Prefs.Defaults[k][j][i]) {
									prefs[k][j][i] = Prefs.Defaults[k][j][i];
									changes = true;
									console.log("[PrefRepair]->", k, j, i);
								}

								if (typeof Prefs.Defaults[k][j][i] === "object"){
									for (let h in Prefs.Defaults[k][j][i]){
										if (typeof prefs[k][j][i][h] !== typeof Prefs.Defaults[k][j][i][h]) {
											prefs[k][j][i][h] = Prefs.Defaults[k][j][i][h];
											changes = true;
											console.log("[PrefRepair]->", k, j, i, h);
										}
									}
								}
							}
						}
					}
				}

				let currProts = [], defProts = [];
				currProts = currProts.concat(prefs.Main_ExecutionOrder.AllPage,prefs.Main_ExecutionOrder.PerPage);
				defProts = defProts.concat(Prefs.Defaults.Main_ExecutionOrder.AllPage,Prefs.Defaults.Main_ExecutionOrder.PerPage);
				if (currProts.length < defProts.length){
					for (let p = 0;p<defProts.length;p++){
						if (currProts.indexOf(defProts[p]) === -1) {
							console.log("[PrefRepair]-> Fixing Main_ExecutionOrder",defProts[p]);
							prefs.Main_ExecutionOrder.PerPage.push(defProts[p]);
							changes = true;
						}
					}
				}

				// Perform setting migrations
				let migration = Prefs.Migrations(prefs);
				if (migration[1] === true) {
					console.log("[prefd]-> Preference migration occurred");
					prefs = migration[0];
					changes = true;
				}

				// Check if we need to save preferences
				if (changes === true){
					console.log("[prefd]-> Preferences repaired and saved.");
					Prefs.s.set(prefs);
				}

				if (typeof prefs.Pref_WebController.installCodes.a00000003 === "undefined"){
					if (prefs.Main_Trace.PremiumCode.length > 5) {
						prefs.Pref_WebController.installCodes["a00000003"] = true;
						prefs.Pref_WebController.installCodes["a00000001"] = true;
						console.log("[prefd]-> Fixed premium list");
					}
				}

				// Set settings
				Prefs.Current = prefs;

				// Callback
				cb();
			}
		);
	},

	ChangeExecOrder:function(prot,cb){
		let current = "AllPage", goto = "PerPage", duplicate = false, inArr = false;
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
		let index = Prefs.Current.Main_ExecutionOrder[current].indexOf(prot);
		Prefs.Current.Main_ExecutionOrder[current].splice(index,1);

		// Add item
		if (!duplicate)
			Prefs.Current.Main_ExecutionOrder[goto].push(prot);

		// Save data
		Prefs.s.set({
			"Main_ExecutionOrder":Prefs.Current.Main_ExecutionOrder
		},function(){
			if (cb) cb();
		});
	},

	ReturnExecOrder:function(cb){
		cb(Prefs.Current.Main_ExecutionOrder);
	},

	ToggleSetting:function(setting,cb){
		let data = Prefs.Current;

		if (setting.includes(".")){
			var sett = setting.split(".");
			data[sett[0]][sett[1]]["enabled"] = !Prefs.Current[sett[0]][sett[1]]["enabled"];
		} else {
			data[setting]["enabled"] = !Prefs.Current[setting]["enabled"];
		}

		Prefs.s.set(data,function(){
			Prefs.TakeAction(setting,(setting.includes(".") ? Prefs.Current[sett[0]][sett[1]]["enabled"]: data[setting]));
			if (cb) cb();
		});
	},

	GetSetting:function(setting){
		let data = Prefs.Current;
		let sett = setting.split(".");

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

	DisablePresetMode:function(){
		Vars.usePresets = false;
		Prefs.Set("Main_Simple.presets.enabled", false);
	},

	SetMultiple:function(settings,disablePresets = true){
		let keys = Object.keys(settings);
		for (let i = 0, l = keys.length;i<l;i++){
			Prefs.Set(keys[i],settings[keys[i]],disablePresets);
		}
	},

	Set:function(setting,val,disablePresets = true){
		let data = Prefs.Current;
		let sett = setting.split(".");
		let deadSafe = JSON.parse(JSON.stringify(val));

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

		Prefs.s.set(data,function(){
			Prefs.TakeAction(setting,deadSafe,disablePresets);
		});
	},

	TakeAction:function(setting,val,disablePresets = true){
		if (Trace.DEBUG) console.info("[prefd]-> Updating",setting,"to",val);

		if (!strMatchesItemInArr(setting,["Main_Trace","Main_Simple"]) && Vars.usePresets === true && disablePresets){
			Prefs.DisablePresetMode();
		}

		switch (setting){
			// Toggle debug messages
			case "Main_Trace.DebugApp":				Trace.DEBUG = val;			break;

			// Toggle browser notifications
			case "Main_Trace.BrowserNotifications":	Vars.bNotifications = val;	break;

			// Toggle error reporting
			case "Main_Trace.ErrorReporting":		Vars.eReporting = val;		break;

			// Update current premium code
			case "Main_Trace.PremiumCode":			Vars.Premium = val;			break;

			// Simple UI preferences
			case "Main_Simple":
			case "Main_Simple.enabled":
				Simple.handleUiChange();
				break;
			case "Main_Simple.presets.enabled":
				Vars.usePresets = val;
				Simple.sendDashboardUpdate();
				break;
			case "Main_Simple.presets.global":
				Vars.preset = val;
				Simple.sendDashboardUpdate();
				break;

			// Toggle Coookie Eater protection
			case "Pref_CookieEater":
				if (val.enabled){
					Headers.Cookie.Start();
				} else {
					Headers.Cookie.Stop();
				}
				break;

			// Toggle E-Tag protection
			case "Pref_ETagTrack":
				if (val.enabled){
					Headers.Etag.Start();
				} else {
					Headers.Etag.Stop();
				}
				break;

			// Toggle Google Header overall protection
			case "Pref_GoogleHeader":
				if (val.enabled){
					Headers.Google.Start();
				} else {
					Headers.Google.Stop();
				}
				break;

			// Toggle Referer Header web protection
			case "Pref_ReferHeader":
				if (val.enabled){
					Headers.Referer.Start();
				} else {
					Headers.Referer.Stop();
				}
				break;

			// Toggle ping protections
			case "Pref_PingBlock":
			case "Pref_PingBlock.pingRequest.enabled":
				Web.ToggleBlockPings();
				break;

			// Toggle user-agent randomiser background task
			case "Pref_UserAgent":
				Alarms.Toggle.UserAgentRandomiser(false);
				if (val.enabled){
					Headers.UserAgent.Start();
				} else {
					Headers.UserAgent.Stop();
				}
				break;

			// Toggle domain blocking protection
			case "Pref_WebController":
			case "Pref_WebController.enabled":
				if (val.enabled){
					Web.BlocklistLoader(false);
					WebBlocker.AssignChecker();
				} else {
					WebBlocker.RemoveChecker();
				}
				break;

			// Toggle domain tld protection
			case "Pref_WebController.tld":
			case "Pref_WebController.tld.level":
				Trace.g.BadTopLevelDomain.ToggleProtection();
				break;

			// Toggle WebGL background task
			case "Pref_WebGLFingerprint":
				Alarms.Toggle.GPURandomiser(false);
				break;

			// Toggle web-rtc protection
			case "Pref_WebRTC":
			case "Pref_WebRTC.wrtcInternal.enabled":
				Trace.f.ToggleWebRtc();
				break;

			default:
				// IPSpoof settings
				if (setting.includes("Pref_IPSpoof")){
					Trace.i.ToggleIPSpoof(false);
				} else {
					//if (Trace.DEBUG) console.info("[prefd]-> No action to take for", setting);
				}
				break;
		}
	},

	CreateBackup:function(cb){
		Prefs.s.get(null, function(items) {
			var backupObj = {
				"compat":1,
				"maxStoreSize":Prefs.s.QUOTA_BYTES || 0,
				"backupTime":(new Date).toString(),
				"version":chrome.runtime.getManifest().version || null,
				"browser":navigator.userAgent || "Unknown.",
				"computed":{
					"verified":null
				},
				"data":{}
			};
			let k = Object.keys(items);
			for (let i = 0, l = k.length;i<l;i++){
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
		Prefs.s.get(null, function(items) {
			console.log(items);
		});
	},
	ClearStorage:function(){
		chrome.storage.local.clear(function() {
			let error = chrome.runtime.lastError;
			if (error) {
				console.error(error);
			}
		});
	}
};