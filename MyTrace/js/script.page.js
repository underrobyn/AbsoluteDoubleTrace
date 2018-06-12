/* Copyright AbsoluteDouble Trace 2018 */

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}

var TracePage = {
	debug:false,
	currentPrefs:{
		TracePage:{enabled:true},
		BlockPing:{enabled:true,sendBeacon:{enabled:true}},
		BlockPlugin:{enabled:true},
		BlockBattery:{enabled:true},
		BlockNetInfo:{enabled:true},
		RandUserAgent:{enabled:true},
		BlockScreenRes:{enabled:true},
		BlockReferHeader:{enabled:false,mainFunction:"remove",jsVariable:{enabled:true,method:"remove"}},
		BlockAudioFinger:{enabled:true,audioBuffer:{enabled:false},audioData:{enabled:false},audioOfflineMain:{enabled:true},audioMain:{enabled:true}},
		BlockCanvasFinger:{enabled:true,customRGBA:{enabled:false,rgba:[0,0,0,0]}},
		BlockWebRTC:{enabled:true,wrtcPeerConnection:{enabled:false},wrtcDataChannel:{enabled:false},wrtcRtpReceiver:{enabled:false}}
	},
	whitelist:{},
	init:function(){
		TracePage.getPrefs(function(enabled){
			if (enabled) {
				TracePage.realInit();
			}
		});
	},
	realInit:function(){
		if (Object.keys(TracePage.currentPrefs).length === 0){
			return;
		}

		// Check if site in whitelist for TracePage
		if (Object.keys(TracePage.whitelist).length !== 0){
			var mainUrl = location.hostname;
			var rootUrl = TracePage.extractRootDomain(mainUrl),
				hostUrl = TracePage.extractHostname(mainUrl);

			if (TracePage.whitelist[rootUrl] !== undefined){
				if (TracePage.whitelist[rootUrl].TracePage === true){
					return;
				}
			}
			if (TracePage.whitelist[hostUrl] !== undefined){
				if (TracePage.whitelist[hostUrl].TracePage === true){
					return;
				}
			}
		}

		if (TracePage.currentPrefs.BlockCanvasFinger.enabled === true){
			TracePage.protectCanvasFinger();
		}

		if (TracePage.currentPrefs.BlockAudioFinger.enabled === true){
			TracePage.protectAudioFinger();
		}

		if (TracePage.currentPrefs.BlockWebRTC.enabled === true){
			TracePage.protectWebRTC();
		}

		if (TracePage.currentPrefs.BlockNetInfo.enabled === true){
			TracePage.protectNavConnection();
		}

		if (TracePage.currentPrefs.BlockReferHeader.enabled === true && TracePage.currentPrefs.BlockReferHeader.jsVariable.enabled === true){
			TracePage.protectReferDocument();
		}

		if (TracePage.currentPrefs.BlockPing.enabled === true && TracePage.currentPrefs.BlockPing.sendBeacon.enabled === true){
			TracePage.protectSendBeacon();
		}

		if (TracePage.currentPrefs.BlockPlugin.enabled === true){
			TracePage.protectNavPlugins();
		}

		if (TracePage.currentPrefs.BlockBattery.enabled === true){
			TracePage.protectBatteryFunction();
		}

		if (TracePage.currentPrefs.BlockScreenRes.enabled === true){
			TracePage.protectScreenRes();
		}

		if (TracePage.currentPrefs.RandUserAgent.enabled === true){
			chrome.runtime.sendMessage({msg: "uaReq"},function(response) {
				TracePage.protectUserAgent(response);
			});
		}
	},
	codeInject:function(code,func){
		var s = document.createElement("script");
		code = code || '';
		s.type = "text/javascript";
		s.textContent = "(" + code + ")("+func+");";
		document.documentElement.appendChild(s);
	},
	getPrefs:function(callback){
		chrome.storage.local.get(
			[
				"Main_Trace",
				"WebData_Whitelist",
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
				"Pref_ReferHeader"
			],function(prefs){
				TracePage.currentPrefs = {
					TracePage:prefs.Pref_TracePage,
					BlockPing:prefs.Pref_PingBlock,
					BlockPlugin:prefs.Pref_PluginHide,
					BlockBattery:prefs.Pref_BatteryApi,
					BlockScreenRes:prefs.Pref_ScreenRes,
					RandUserAgent:prefs.Pref_UserAgent,
					BlockNetInfo:prefs.Pref_NetworkInformation,
					BlockWebRTC:prefs.Pref_WebRTC,
					BlockAudioFinger:prefs.Pref_AudioFingerprint,
					BlockCanvasFinger:prefs.Pref_CanvasFingerprint,
					BlockReferHeader:prefs.Pref_ReferHeader
				};

				TracePage.whitelist = prefs.WebData_Whitelist;
				TracePage.debug = prefs.Main_Trace.DebugApp.enabled;

				callback(prefs.Pref_TracePage.enabled);
			}
		)
	},
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
		var domain = TracePage.extractHostname(url),
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
	protectAudioFinger:function(){
		var opts = {
			audioBuffer:{enabled:TracePage.currentPrefs.BlockAudioFinger.audioBuffer.enabled},
			audioData:{enabled:TracePage.currentPrefs.BlockAudioFinger.audioData.enabled},
			audioOfflineMain:{enabled:TracePage.currentPrefs.BlockAudioFinger.audioOfflineMain.enabled},
			audioMain:{enabled:TracePage.currentPrefs.BlockAudioFinger.audioMain.enabled}
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
					ab.prototype.copyFromChannel = function(){console.warn("[TracePage]Blocked [AF][CF] Audio Tracking");return false;};
					ab.prototype.getChannelData = function(){console.warn("[TracePage]Blocked [AF][CD] Audio Tracking");return false;};
				}
				if (opts["audioData"]["enabled"] === true){
					an.prototype.getFloatFrequencyData = function(){console.warn("[TracePage]Blocked [AF][FF] Audio Tracking"); return false;};
					an.prototype.getByteFrequencyData = function(){console.warn("[TracePage]Blocked [AF][BF] Audio Tracking"); return false;};
					an.prototype.getFloatTimeDomainData = function(){console.warn("[TracePage]Blocked [AF][TD] Audio Tracking"); return false;};
					an.prototype.getByteTimeDomainData = function(){console.warn("[TracePage]Blocked [AF][BT] Audio Tracking"); return false;};
				}
				if (opts["audioOfflineMain"]["enabled"] === true){
					ae.OfflineAudioContext = function(){console.warn("[TracePage]Blocked [AF][AO] Audio Tracking"); return false;};
					ae.webkitOfflineAudioContext = function(){console.warn("[TracePage]Blocked [AF][WO] Audio Tracking"); return false;};
				}
				if (opts["audioMain"]["enabled"] === true){
					ae.AudioContext = function(){console.warn("[TracePage]Blocked [AF][AC] Audio Tracking"); return false;};
					ae.webkitAudioContext = function(){console.warn("[TracePage]Blocked [AF][WA] Audio Tracking"); return false;};
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

		if (TracePage.debug) console.info("[TracePage]->[AF] Disabled Audio Tracking.");
	},
	protectBatteryFunction:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(navigator,"getBattery",{
				enumerable:true,
				configurable:false,
				value:undefined
			});
		});

		if (TracePage.debug) console.info("[TracePage]->[BA] Disabled Battery API Tracking.");
	},
	protectSendBeacon:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(navigator,"sendBeacon",{
				enumerable:true,
				configurable:false,
				value:function(){
					console.warn("[TracePage]->Blocked[SB]");
					return true;
				}
			});
		});

		if (TracePage.debug) console.info("[TracePage]->[SB] Disabled Ping Tracking.");
	},
	protectReferDocument:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(document,"referrer",{
				enumerable:true,
				configurable:false,
				value:""
			});
		});

		if (TracePage.debug) console.info("[TracePage]->[RJ] Disabled Referer Tracking.");
	},
	protectNavPlugins:function() {
		TracePage.codeInject(function(){
			Object.defineProperty(navigator,"plugins",{
				enumerable:true,
				configurable:false,
				get:function(){
					console.warn("[TracePage]->Blocked[PL]");
					return {};
				}
			});
		});

		if (TracePage.debug) console.info("[TracePage]->[NP] Disabled Plugin Tracking.");
	},
	protectNavConnection:function() {
		var ret = {
			downlink:7.5,
			effectiveType:"4g",
			onchange:null,
			rtt:100
		};

		if (TracePage.currentPrefs.BlockNetInfo.customNet.enabled === true){
			ret = TracePage.currentPrefs.BlockNetInfo.customNet.info;
		}

		TracePage.codeInject(function(ret){
			var dret = JSON.parse(ret);
			Object.defineProperty(navigator,"connection",{
				enumerable:true,
				configurable:false,
				get:function(){
					console.warn("[TracePage]->Protected[NI]");
					return dret;
				}
			});
		},"'" + JSON.stringify(ret) + "'");

		if (TracePage.debug) console.info("[TracePage]->[NP] Disabled Plugin Tracking.");
	},
	protectWebRTC:function(){
		var opts = {
			wrtcPeerConnection:{enabled:TracePage.currentPrefs.BlockWebRTC.wrtcPeerConnection.enabled},
			wrtcDataChannel:{enabled:TracePage.currentPrefs.BlockWebRTC.wrtcDataChannel.enabled},
			wrtcRtpReceiver:{enabled:TracePage.currentPrefs.BlockWebRTC.wrtcRtpReceiver.enabled}
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
					value:function(){console.warn("[TracePage]->Protected[RTCPeerConnection]");}
				});
				Object.defineProperty(window, "webkitRTCPeerConnection",{
					enumerable:true,
					configurable:false,
					value:function(){console.warn("[TracePage]->Protected[webkitRTCPeerConnection]");}
				});
			}
			if (opts.wrtcDataChannel.enabled === true){
				Object.defineProperty(window, "RTCDataChannel",{
					enumerable:true,
					configurable:false,
					value:function(){console.warn("[TracePage]->Protected[RTCDataChannel]");}
				});
			}
			if (opts.wrtcRtpReceiver.enabled === true){
				Object.defineProperty(window, "RTCRtpReceiver",{
					enumerable:true,
					configurable:false,
					value:function(){console.warn("[TracePage]->Protected[RTCRtpReceiver]");}
				});
			}
		},"'" + JSON.stringify(opts) + "'");

		if (TracePage.debug) console.info("[TracePage]->[UA] Disabled User Agent Tracking.");
	},
	protectScreenRes:function(){
		TracePage.codeInject(function(){
			function disableFunction(frame){
				if (frame === null) return;

				function defProp(name,val){
					Object.defineProperty(frame.screen,name,{
						enumerable:true,
						configurable:false,
						value:window.screen[name] + val
					});
				}

				if (frame.traceDefined === true) return;
				// Loop through different resolution settings adding a small random offset
				var screenVars = ["availHeight","availLeft","availTop","availWidth","height","width"];
				for (screenVar in screenVars){
					defProp(
						screenVars[screenVar],
						(Math.floor(Math.random()*10)-10)
					);
				}

				// Change pixel depths
				var depthOffsets = [-6,6,12,24];
				defProp("colorDepth",depthOffsets[Math.floor(Math.random()*depthOffsets.length)]);
				defProp("pixelDepth",depthOffsets[Math.floor(Math.random()*depthOffsets.length)]);

				frame.traceDefined = true;
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

		if (TracePage.debug) console.info("[TracePage]->[SC] Disabled Screen Resolution Tracking.");
	},
	protectUserAgent:function(resp){
		var ua = resp.r;

		TracePage.codeInject(function(useragent){
			Object.defineProperty(navigator, "userAgent",{
				enumerable:true,
				configurable:false,
				value:useragent
			});
		},"'" + ua + "'");

		TracePage.codeInject(function(){
			Object.defineProperty(navigator,"vendor",{
				enumerable:true,
				configurable:false,
				value:""
			});
		});

		if (TracePage.debug) console.info("[TracePage]->[UA] Disabled User Agent Tracking.");
	},
	protectCanvasFinger:function(){
		var canvasArray = false;

		if (TracePage.currentPrefs.BlockCanvasFinger.customRGBA.enabled === true){
			canvasArray = TracePage.currentPrefs.BlockCanvasFinger.customRGBA.rgba;
		}

		TracePage.codeInject(function(t){
			function TraceCanvas(r,g,b,a,scriptId){
				var injectedEl = document.getElementById(scriptId);

				var TCInject = function(el){
					if (el.tagName.toUpperCase() === "IFRAME" && el.contentWindow) {
						try {
							var tryFrame = el.contentWindow.HTMLCanvasElement;
						} catch (e) {
							console.warn("[TracePage]->[CF] iFrame Error: " + e);
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

			if (t !== "object"){
				var rn = function(a,b){
					return (10-Math.floor(Math.random()*(b-a)+a));
				};

				t = [
					rn(0,20),
					rn(0,20),
					rn(0,20),
					rn(0,20)
				];
			}

			var docId = makeRandomStr();
			var script = document.createElement('script');
			script.id = makeRandomStr();
			script.type = "text/javascript";

			var newChild = document.createTextNode('try{(' + TraceCanvas + ')(' + t[0] + ',' + t[1] + ',' + t[2] + ',' + t[3] + ',"' + script.id + '");}catch (e){console.error(e);}');
			script.appendChild(newChild);

			var node = (document.documentElement || document.head || document.body);
			if (typeof node[docId] === 'undefined') {
				node.insertBefore(script,node.firstChild);
				node[docId] = makeRandomStr();
			}
		},canvasArray);

		if (TracePage.DEBUG) console.info("[TracePage]->[CF] Disabled Canvas Tracking.");
	}
};
TracePage.init();