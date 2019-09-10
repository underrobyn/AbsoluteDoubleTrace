var Simple = {

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
			"Pref_AudioFingerprint.audioMain.enabled":true,
			"Pref_BatteryApi.enabled":true,
			"Pref_HardwareSpoof.enabled":true,
			"Pref_HardwareSpoof.hardware.enabled":true,
			"Pref_HardwareSpoof.hardware.deviceMemory.enabled":true,
			"Pref_HardwareSpoof.hardware.hardwareConcurrency.enabled":true,
			"Pref_ScreenRes.enabled":true,
			"Pref_ScreenRes.randomOpts.enabled":true,
			"Pref_ScreenRes.modifyDepths.enabled":true,
			//"Pref_ScreenRes.modifyPixelRatio.enabled":true,
			"Pref_WebRTC.enabled":true,
			"Pref_WebRTC.wrtcInternal.enabled":true,
		},
		high:{
			"Pref_CanvasFingerprint.enabled":true,
			"Pref_ClientRects.enabled":true,
			"Pref_GoogleHeader.enabled":true,
			"Pref_GoogleHeader.rmChromeUMA.enabled":true,
			"Pref_GoogleHeader.rmChromeVariations.enabled":true,
			"Pref_GoogleHeader.rmChromeConnected.enabled":true,
			"Pref_WebGLFingerprint.enabled":true,
			"Pref_WebRTC.wrtcPeerConnection.enabled":true,
			"Pref_WebRTC.wrtcDataChannel.enabled":true,
			"Pref_WebRTC.wrtcRtpReceiver.enabled":true,
		},
		extreme:{
			"Pref_GoogleHeader.rmClientData.enabled":true,
			"Pref_NetworkInformation.enabled":true,
			"Pref_ReferHeader.enabled":true,
			"Pref_ReferHeader.httpHeader.allowSameHost.enabled":true,
			"Pref_ReferHeader.httpHeader.allowSameDomain.enabled":false,
			"Pref_ReferHeader.httpHeader.allowThirdParty.enabled":false,
			"Pref_ReferHeader.httpHeader.onlySecureOrigins.enabled":true,
		}
	},

	open:function(){
		chrome.runtime.onConnect.addListener(function(port){
			Simple.port = port;
			port.onMessage.addListener(Simple.recieve);
		});
	},

	recieve:function(data){
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
		Simple.port.postMessage(data);
	},

	handleUpdate:function(req){
		if (!req.name){
			Simple.sendError("No update method");
			return;
		}

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
			default:
				Simple.sendError("Unknown update method");
				break;
		}
	},

	zeroCurrent:function(){
		var prefs = JSON.parse(JSON.stringify(Prefs.Current));
		
		for (var k in prefs){
			if (Simple.prefList.indexOf(k) === -1) continue;

			for (var j in prefs[k]){
				if (j === "enabled" && prefs[k][j] === true){
					prefs[k][j] = false;
					if (Trace.DEBUG) console.log(k,j,"=> disabled");
					continue;
				}

				for (var i in prefs[k][j]){
					if (i === "enabled" && prefs[k][j][i] === true){
						prefs[k][j][i] = false;
						if (Trace.DEBUG) console.log(k,j,i,"=> disabled");
						continue;
					}

					if (typeof prefs[k][j][i] === "object"){
						for (var h in prefs[k][j][i]){
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
		var updates = Simple.presets.low;

		if (preset === "medium") {
			updates = Object.assign(updates,Simple.presets.medium);
		} else if (preset === "high") {
			updates = Object.assign(updates,Simple.presets.medium,Simple.presets.high);
		} else if (preset === "extreme") {
			updates = Object.assign(updates,Simple.presets.medium,Simple.presets.high,Simple.presets.extreme);
		}

		Prefs.SetMultiple(updates);
	},

	updateProtectionLevel:function(req){
		if (!req.level) return;

		Simple.zeroCurrent();
		Simple.setPreset(req.level);
	},

	updatePause:function(req){

	},

	updateWebSettings:function(req){

	}

};

Simple.open();