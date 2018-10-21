/*
 * 	Trace page helper script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (!window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

var TracePage = {
	debug:2,
	Prefs:{
		BlockPing:{enabled:true,sendBeacon:{enabled:true}},
		BlockPlugin:{enabled:true},
		BlockBattery:{enabled:true},
		BlockNetInfo:{enabled:true},
		RandUserAgent:{enabled:true},
		BlockScreenRes:{enabled:true,randomOpts:{enabled:true,values:[-10,10]},commonResolutions:{enabled:false,resolutions:[]},modifyDepths:{enabled:false}},
		BlockReferHeader:{enabled:false,mainFunction:"remove",jsVariable:{enabled:true,method:"remove"}},
		BlockAudioFinger:{enabled:true,audioBuffer:{enabled:false},audioData:{enabled:false},audioOfflineMain:{enabled:true},audioMain:{enabled:true}},
		BlockCanvasFinger:{enabled:true,customRGBA:{enabled:false,rgba:[0,0,0,0]}},
		BlockWebRTC:{enabled:true,wrtcPeerConnection:{enabled:false},wrtcDataChannel:{enabled:false},wrtcRtpReceiver:{enabled:false}},
		ClientRects:{enabled:true},
		Hardware:{enabled:false,hardware:{enabled:true,hardwareConcurrency:{enabled:true,value:4},deviceMemory:{enabled:true,value:4}}}
	},
	protections:{},

	startTracePage:function(){
		chrome.runtime.sendMessage({msg: "checkList", url:location.href},function(response) {
			TracePage.init(response);
		});
	},

	/* Function to check if protections are allowed to run */
	canExec: function(protection){
		return TracePage.protections[protection];
	},

	/* Load information about settings from extension storage */
	init:function(data){
		TracePage.protections = data.data;
		console.log(data);
		console.timeStamp("tracePageGo");

		// In future version this will be received via content messaging system
		chrome.storage.local.get(
			[
				"Main_Trace",
				"Pref_TracePage",
				"Pref_PingBlock",
				"Pref_PluginHide",
				"Pref_BatteryApi",
				"Pref_ScreenRes",
				"Pref_UserAgent",
				"Pref_NetworkInformation",
				"Pref_WebRTC",
				"Pref_AudioFingerprint",
				"Pref_CanvasFingerprint",
				"Pref_ReferHeader",
				"Pref_ClientRects",
				"Pref_HardwareSpoof"
			],function(prefs){
				TracePage.Prefs = {
					BlockPing:prefs.Pref_PingBlock,
					BlockPlugin:prefs.Pref_PluginHide,
					BlockBattery:prefs.Pref_BatteryApi,
					BlockScreenRes:prefs.Pref_ScreenRes,
					RandUserAgent:prefs.Pref_UserAgent,
					BlockNetInfo:prefs.Pref_NetworkInformation,
					BlockWebRTC:prefs.Pref_WebRTC,
					BlockAudioFinger:prefs.Pref_AudioFingerprint,
					BlockCanvasFinger:prefs.Pref_CanvasFingerprint,
					BlockReferHeader:prefs.Pref_ReferHeader,
					ClientRects:prefs.Pref_ClientRects,
					Hardware:prefs.Pref_HardwareSpoof
				};

				console.timeStamp("tracePageGo");

				TracePage.runProtections();
			}
		)
	},

	/* Depending on what is enabled - run some protections */
	runProtections:function(){
		if (Object.keys(TracePage.Prefs).length === 0){
			return;
		}

		// TracePage.protectWebGL();

		if (TracePage.Prefs.ClientRects.enabled === true && TracePage.canExec("Pref_ClientRects")){
			TracePage.protectClientRects();
		}

		if (TracePage.Prefs.BlockCanvasFinger.enabled === true && TracePage.canExec("Pref_CanvasFingerprint")){
			TracePage.protectCanvasFinger();
		}

		if (TracePage.Prefs.BlockAudioFinger.enabled === true && TracePage.canExec("Pref_AudioFingerprint")){
			TracePage.protectAudioFinger();
		}

		if (TracePage.Prefs.BlockWebRTC.enabled === true && TracePage.canExec("Pref_WebRTC")){
			TracePage.protectWebRTC();
		}

		if (TracePage.Prefs.BlockNetInfo.enabled === true && TracePage.canExec("Pref_NetworkInformation")){
			TracePage.protectNavConnection();
		}

		if (TracePage.Prefs.BlockReferHeader.enabled === true && TracePage.Prefs.BlockReferHeader.jsVariable.enabled === true && TracePage.canExec("Pref_ReferHeader")){
			TracePage.protectReferDocument();
		}

		if (TracePage.Prefs.BlockPing.enabled === true && TracePage.Prefs.BlockPing.sendBeacon.enabled === true && TracePage.canExec("Pref_PingBlock")){
			TracePage.protectSendBeacon();
		}

		if (TracePage.Prefs.BlockPlugin.enabled === true && TracePage.canExec("Pref_PluginHide")){
			TracePage.protectNavPlugins();
		}

		if (TracePage.Prefs.BlockBattery.enabled === true && TracePage.canExec("Pref_BatteryApi")){
			TracePage.protectBatteryFunction();
		}

		if (TracePage.Prefs.BlockScreenRes.enabled === true && TracePage.canExec("Pref_ScreenRes")){
			TracePage.protectScreenRes();
		}

		if (TracePage.Prefs.Hardware.enabled === true && TracePage.canExec("Pref_HardwareSpoof")){
			TracePage.protectDeviceHardware();
		}

		if (TracePage.Prefs.RandUserAgent.enabled === true && TracePage.canExec("Pref_UserAgent")){
			chrome.runtime.sendMessage({msg: "uaReq"},function(response) {
				TracePage.protectUserAgent(response);
			});
		}

		console.timeEnd("tracePageGo");
	},

	/* Function to inject javascript code into pages */
	codeInject:function(code,func){
		var s = document.createElement("script");
		code = code || '';
		s.type = "text/javascript";
		s.textContent = "(" + code + ")("+func+");";
		document.documentElement.appendChild(s);
	},

	/* Individual protections start here */
	protectAudioFinger:function(){
		var opts = {
			audioBuffer:{enabled:TracePage.Prefs.BlockAudioFinger.audioBuffer.enabled},
			audioData:{enabled:TracePage.Prefs.BlockAudioFinger.audioData.enabled},
			audioOfflineMain:{enabled:TracePage.Prefs.BlockAudioFinger.audioOfflineMain.enabled},
			audioMain:{enabled:TracePage.Prefs.BlockAudioFinger.audioMain.enabled}
		};

		// If nothing is enabled just don't run the protection
		if (opts["audioBuffer"]["enabled"] !== true && opts["audioData"]["enabled"] !== true && opts["audioMain"]["enabled"] !== true){
			return;
		}

		TracePage.codeInject(function(opts){
			var opts = JSON.parse(opts);

			if (typeof opts !== "object"){
				console.error("[TracePage]Error [AFPP][0] opts not set");
				var opts = {
					audioBuffer:{enabled:true},
					audioData:{enabled:false},
					audioOfflineMain:{enabled:false},
					audioMain:{enabled:false}
				};
			}

			function disableFunction(frame,opts){
				if (typeof opts !== "object"){
					console.error("[TracePage]Error [AFPP][1] opts not set");
					var opts = {
						audioBuffer:{enabled:true},
						audioData:{enabled:false},
						audioOfflineMain:{enabled:false},
						audioMain:{enabled:false}
					};
				}

				if (frame === null) return;

				// Get those Objects
				var ab = frame.AudioBuffer;
				var an = frame.AnalyserNode;
				var ae = frame;

				if (opts["audioBuffer"]["enabled"] === true) {
					ab.prototype.copyFromChannel = function(){console.log("%c [TracePage]Blocked [AF][CF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");return false;};
					ab.prototype.getChannelData = function(){console.log("%c [TracePage]Blocked [AF][CD] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");return false;};
				}
				if (opts["audioData"]["enabled"] === true){
					an.prototype.getFloatFrequencyData = function(){console.log("%c [TracePage]Blocked [AF][FF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getByteFrequencyData = function(){console.log("%c [TracePage]Blocked [AF][BF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getFloatTimeDomainData = function(){console.log("%c [TracePage]Blocked [AF][TD] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getByteTimeDomainData = function(){console.log("%c [TracePage]Blocked [AF][BT] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
				}
				if (opts["audioOfflineMain"]["enabled"] === true){
					ae.OfflineAudioContext = function(){console.log("%c [TracePage]Blocked [AF][AO] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					ae.webkitOfflineAudioContext = function(){console.log("%c [TracePage]Blocked [AF][WO] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
				}
				if (opts["audioMain"]["enabled"] === true){
					ae.AudioContext = function(){console.log("%c [TracePage]Blocked [AF][AC] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					ae.webkitAudioContext = function(){console.log("%c [TracePage]Blocked [AF][WA] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
				}
			}

			disableFunction(window,opts);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						disableFunction(frame,opts);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						disableFunction(frame,opts);
						return cont.apply(this);
					}
				}
			});
		},"'" + JSON.stringify(opts) + "'");

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[AF] Disabled Audio Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectBatteryFunction:function() {
		TracePage.codeInject(function(){
			function disableFunction(frame){
				if (frame === null) return;
				if (frame.traceDefinedBattery === true) return;

				var BatteryManager = function(){
					this.charging = true;
					this.chargingTime = Infinity;
					this.dischargingTime = Infinity;
					this.level = 1.00;
					this.onchargingchange = null;
					this.onchargingtimechange = null;
					this.ondischargingtimechange = null;
					this.onlevelchange = null;
				};

				Object.defineProperty(frame.navigator,"getBattery",{
					enumerable:true,
					configurable:false,
					value:undefined //new BatteryManager()
				});

				frame.traceDefinedBattery = true;
			}
			Object.defineProperty(navigator,"getBattery",{
				enumerable:true,
				configurable:false,
				value:undefined
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[BA] Disabled Battery API Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectSendBeacon:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(navigator,"sendBeacon",{
				enumerable:true,
				configurable:false,
				value:function(){
					console.log("%c [TracePage]->Blocked[SB] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
					return true;
				}
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[SB] Disabled Ping Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectReferDocument:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(document,"referrer",{
				enumerable:true,
				configurable:false,
				value:""
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[RJ] Disabled Referer Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectClientRects:function(){
		TracePage.codeInject(function(){
			function disableFunction(frame){
				if (frame === null) return;
				if (frame.traceDefinedRects === true) return;

				var clientRects = frame.HTMLElement.prototype.getClientRects;

				Object.defineProperty(frame.HTMLElement.prototype,"getClientRects",{
					value:function(){
						var rects = clientRects.apply(this,arguments);
						var krect = Object.keys(rects);

						function genOffset(){
							return Math.floor(Math.random()*100)/100;
						}

						var DOMRectList = function(){};
						var list = new DOMRectList();
						list.length = krect.length;
						for (var i = 0;i<list.length;i++){
							if (krect[i] === "length") continue;
							list[i] 		= new DOMRect();
							list[i].top 	= rects[krect[i]].top + genOffset();
							list[i].right	= rects[krect[i]].right + genOffset();
							list[i].bottom 	= rects[krect[i]].bottom + genOffset();
							list[i].left 	= rects[krect[i]].left + genOffset();
							list[i].width 	= rects[krect[i]].width + genOffset();
							list[i].height 	= rects[krect[i]].height + genOffset();
							list[i].x 		= rects[krect[i]].x + genOffset();
							list[i].y 		= rects[krect[i]].y + genOffset();
						}

						return list;
					}
				});
				frame.traceDefinedRects = true;
			}

			disableFunction(window);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						disableFunction(frame);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						disableFunction(frame);
						return cont.apply(this);
					}
				}
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[CR] Disabled getClientRects Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectNavPlugins:function() {
		TracePage.codeInject(function(){
			function disableFunction(frame){
				if (frame === null) return;
				if (frame.traceDefinedPlugins === true) return;

				var PluginArray = function(){
					this.refresh = function(){
						console.log("%c [TracePage]->Blocked[PR] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
					};
					this.item = function(i){
						console.log("%c [TracePage]->Blocked[PI] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
						return {};
					};
				};

				Object.defineProperty(frame.navigator,"plugins",{
					enumerable:true,
					configurable:false,
					value:new PluginArray()
				});

				frame.traceDefinedPlugins = true;
			}

			disableFunction(window);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						disableFunction(frame);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						disableFunction(frame);
						return cont.apply(this);
					}
				}
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[NP] Disabled Plugin Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectNavConnection:function() {
		var ret = {
			downlink:7.5,
			effectiveType:"4g",
			onchange:null,
			rtt:100
		};

		if (TracePage.Prefs.BlockNetInfo.customNet.enabled === true){
			ret = TracePage.Prefs.BlockNetInfo.customNet.info;
		}

		TracePage.codeInject(function(ret){
			var dret = JSON.parse(ret);
			dret.addEventListener = function(){
				console.log("%c [TracePage]->Protected[NE] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
			};
			Object.defineProperty(navigator,"connection",{
				enumerable:true,
				configurable:false,
				get:function(){
					console.log("%c [TracePage]->Protected[NI] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
					return dret;
				}
			});
		},"'" + JSON.stringify(ret) + "'");

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[NP] Disabled Plugin Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectWebRTC:function(){
		var opts = {
			wrtcPeerConnection:{enabled:TracePage.Prefs.BlockWebRTC.wrtcPeerConnection.enabled},
			wrtcDataChannel:{enabled:TracePage.Prefs.BlockWebRTC.wrtcDataChannel.enabled},
			wrtcRtpReceiver:{enabled:TracePage.Prefs.BlockWebRTC.wrtcRtpReceiver.enabled}
		};

		// If nothing is enabled just don't run the protection
		if (opts["wrtcPeerConnection"]["enabled"] !== true && opts["wrtcDataChannel"]["enabled"] !== true && opts["wrtcRtpReceiver"]["enabled"] !== true){
			return;
		}

		TracePage.codeInject(function(opts){
			var opts = JSON.parse(opts);

			if (typeof opts !== "object") {
				opts = {
					wrtcPeerConnection:{enabled:true},
					wrtcDataChannel:{enabled:true},
					wrtcRtpReceiver:{enabled:false}
				};
				console.error("[TracePage]Error [AFPP][0] opts not set");
			}

			if (opts.wrtcPeerConnection.enabled === true){
				Object.defineProperty(window, "RTCPeerConnection",{
					enumerable:true,
					configurable:false,
					value:function(){console.log("%c [TracePage]->Protected[RTCPeerConnection] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");}
				});
				Object.defineProperty(window, "webkitRTCPeerConnection",{
					enumerable:true,
					configurable:false,
					value:function(){console.log("%c [TracePage]->Protected[webkitRTCPeerConnection] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");}
				});
			}
			if (opts.wrtcDataChannel.enabled === true){
				Object.defineProperty(window, "RTCDataChannel",{
					enumerable:true,
					configurable:false,
					value:function(){console.log("%c [TracePage]->Protected[RTCDataChannel] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");}
				});
			}
			if (opts.wrtcRtpReceiver.enabled === true){
				Object.defineProperty(window, "RTCRtpReceiver",{
					enumerable:true,
					configurable:false,
					value:function(){console.log("%c [TracePage]->Protected[RTCRtpReceiver] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");}
				});
			}
		},"'" + JSON.stringify(opts) + "'");

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[UA] Disabled User Agent Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectScreenRes:function(){
		var opts = {
			randomOpts:{
				enabled:TracePage.Prefs.BlockScreenRes.randomOpts.enabled,
				values:TracePage.Prefs.BlockScreenRes.randomOpts.values
			},
			commonResolutions:{
				enabled:TracePage.Prefs.BlockScreenRes.commonResolutions.enabled,
				resolutions:TracePage.Prefs.BlockScreenRes.commonResolutions.resolutions
			},
			modifyDepths:{
				enabled:false
			}
		};

		// If nothing is enabled just don't run the protection
		if (opts["randomOpts"]["enabled"] !== true && opts["commonResolutions"]["enabled"] !== true){
			return;
		}
		if (opts["commonResolutions"]["enabled"] === true && opts["commonResolutions"]["resolutions"].length === 0){
			return;
		}

		TracePage.codeInject(function(opts){
			var opts = JSON.parse(opts);

			function disableFunction(frame){
				if (frame === null) return;

				function defProp(name,val,offset){
					if (offset) val = window.screen[name] + val;

					Object.defineProperty(frame.screen,name,{
						enumerable:true,
						configurable:false,
						value:val
					});
				}

				if (frame.traceDefinedScreen === true) return;

				// Loop through different resolution settings adding a small random offset
				if (opts["randomOpts"]["enabled"] === true){
					var screenVars = ["availHeight","availLeft","availTop","availWidth","height","width"];
					for (var screenVar in screenVars){
						defProp(
							screenVars[screenVar],
							(Math.floor(Math.random()*parseInt(opts["randomOpts"]["values"][0]))+parseInt(opts["randomOpts"]["values"][1])),
							true
						);
					}
				}

				if (opts["commonResolutions"]["enabled"] === true){
					var chosen = opts["commonResolutions"]["resolutions"][Math.floor(Math.random()*opts["commonResolutions"]["resolutions"].length)];
					defProp("availHeight",chosen[1],false);
					defProp("availWidth",chosen[0],false);
					defProp("height",chosen[1],false);
					defProp("width",chosen[0],false);
				}

				// Change pixel depths
				var depthOffsets = [-6,6,12,24];
				if (opts["modifyDepths"]["enabled"] === true) {
					defProp("colorDepth", depthOffsets[Math.floor(Math.random() * depthOffsets.length)], true);
					defProp("pixelDepth", depthOffsets[Math.floor(Math.random() * depthOffsets.length)], true);
				}

				if (screen.mozOrientation) defProp("mozOrientation",undefined);

				frame.traceDefinedScreen = true;
			}

			disableFunction(window,opts);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						disableFunction(frame,opts);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						disableFunction(frame,opts);
						return cont.apply(this);
					}
				}
			});
		},"'" + JSON.stringify(opts) + "'");

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[SC] Disabled Screen Resolution Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectUserAgent:function(resp){
		var opts = {
			ua:resp.userAgentString,
			os:resp.osCPUString,
			plat:resp.platformString
		};

		// Set user-agent variables
		TracePage.codeInject(function(opts){
			opts = JSON.parse(opts);

			Object.defineProperty(navigator, "userAgent",{
				enumerable:true,
				configurable:true,
				value:opts.ua || ""
			});
			Object.defineProperty(navigator, "oscpu",{
				enumerable:true,
				configurable:true,
				value:opts.os || ""
			});
			Object.defineProperty(navigator, "platform",{
				enumerable:true,
				configurable:true,
				value:opts.plat || ""
			});
		},"'" + JSON.stringify(opts) + "'");

		// Remove browser specific variables
		TracePage.codeInject(function(){
			function disableFunction(frame){
				if (frame === null) return;

				if (frame.traceDefinedBrowserIdentity === true) return;

				Object.defineProperty(frame.navigator,"buildID",{
					enumerable:true,
					configurable:false,
					value:undefined
				});
				Object.defineProperty(frame.navigator,"vendor",{
					enumerable:true,
					configurable:false,
					value:""
				});
				Object.defineProperty(frame.navigator,"product",{
					enumerable:true,
					configurable:false,
					value:"Gecko"
				});

				frame.traceDefinedBrowserIdentity = true;
			}

			disableFunction(window);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						disableFunction(frame);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						disableFunction(frame);
						return cont.apply(this);
					}
				}
			});
		});

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[UA] Disabled User Agent Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectDeviceHardware:function(){
		var opts = {};

		var val = 6;
		TracePage.codeInject(function(val){
			Object.defineProperty(navigator, "deviceMemory",{
				enumerable:true,
				configurable:false,
				value:val
			});
		},val);
		TracePage.codeInject(function(val){
			Object.defineProperty(navigator, "hardwareConcurrency",{
				enumerable:true,
				configurable:false,
				value:val
			});
		},val);

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[HW] Modified hardware information.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	},
	protectWebGL:function(){
		// More work needs to be done on this - revisit for 2.1

		var gpu = "";
		if (true){
			//gpu += "ANGLE (" + gpuOptions + ")";
		}
		TracePage.codeInject(function(){
			// https://browserleaks.com/webgl
			function disableFunction(frame){
				if (frame === null) return;
				if (frame.traceDefinedWebGL === true) return;

				var webgl1 = frame.WebGLRenderingContext.prototype.getParameter,
					webgl2 = frame.WebGL2RenderingContext.prototype.getParameter;
				frame.WebGLRenderingContext.prototype.getParameter = function(param){
					console.log("GL1",param);
					return webgl1.apply(this,arguments);
				};
				Object.defineProperty(
					frame.WebGL2RenderingContext.prototype,
					"getParameter",
					{
						enumerable:true,
						writeable:true,
						configurable:true,
						value:function(param){
							var xy = [7936,7937,7938,35724,36347,39421];
							if (xy.indexOf(param) === -1){
								console.warn("GL2",param);
							} else {
								console.log("GL2",param);
							}
							return webgl2.apply(this,arguments);
						}
					}
				);

				frame.traceDefinedWebGL = true;
			}

			disableFunction(window);
			var wind = HTMLIFrameElement.prototype.__lookupGetter__('contentWindow'),
				cont = HTMLIFrameElement.prototype.__lookupGetter__('contentDocument');

			Object.defineProperties(HTMLIFrameElement.prototype,{
				contentWindow:{
					get:function(){
						var frame = wind.apply(this);
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return frame;
						try {frame.HTMLCanvasElement;}catch(e){}
						//disableFunction(frame);
						return frame;
					}
				},
				contentDocument:{
					get:function(){
						if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);
						var frame = wind.apply(this);
						try {frame.HTMLCanvasElement} catch(e){}
						//disableFunction(frame);
						return cont.apply(this);
					}
				}
			});
		});
	},
	protectCanvasFinger:function(){
		/*
			Function causes CSP errors, need to pass CSP information to
			function or change header to allow the code to be injected.
		*/

		var opts = [0,0,0,0];

		if (TracePage.Prefs.BlockCanvasFinger.customRGBA.enabled === true){
			opts = TracePage.Prefs.BlockCanvasFinger.customRGBA.rgba;
		} else {
			var rn = function(a,b){
				return (10-Math.floor(Math.random()*(b-a)+a));
			};

			opts = [
				rn(0, 20),
				rn(0, 20),
				rn(0, 20),
				rn(0, 20)
			];
		}

		TracePage.codeInject(function(t){
			var t = JSON.parse(t);
			function TraceCanvas(r,g,b,a,scriptId){
				var injectedEl = document.getElementById(scriptId);

				var TCInject = function(el){
					if (el.tagName.toUpperCase() === "IFRAME" && el.contentWindow) {
						try {
							var tryFrame = el.contentWindow.HTMLCanvasElement;
						} catch (e) {
							console.log("%c [TracePage]->[CF] iFrame Error: " + e,"font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #f00;");
							return;
						}
						TCExtract(el.contentWindow.HTMLCanvasElement);
						TCRender(el.contentWindow.CanvasRenderingContext2D);
						TCDocument(el.contentWindow.Document);
					}
				};
				var TCDocument = function(root){
					function docFunctions(old,name) {
						Object.defineProperty(root.prototype,name,{
							value: function() {
								var el = old.apply(this, arguments);
								if (el === null) {
									return null;
								}
								if (Object.prototype.toString.call(el) === '[object HTMLCollection]' ||
									Object.prototype.toString.call(el) === '[object NodeList]') {
									for (var i = 0; i < el.length; ++i) {
										var elx = el[i];
										TCInject(elx);
									}
								} else {
									TCInject(el);
								}
								return el;
							}
						});
					}

					docFunctions(root.prototype.createElement,"createElement");
					docFunctions(root.prototype.getElementById,"getElementById");
					docFunctions(root.prototype.createElementNS,"createElementNS");
					docFunctions(root.prototype.getElementsByName,"getElementsByName");
					docFunctions(root.prototype.getElementsByTagName,"getElementsByTagName");
					docFunctions(root.prototype.getElementsByClassName,"getElementsByClassName");
					docFunctions(root.prototype.getElementsByTagNameNS,"getElementsByTagNameNS");
				};
				var TCExtract = function(root){
					function blockExtraction(name,old){
						Object.defineProperty(root.prototype,name,{
							value:function(){
								var width = this.width;
								var height = this.height;
								var context = this.getContext("2d");
								var iData = context.getImageData(0, 0, width, height);
								for (var i = 0; i < height; i++) {
									for (var j = 0; j < width; j++) {
										var index = ((i * (width * 4)) + (j * 4));
										iData.data[index] 		= iData.data[index] + r;
										iData.data[index + 1] 	= iData.data[index + 1] + g;
										iData.data[index + 2] 	= iData.data[index + 2] + b;
										iData.data[index + 3] 	= iData.data[index + 3] + a;
									}
								}
								context.putImageData(iData,0,0);
								return old.apply(this,arguments);
							}
						});
					}

					blockExtraction("toDataURL", root.prototype.toDataURL);
					blockExtraction("toBlob", root.prototype.toBlob);
				};
				var TCRender = function(root){
					var getImageData = root.prototype.getImageData;
					Object.defineProperty(root.prototype,"getImageData",{
						value:function(){
							var iData = getImageData.apply(this, arguments);
							var height = iData.height;
							var width = iData.width;
							for (var i = 0; i < height; i++) {
								for (var j = 0; j < width; j++) {
									var index = ((i * (width * 4)) + (j * 4));
									iData.data[index] 		= iData.data[index] + r;
									iData.data[index + 1] 	= iData.data[index + 1] + g;
									iData.data[index + 2] 	= iData.data[index + 2] + b;
									iData.data[index + 3] 	= iData.data[index + 3] + a;
								}
							}
							return iData;
						}
					});
				};

				TCExtract(HTMLCanvasElement);
				TCRender(CanvasRenderingContext2D);
				TCDocument(Document);

				injectedEl.parentNode.removeChild(injectedEl);
			}

			function makeRandomStr() {
				var text = "";
				var charset = "abcdefghijklmnopqrstuvwxyz";
				for (var i = 0; i < 5; i++)
					text += charset.charAt(Math.floor(Math.random() * charset.length));
				return text;
			}

			var docId = makeRandomStr();
			var script = document.createElement('script');
			script.id = makeRandomStr();
			script.type = "text/javascript";

			var newChild = document.createTextNode('try{(' + TraceCanvas + ')(' + t[0] + ',' + t[1] + ',' + t[2] + ',' + t[3] + ',"' + script.id + '");}catch (e){console.error(e);}');
			script.appendChild(newChild);

			var node = (document.documentElement || document.head || document.body);
			if (typeof node[docId] === 'undefined') {
				node.hash = "sha256-wf6DxjSe9fYvJQA4ovN0kDd7agA/Y1U64tTTXUq+ZxU=";
				node.insertBefore(script,node.firstChild);
				node[docId] = makeRandomStr();
			}
		},"'" + JSON.stringify(opts) + "'");

		if (TracePage.debug <= 2) console.info("%c[TracePage]->[CF] Disabled Canvas Tracking.","font-size:1em;line-height:1.5em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;");
	}
};

console.time("tracePageGo");
// Let's begin
TracePage.startTracePage();