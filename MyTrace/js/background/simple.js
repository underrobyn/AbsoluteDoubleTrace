let Simple = {

	port:null,

	prefList:[
		"Pref_CanvasFingerprint",
		"Pref_AudioFingerprint",
		"Pref_WebGLFingerprint",
		"Pref_HardwareSpoof",
		"Pref_CookieEater",
		"Pref_CommonTracking",
		"Pref_ReferHeader",
		"Pref_GoogleHeader",
		"Pref_ETagTrack",
		"Pref_PingBlock",
		"Pref_NetworkInformation",
		"Pref_NativeFunctions",
		"Pref_ScreenRes",
		"Pref_BatteryApi",
		"Pref_ClientRects",
		"Pref_PluginHide",
		"Pref_UserAgent",
		"Pref_WebRTC",
		"Pref_IPSpoof"
	],

	presets:{
		low:{
			"Pref_ETagTrack.enabled":true,
			"Pref_PingBlock.enabled":true,
			"Pref_PingBlock.pingRequest.enabled":true,
			"Pref_PingBlock.sendBeacon.enabled":true,
			"Pref_PluginHide.enabled":true,
			"Pref_NativeFunctions.enabled":true,
			"Pref_NativeFunctions.windowOpen.enabled":true
		},
		medium:{
			"Pref_AudioFingerprint.enabled":true,
			"Pref_AudioFingerprint.audioBuffer.enabled":true,
			"Pref_AudioFingerprint.audioData.enabled":true,
			"Pref_AudioFingerprint.audioOfflineMain.enabled":true,
			"Pref_BatteryApi.enabled":true,
			"Pref_HardwareSpoof.enabled":true,
			"Pref_HardwareSpoof.hardware.enabled":true,
			"Pref_HardwareSpoof.hardware.deviceMemory.enabled":true,
			"Pref_HardwareSpoof.hardware.hardwareConcurrency.enabled":true,
			"Pref_HardwareSpoof.hardware.hwVrDisplays.enabled":true,
			"Pref_HardwareSpoof.hardware.hwGamepads.enabled":true,
			"Pref_ScreenRes.enabled":true,
			"Pref_ScreenRes.randomOpts.enabled":true,
			"Pref_ScreenRes.modifyDepths.enabled":true,
			"Pref_WebGLFingerprint.enabled":true,
			"Pref_WebGLFingerprint.parameters.enabled":true,
			"Pref_WebRTC.enabled":true,
			"Pref_WebRTC.wrtcInternal.enabled":true
		},
		high:{
			"Pref_AudioFingerprint.audioMain.enabled":true,
			"Pref_CanvasFingerprint.enabled":true,
			"Pref_ClientRects.enabled":true,
			"Pref_CommonTracking.enabled":true,
			"Pref_CommonTracking.settings.countly.enabled":true,
			"Pref_GoogleHeader.enabled":true,
			"Pref_GoogleHeader.rmChromeUMA.enabled":true,
			"Pref_GoogleHeader.rmChromeVariations.enabled":true,
			"Pref_GoogleHeader.rmChromeConnected.enabled":true,
			"Pref_ScreenRes.modifyPixelRatio.enabled":true,
			"Pref_WebGLFingerprint.gpuList.enabled":true,
			"Pref_WebRTC.wrtcPeerConnection.enabled":true,
			"Pref_WebRTC.wrtcDataChannel.enabled":true,
			"Pref_WebRTC.wrtcRtpReceiver.enabled":true
		},
		extreme:{
			"Pref_GoogleHeader.rmClientData.enabled":true,
			"Pref_NetworkInformation.enabled":true,
			"Pref_CommonTracking.settings.piwik.enabled":true,
			"Pref_CommonTracking.settings.google.enabled":true,
			"Pref_CommonTracking.settings.segment.enabled":true,
			"Pref_CommonTracking.settings.fbevents.enabled":true,
			"Pref_ReferHeader.enabled":true,
			"Pref_ReferHeader.httpHeader.allowSameHost.enabled":true,
			"Pref_ReferHeader.httpHeader.allowSameDomain.enabled":false,
			"Pref_ReferHeader.httpHeader.allowThirdParty.enabled":false,
			"Pref_ReferHeader.httpHeader.onlySecureOrigins.enabled":true
		}
	},

	open:function(){
		chrome.runtime.onConnect.addListener(function(port){
			Simple.port = port;
			port.onMessage.addListener(Simple.receive);
		});
	},

	receive:function(data){
		console.log(data);
		if (!data || !data.request){
			Simple.sendError("Unknown request sent to background page");
			return;
		}

		switch(data.request){
			case "connect":
				Simple.send({
					"response":"connected",
					"debug":Trace.DEBUG
				});
				break;
			case "update":
				Simple.handleUpdate(data);
				break;
			case "dashboard":
				Simple.sendDashboardUpdate(data);
				break;
			case "site-list":
				Simple.sendSiteListUpdate(data);
				break;
			default:
				Simple.sendError("Unknown request sent to background page");
				break;
		}
	},

	sendError:function(msg){
		Simple.send({
			"response":"error",
			"message":msg
		});
	},

	send:function(data){
		if (!Simple.port) return;
		Simple.port.postMessage(data);
	},

	handleUpdate:function(req){
		if (!req.name){
			Simple.sendError("No update method");
			return;
		}

		console.log(req);

		switch (req.name){
			case "protection-level":
				Simple.updateProtectionLevel(req);
				break;
			case "pause-trace":
				Simple.updatePause(req);
				break;
			case "web-controller":
				Simple.updateWebSettings(req);
				break;
			case "site-add":
				Simple.updateSiteAdd(req);
				break;
			case "site-remove":
				Simple.updateSiteRemove(req);
				break;
			case "site-protection-level":
				Simple.updateSiteProtectionLevel(req);
				break;
			default:
				Simple.sendError("Unknown update method");
				break;
		}
	},

	zeroCurrent:function(){
		let prefs = JSON.parse(JSON.stringify(Prefs.Current));

		for (let k in prefs){
			if (Simple.prefList.indexOf(k) === -1) continue;

			for (let j in prefs[k]){
				if (j === "enabled" && prefs[k][j] === true){
					prefs[k][j] = false;
					if (Trace.DEBUG) console.log(k,j,"=> disabled");
					continue;
				}

				for (let i in prefs[k][j]){
					if (i === "enabled" && prefs[k][j][i] === true){
						prefs[k][j][i] = false;
						if (Trace.DEBUG) console.log(k,j,i,"=> disabled");
						continue;
					}

					if (typeof prefs[k][j][i] === "object"){
						for (let h in prefs[k][j][i]){
							if (h === "enabled" && prefs[k][j][i][j] === true){
								prefs[k][j][i][j] = false;
								if (Trace.DEBUG) console.log(k,j,i,j,"=> disabled");
							}
						}
					}
				}
			}
		}

		Prefs.Current = prefs;
	},

	setPreset:function(preset){
		let updates = Simple.presets.low;

		if (preset === "medium") {
			updates = Object.assign(updates,Simple.presets.medium);
		} else if (preset === "high") {
			updates = Object.assign(updates,Simple.presets.medium,Simple.presets.high);
		} else if (preset === "extreme") {
			updates = Object.assign(updates,Simple.presets.medium,Simple.presets.high,Simple.presets.extreme);
		}

		Prefs.SetMultiple(updates, false);
	},

	makePresetPrefs:function(){
		["low", "medium", "high", "extreme"].forEach(function(preset){
			//Prefs.Presets[preset] = JSON.parse(JSON.stringify(Prefs.Defaults));
		});
	},

	handleUiChange:function(){
		console.log(Prefs.Current.Main_Simple);
	},

	sendDashboardUpdate:function(){
		Simple.send({
			"response":"update",

			"paused":Vars.paused,
			"pause_end":Vars.pauseEnd,

			"premium":Vars.Premium === "",

			"presets_enabled":Prefs.Current.Main_Simple.presets.enabled,
			"preset":Prefs.Current.Main_Simple.presets.global
		});
	},

	sendSiteListUpdate:function(){
		let decWl = Whitelist.storedList;
		let decKeys = Object.keys(decWl);
		let sendWl = {};

		for (let i = 0;i<decKeys.length;i++){
			sendWl[decKeys[i]] = {
				name:Simple.cleanEntryName(decKeys[i]),
				preset:decWl[decKeys[i]].PresetLevel
			};
		}

		Simple.send({
			"response":"site-list",
			"list":sendWl
		})
	},

	cleanEntryName:function(dirty){
		return dirty.replace(/\*/g,"");
	},

	updateProtectionLevel:function(req){
		if (!req.level || !req.preset) return;

		// Update settings
		if (req.preset !== "custom"){
			Simple.zeroCurrent();
			Simple.setPreset(req.preset);
		}

		Prefs.SetMultiple({
			"Main_Simple.presets.enabled":req.preset !== "custom",
			"Main_Simple.presets.global":req.level
		}, false);

		Simple.sendDashboardUpdate();
	},

	updatePause:function(){
		let newState = !Vars.paused;

		Vars.paused = newState;
		if (newState) Vars.pauseEnd = 99999;

		Simple.sendDashboardUpdate();
	},

	updateWebSettings:function(req){

	},

	updateSiteProtectionLevel:function(req){
		// TODO: Maybe retain current protection template
		var siteKey = req.entryid;
		var template = new ProtectionTemplate(false);
		template.PresetLevel = req.level;

		Whitelist.RemoveItem(siteKey,function(){
			Whitelist.AddItem(siteKey,template,Simple.sendSiteListUpdate);
		});
	},

	updateSiteAdd:function(req){
		/*try {
			// Check for "http" in string, if not add it as URL won't process...
			var entryParsed = new URL(req.entryid);
		} catch (e){

		}*/

		var siteKey = "*" + req.entryid + "*";
		var template = new ProtectionTemplate(false);
		template.PresetLevel = req.level;

		Whitelist.AddItem(siteKey,template,Simple.sendSiteListUpdate);
	},

	updateSiteRemove:function(req){
		Whitelist.RemoveItem(req.entryid,Simple.sendSiteListUpdate);
	}

};

Simple.open();