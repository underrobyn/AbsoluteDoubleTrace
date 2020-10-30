/*
 * 	Trace page helper script for before documents load
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

var TPage = {
	Settings:{
		prefix:"tp_",
		Prefs:{},
		Additional:{},
		Whitelist:{},
		Exec:{},
		RunProtections:[
			"Pref_AudioFingerprint",
			"Pref_BatteryApi",
			"Pref_CanvasFingerprint",
			// "Pref_CommonTracking",
			"Pref_ClientRects",
			// "Pref_FontFingerprint",
			"Pref_HardwareSpoof",
			"Pref_NativeFunctions",
			"Pref_NetworkInformation",
			"Pref_PingBlock",
			"Pref_PluginHide",
			"Pref_ReferHeader",
			"Pref_ScreenRes",
			"Pref_UserAgent",
			"Pref_WebGLFingerprint",
			"Pref_WebRTC"
		]
	},

	css:"font-size:1em;line-height:1.4em;color:#fff;background-color:#1a1a1a;border:.1em solid #00af00;",

	startTracePage:function(){
		let pageUrl = window.location.href || document.location.href;
		try {
			pageUrl = window.top.location.href;
		} catch(e) {  }

		// https://bugs.chromium.org/p/chromium/issues/detail?id=54257
		chrome.runtime.sendMessage({
			msg:"tracepage",
			url:pageUrl
		},TPage.init);

		// Listen for protection notifications
		TPage.assignMessageListener();
	},

	assignMessageListener:function() {
		window.addEventListener("message", function (e) {
			if (!e || !e.data || !e.type) return;
			if (typeof e.data !== "string") return;
			if (e.data.indexOf("trace-protection::") === -1) return;

			let parts = e.data.split("::");
			if (parts.length !== 4) return;

			chrome.runtime.sendMessage({
				msg:"protectionRan",
				url: document.location.href,
				update:parts[1],
				protection:parts[2],
				part:parts[3]
			});
		}, false);
	},

	// Call with data loaded from background page
	init:function(data){
		if (data.tracePaused === true){
			console.log("%c Trace Paused.",TPage.css);
			return;
		}

		TPage.Settings.Additional = data.additional;
		TPage.Settings.Prefs = data.prefs;
		TPage.Settings.Whitelist = data.data;

		TPage.runProtections();
	},

	page: {
		createProtId: function () {
			let n = "",
				t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
			for (let a = 0; 11 > a; a++) {
				n += t.charAt(Math.floor(Math.random() * t.length));
			}
			return TPage.Settings.prefix + n;
		},

		runCodeInFrames:function(protId){
			return `

			//console.log(window);
			//console.log(self);
			self['` + protId + `_func'](window);
			//self['` + protId + `_func'](self);

			["HTMLIFrameElement","HTMLFrameElement"].forEach(function(el) {
				var wind = self[el].prototype.__lookupGetter__('contentWindow'),
					cont = self[el].prototype.__lookupGetter__('contentDocument');

				Object.defineProperties(self[el].prototype,{
					contentWindow:{
						get:function(){
							if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return wind.apply(this);

							let frame = wind.apply(this);
							if (frame) self['` + protId + `_func'](frame);

							return frame;
						}
					},
					contentDocument:{
						get:function(){
							if (this.src && this.src.indexOf('//') !== -1 && location.host !== this.src.split('/')[2]) return cont.apply(this);

							let frame = cont.apply(this);
							if (frame) self['` + protId + `_func'](frame);

							return frame;
						}
					}
				});
			});`;
		},

		createWrapper:function(protCode, protParams, protName, protId){
			let protFunction = `self['` + protId + `_func'] = function(frame){
				if (frame === null) {
					console.error("Frame is null");
					return;
				}

				if (!frame['` + protId + `_done']) {
					(` + protCode + `)(frame,` + protParams + `);
				} else {
					frame['` + protId + `_done'] = true;
					//console.log(frame);
				}
			};`;

			let protRun = TPage.page.runCodeInFrames(protId);

			return protFunction + protRun;
		},

		createScript:function(injectCode){
			let el = document.createElement("script");

			el.type = "text/javascript";
			el.textContent = injectCode;

			return el;
		},

		runInjection:function(protCode, protParams, protName){
			let node = (document.documentElement || document.head || document.body);
			let protId = TPage.page.createProtId();
			let injectCode = TPage.page.createWrapper(protCode, protParams, protName, protId);

			try {
				node.insertBefore(
					TPage.page.createScript(injectCode),
					node.firstChild
				);
				TPage.Settings.Exec[protName] = true;
			} catch (e) {
				console.warn(e);
				try {
					node.appendChild(
						TPage.page.createScript(injectCode)
					);
					TPage.Settings.Exec[protName] = true;
				} catch(ae) {
					console.warn(ae);
				}
			}
		}
	},

	runProtections:function(){
		// TPage.Settings.Prefs["Pref_FontFingerprint"] = {"enabled":true};
		let protectionKeys = Object.keys(TPage.Settings.Prefs);

		console.group("Trace Protections");
		for (let i = 0; i<protectionKeys.length; i++){
			let protection = protectionKeys[i];

			// Check if the protection is one of the allowed
			if (TPage.Settings.RunProtections.indexOf(protection) === -1){
				continue;
			}

			let host = window.location.hostname || "Unknown Host";

			// Check if setting is allowed to run from whitelist
			if (TPage.Settings.Whitelist[protection] === false){
				console.warn(protection + " cannot execute due to whitelist rule on: " + host);
				continue;
			}

			// Check setting is enabled in preferences
			if (!TPage.Settings.Prefs[protection]["enabled"]){
				console.log("%c Protection is not enabled: " + protection,"font-size:1em;line-height:1.5em;color:amber;");
				continue;
			}

			// Check if the protection has already run
			if (TPage.Settings.Exec[protection]){
				console.error("Protection has already ran: " + protection);
				continue;
			}

			// Check if the protection has code to run
			if (!TPage.protectionFunctions[protection]) continue;

			// Check if we need to add any settings from background page
			let tempParams = TPage.Settings.Prefs[protection];
			if (TPage.Settings.Additional[protection]){
				tempParams = Object.assign(tempParams, TPage.Settings.Additional[protection]);
			}
			let params = JSON.stringify(tempParams);

			// Run protection code
			let protFunc = TPage.protectionFunctions[protection];
			console.log("%c" + protection + " has run on: " + host,"font-size:1em;line-height:1.5em;color:green;");

			TPage.page.runInjection(protFunc, params, protection);
		}
		console.groupEnd();
	},

	protectionFunctions:{
		"Pref_AudioFingerprint":function(frame, settings) {
			settings["offset"] = Math.random() * 1e-5;

			// TODO: Recode this entire section
			var audioSpoof = {
				currChannelData:null,

				channelData:function(obj, name, consistency){
					var func = obj[name];

					Object.defineProperty(obj, name, {
						"value":function(){
							var result = func.apply(this, arguments);

							if (audioSpoof.currChannelData !== result) {
								audioSpoof.currChannelData = result;

								// result.length usually = 44100
								for (let i = 0;i < result.length;i += consistency) {
									let index = Math.floor(i);
									result[index] = result[index] + settings["offset"];
								}
							}
							return result;
						}
					});
				}
			};

			if (frame.AudioBuffer){
				let frequencyAnalyser = function(obj,name){
					var func = obj[name];

					Object.defineProperty(obj, name, {
						"value":function(){
							var result = func.apply(this, arguments);

							// result.length usually = 44100
							for (let i = 0;i < arguments[0].length;i++) {
								let index = Math.floor(i);
								arguments[0][index] = arguments[0][index] + settings["offset"];
							}

							return func.apply(this, arguments);
						}
					});
				};

				if (settings["audioBuffer"]["enabled"] === true) {
					frequencyAnalyser(frame.AudioBuffer.prototype,"copyFromChannel");
				}
				if (settings["audioData"]["enabled"] === true) {
					frequencyAnalyser(frame.AudioBuffer.prototype,"copyFromChannel");
				}
			}

			// Modify an AudioCtx function's argument[0]
			let frequencyData = function(obj, name, frequencyFunction, consistency){
				var func = obj[name];

				Object.defineProperty(obj, name, {
					"value":function(){
						var result = func.apply(this, arguments);

						var frequencyData = result.__proto__[frequencyFunction];
						Object.defineProperty(result.__proto__, frequencyFunction, {
							"value":function(){
								var frequencyResult = frequencyData.apply(this, arguments);

								for (let i = 0;i < arguments[0].length;i += consistency) {
									let index = Math.floor(i);
									arguments[0][index] = arguments[0][index] + settings["offset"];
								}
								return frequencyResult;
							}
						});
						return result;
					}
				});
			};

			let modifyApi = [];
			if (settings["audioOfflineMain"]["enabled"] === true) modifyApi.push("webkitAudioContext", "AudioContext");
			if (settings["audioMain"]["enabled"] === true) modifyApi.push("webkitOfflineAudioContext", "OfflineAudioContext");

			modifyApi.forEach(function(ctx){
				if (!frame[ctx]) return;

				frequencyData(frame[ctx].prototype.__proto__,"createAnalyser","getFloatFrequencyData",100);
				frequencyData(frame[ctx].prototype.__proto__,"createAnalyser","getFloatTimeDomainData",100);
			});
		},
		"Pref_BatteryApi":function(frame, settings) {
			if (!frame.navigator){
				return;
			}

			// Random 2 dp value
			settings["level"] = Math.floor(Math.random()*100)/100;

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			// To test: navigator.getBattery().then(a=>console.log(a));

			let BatteryPromise = new Promise(function(resolve, reject){
				let BatteryManager = function(){
					this.charging = true;
					this.chargingTime = Infinity;
					this.dischargingTime = Infinity;
					this.level = settings["level"];

					this.onchargingchange = null;
					this.onchargingtimechange = null;
					this.ondischargingtimechange = null;
					this.onlevelchange = null;

					//window.top.postMessage("trace-protection::ran::battery::main", '*');
				};

				resolve(new BatteryManager())
			});

			doUpdateProp(frame.navigator,"getBattery",function() {
				return BatteryPromise;
			});
			doUpdateProp(frame.navigator.getBattery,"toString","function getBattery() { [native code] }");
		},
		"Pref_CanvasFingerprint":function(frame, settings) {
			if (!frame.HTMLCanvasElement){
				//frame = window;
				return;
			}
			//if (!frame.HTMLCanvasElement) return;

			let rgba = [0,0,0,0];
			if (settings["customRGBA"]["enabled"]){
				rgba = settings["customRGBA"]["rgba"];
			} else {
				let rn = function(min,max){
					return Math.floor(Math.random()*(max-min)+min);
				};
				rgba = [rn(0, 3), rn(0, 3), rn(0, 3), rn(0, 2)];
			}


			var injectIframes = function(el){
				let injectionFrames = ["iframe", "frame"];
				if (injectionFrames.indexOf(el.tagName.toLowerCase()) === -1 || !el.contentWindow) return;

				if (el.contentWindow.HTMLCanvasElement) spoofExtract(el.contentWindow.HTMLCanvasElement);
				if (el.contentWindow.CanvasRenderingContext2D) spoofRender(el.contentWindow.CanvasRenderingContext2D);
				if (el.contentWindow.Document) watchDocFunctions(el.contentWindow.Document);
			};

			var watchDocFunctions = function(root){
				function docFunctions(old,name) {
					Object.defineProperty(root.prototype,name,{
						value: function() {
							let el = old.apply(this, arguments);
							if (el === null) return null;

							if (Object.prototype.toString.call(el) === '[object HTMLCollection]' ||
								Object.prototype.toString.call(el) === '[object NodeList]') {
								for (let i = 0; i < el.length; ++i) {
									let elx = el[i];
									injectIframes(elx);
								}
							} else {
								injectIframes(el);
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

			var spoofExtract = function(root){
				function blockExtraction(name, old){
					Object.defineProperty(root.prototype,name,{
						value:function(){
							if (this === null) return old.apply(this,arguments);

							let width = this.width;
							let height = this.height;
							let context = this.getContext("2d");

							if (context === null) return old.apply(this,arguments);

							let iData = context.getImageData(0, 0, width, height);
							for (let i = 0; i < height; i++) {
								for (let j = 0; j < width; j++) {
									let index = ((i * (width * 4)) + (j * 4));
									iData.data[index] 		= iData.data[index] + rgba[0];
									iData.data[index + 1] 	= iData.data[index + 1] + rgba[1];
									iData.data[index + 2] 	= iData.data[index + 2] + rgba[2];
									iData.data[index + 3] 	= iData.data[index + 3] + rgba[3];
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
			var spoofRender = function(root){
				let getImageData = root.prototype.getImageData;
				Object.defineProperty(root.prototype,"getImageData",{
					value:function(){
						let iData = getImageData.apply(this, arguments);
						let height = iData.height;
						let width = iData.width;
						for (let i = 0; i < height; i++) {
							for (let j = 0; j < width; j++) {
								let index = ((i * (width * 4)) + (j * 4));
								iData.data[index] 		= iData.data[index] + rgba[0];
								iData.data[index + 1] 	= iData.data[index + 1] + rgba[1];
								iData.data[index + 2] 	= iData.data[index + 2] + rgba[2];
								iData.data[index + 3] 	= iData.data[index + 3] + rgba[3];
							}
						}
						return iData;
					}
				});
			};

			spoofExtract(frame.HTMLCanvasElement);
			spoofRender(frame.CanvasRenderingContext2D);
			watchDocFunctions(frame.Document);
		},
		"Pref_ClientRects":function(frame, settings){
			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			// Generate offset
			let off = Math.floor(Math.random()*100)/100;

			function updatedRect(old,round,overwrite){
				function genOffset(round,val){
					return val + (round ? Math.round(off) : off);
				}

				let temp = overwrite === true ? old : new DOMRect();

				temp.top 	= genOffset(round,old.top);
				temp.right	= genOffset(round,old.right);
				temp.bottom = genOffset(round,old.bottom);
				temp.left 	= genOffset(round,old.left);
				temp.width 	= genOffset(round,old.width);
				temp.height = genOffset(round,old.height);
				temp.x 		= genOffset(round,old.x);
				temp.y 		= genOffset(round,old.y);

				return temp;
			}

			function getClientRectsProtection(el){
				if (window.location.host === "docs.google.com") return;

				let clientRects = frame[el].prototype.getClientRects;
				doUpdateProp(frame[el].prototype,"getClientRects",function(){
					let rects = clientRects.apply(this,arguments);
					let krect = Object.keys(rects);

					let DOMRectList = function(){};
					let list = new DOMRectList();
					list.length = krect.length;
					for (let i = 0;i<list.length;i++){
						if (krect[i] === "length") continue;
						list[i] = updatedRect(rects[krect[i]],false,false);
					}

					//window.top.postMessage("trace-protection::ran::clientrects::" + el + "get", '*');
					return list;
				});
				doUpdateProp(frame[el].prototype.getClientRects, "toString",function(){
					//window.top.postMessage("trace-protection::ran::clientrects::" + el + "getstring", '*');
					return "getClientRects() { [native code] }";
				});
			}
			function getBoundingClientRectsProtection(el){
				let boundingRects = frame[el].prototype.getBoundingClientRect;
				doUpdateProp(frame[el].prototype,"getBoundingClientRect",function(){
					let rect = boundingRects.apply(this,arguments);
					if (this === undefined || this === null) return rect;

					//window.top.postMessage("trace-protection::ran::clientrectsbounding::" + el + "get", '*');

					return updatedRect(rect,true,true);
				});
				doUpdateProp(frame[el].prototype.getBoundingClientRect, "toString",function(){
					//window.top.postMessage("trace-protection::ran::clientrectsbounding::" + el + "getstring", '*');
					return "getBoundingClientRect() { [native code] }";
				});
			}

			["Element","Range"].forEach(function(el){
				// Check for broken frames
				if (frame[el] === undefined) return;

				// getClientRects
				if (settings[el.toLowerCase()]["getclientrects"]["enabled"]) getClientRectsProtection(el);

				// getBoundingClientRect
				if (settings[el.toLowerCase()]["getboundingclientrects"]["enabled"]) getBoundingClientRectsProtection(el);
			});
		},
		"Pref_CommonTracking":function(frame, settings){
			frame.traceTrackBlock = function(data){
				console.log("Trace blocked tracking attempt, data:");
				console.log(data);
			};

			function getNewProps(v){
				return {
					writable:true,
					configurable:true,
					value:v
				};
			}

			// Block Google Analytics
			if (settings["settings"]["google"]["enabled"]){
				Object.defineProperties(frame,{
					_gaq:getNewProps(false),
					ga:getNewProps({}),
					GoogleAnalyticsObject:getNewProps(false)
				});
			}

			// Block Piwik
			if (settings["settings"]["piwik"]["enabled"]){
				Object.defineProperties(frame,{
					_paq:getNewProps({
						push:frame.traceTrackBlock
					}),
					Matomo:getNewProps({
						initialized:true,
						addPlugin:frame.traceTrackBlock,
						getAsyncTrackers:function(){return [];},
						trigger:function(){}
					}),
					Piwik:getNewProps({
						initialized:true,
						addPlugin:frame.traceTrackBlock,
						getAsyncTrackers:function(){return [];},
						trigger:function(){}
					})
				});
			}

			// Block Segment
			if (settings["settings"]["segment"]["enabled"]){
				Object.defineProperties(frame,{
					analytics:getNewProps({
						load:frame.traceTrackBlock,
						page:frame.traceTrackBlock,
						push:frame.traceTrackBlock,
						track:frame.traceTrackBlock,
						methods:[],
						initialize:true,
						invoked:true,
						factory:function(){}
					})
				});
			}

			// Block Countly
			if (settings["settings"]["countly"]["enabled"]){
				Object.defineProperties(frame,{
					Countly:getNewProps({
						q:{
							push:frame.traceTrackBlock
						},
						log_error:frame.traceTrackBlock,
						url:"",
						app_key:"",
						debug:false,
						device_id:Math.random().toString(),
						ignore_visitor:true,
						require_consent:false
					})
				});
			}

			// Block Fbevents
			if (settings["settings"]["fbevents"]["enabled"]){
				Object.defineProperties(frame,{
					fbq:getNewProps(function(){})
				});
			}
		},
		"Pref_FontFingerprint":function(frame, settings){
			settings = {
				appendChild:true,
				elementOffset:true,
				measureText:true
			};
			let offset = Math.random();
			let fontKeywords = ["serif", "sans-serif", "monospace", "fantasy", "cursive", "courier", "system-ui"];
			let cssKeywords = ["inherit", "auto"];

			let randArr = function(arr){
				return arr[Math.floor(Math.random() * arr.length)];
			};

			function doUpdateProp(obj, prop, updProp, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) return;

				props[updProp] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			if (settings["measureText"] && frame.CanvasRenderingContext2D){
				let measText = frame.CanvasRenderingContext2D.prototype.measureText;

				// TODO: Access Canvas font property and remove certain fonts, recalc measureText
				doUpdateProp(frame.CanvasRenderingContext2D.prototype, "measureText","value",function(){
					let result = measText.apply(this,arguments);
					let origFont = this.font || "";
					console.log(this.font);
					//console.log(result);
					//this.font = "72px sans-serif";
					//console.log(measText.apply(this,arguments));

					let TextMetrics = function(){
						this.__proto__ = frame.TextMetrics;
					};
					let fakeResult = new TextMetrics();
					for (let b in result){
						fakeResult[b] = result[b];
					}
					fakeResult.width = result.width + offset;

					return fakeResult;
				});
			}

			if (settings["elementOffset"] && frame.Element){
				[["offsetHeight", "height"], ["offsetWidth", "width"]].forEach(function(meas){
					console.log(meas, offset);
					doUpdateProp(HTMLElement.prototype, meas[0], "get", function(){
						//console.log(this.getBoundingClientRect().width, this.getBoundingClientRect().height);
						return (this.getBoundingClientRect()[meas[1]] || 0) + Math.floor(offset*100)/10;
					});
				});
			}

			if (settings["appendChild"] && frame.Node){
				let checkFonts = function(fontStr){
					let fonts = fontStr.split(",");
					console.log(fonts);
					if (fonts.length > 1){
						return randArr(fonts);
					}
					return fonts;
				};

				let originalCssFunc = frame.CSSStyleDeclaration.prototype.setProperty;
				let modifyCssFonts = function(){
					if(arguments[0].toLowerCase() !== 'font-family') return originalCssFunc.apply(this, arguments);

					let currentFont = checkFonts(this.fontFamily);

					return originalCssFunc.call(this, 'font-family', currentFont);
				};

				// A recursive function to help us modify elements
				let modifyChildren = function(el){
					if (!el) return;

					// If element has font-family set, change it
					if (el.style && el.style.fontFamily) modifyCssFonts.call(el.style, 'font-family', el.style.fontFamily);

					// If an element has children, check them for font-family
					if (el.childNodes) el.childNodes.forEach(modifyChildren);

					return el;
				};

				let originalAppendChild = frame.Node.prototype.appendChild;
				doUpdateProp(frame.Node.prototype, 'appendChild', 'value', function(){
					modifyChildren(arguments[0]);
					return originalAppendChild.apply(this, arguments);
				});
			}
		},
		"Pref_HardwareSpoof":function(frame, settings){
			if (!frame.navigator){
				return;
			}

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) return;

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			["hardwareConcurrency", "deviceMemory"].forEach(function(hw){
				if (!settings["hardware"][hw]["enabled"]) return;

				let newValue = settings["hardware"][hw]["value"] || 4;

				doUpdateProp(frame.navigator, hw, newValue);
			});

			if (settings["hardware"]["hwVrDisplays"]["enabled"]) {
				doUpdateProp(frame.navigator, "getVRDisplays", undefined);
				doUpdateProp(frame.navigator, "activeVRDisplays", undefined);
			}

			if (settings["hardware"]["hwGamepads"]["enabled"]){
				doUpdateProp(frame.navigator, "getGamepads", undefined);
			}
		},
		"Pref_NativeFunctions":function(frame, settings){
			if (!settings["windowOpen"]["enabled"]) return;
			if (!frame.window) return;
			if (!frame.window.open) return;

			//frame["opener"] = null;
			var windowOpen = frame.window.open;

			Object.defineProperty(frame.window,"open",{
				value:function(){
					let newArgs = arguments;
					newArgs[1] = "";

					return windowOpen.apply(this,newArgs);
				}
			});
		},
		"Pref_NetworkInformation":function(frame, settings){
			if (!frame.navigator || !frame.NetworkInformation){
				return;
			}

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}
			var rand = function(max){
				return Math.floor(Math.random()*max);
			};
			var randArr = function(arr){
				return arr[Math.floor(Math.random() * arr.length)];
			};

			let NetworkInformation = function(){
				this.downlink = rand(10);
				this.downlinkMax = Infinity;
				this.effectiveType = "4g"; // randArr(["4g","3g","2g"]);
				this.rtt = randArr([50,75,100,125,150]);
				this.saveData = false;
				this.type = randArr(["wifi","ethernet","other"]);

				this.onchange = null;
				this.ontypechange = null;

				this.__proto__ = frame.NetworkInformation;
			};
			let fakeNet = new NetworkInformation();

			fakeNet.addEventListener = function(){};

			doUpdateProp(frame.navigator,"connection", fakeNet);
		},
		"Pref_PingBlock":function(frame, settings) {
			if (!settings["sendBeacon"]["enabled"]) return;
			if (!frame.navigator || !frame.navigator.sendBeacon){
				return;
			}

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			doUpdateProp(frame.navigator,"sendBeacon",function() {
				//window.top.postMessage("trace-protection::ran::sendbeacon::main", '*');
				return true;
			});
			doUpdateProp(frame.navigator.sendBeacon,"toString","function sendBeacon() { [native code] }");
		},
		"Pref_PluginHide":function(frame, settings) {
			if (!frame.navigator){
				return;
			}

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			let PluginArray = function(){
				this.__proto__ = frame.PluginArray;
				this.length = 0;
				this.refresh = function(){
					console.log("%c [Tr]->Blocked[PR] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
				};
				this.item = function(i){
					console.log("%c [Tr]->Blocked[PI] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
					return {};
				};
			};

			doUpdateProp(frame.navigator, "plugins", new PluginArray());
			doUpdateProp(frame.navigator.plugins,"toString",function(){
				return "[object PluginArray]";
			});
		},
		"Pref_ReferHeader":function(frame, settings){
			if (!settings["jsVariable"]["enabled"]) return;
			if (!frame.document){
				return;
			}

			Object.defineProperty(frame.document,"referrer",{
				enumerable:true,
				configurable:false,
				value:""
			});
		},
		"Pref_ScreenRes":function(frame, settings){
			if (!frame.screen){
				return;
			}

			let rand = function(max){
				return Math.floor(Math.random()*max);
			};
			let randArr = function(arr){
				return arr[Math.floor(Math.random() * arr.length)];
			};

			function updateObject(object, name, val, offset){
				//console.log(name, val, offset);
				if (offset) val = object[name] + val;
				let currProps = Object.getOwnPropertyDescriptor(object, name) || {configurable:true};

				if (!currProps["configurable"]) {
					return;
				}

				Object.defineProperty(object,name,{
					enumerable:true,
					value:val
				});
			}

			// Loop through different resolution settings adding a small random offset
			if (settings["randomOpts"]["enabled"] === true){
				let screenVars = ["availHeight","availLeft","availTop","availWidth","height","width"];
				let range = parseInt(settings["randomOpts"]["values"][0]) + parseInt(settings["randomOpts"]["values"][1]);
				for (let screenVar in screenVars){
					updateObject(frame.screen, screenVars[screenVar], rand(range), true);
				}

				// Spoof window properties
				if (frame.innerHeight) 	updateObject(frame, "innerHeight",rand(range),true);
				if (frame.innerWidth) 	updateObject(frame, "innerWidth",rand(range),true);
				if (frame.outerHeight) 	updateObject(frame, "outerHeight",rand(range),true);
				if (frame.outerWidth) 	updateObject(frame, "outerWidth",rand(range),true);
				return;
			}

			let resolution = randArr(settings["commonResolutions"]["resolutions"]);

			if (settings["commonResolutions"]["enabled"] === true){
				updateObject(frame.screen, "availHeight",resolution[1],false);
				updateObject(frame.screen, "availWidth",resolution[0],false);
				updateObject(frame.screen, "height",resolution[1],false);
				updateObject(frame.screen, "width",resolution[0],false);

				// Change pixel depths
				if (settings["modifyDepths"]["enabled"] === true) {
					updateObject(frame.screen, "colorDepth", resolution[2], false);
					updateObject(frame.screen, "pixelDepth", resolution[2], false);
				}

				// Spoof window properties
				if (frame.innerHeight) 	updateObject(frame, "innerHeight",resolution[1] + rand(99,100),false);
				if (frame.innerWidth) 	updateObject(frame, "innerWidth",resolution[0],false);
				if (frame.outerHeight) 	updateObject(frame, "outerHeight",resolution[1] + 40,false);
				if (frame.outerWidth) 	updateObject(frame, "outerWidth",resolution[0],false);
			}

			if (settings["modifyPixelRatio"]["enabled"] === true){
				frame.devicePixelRatio = rand(3) + 1;
			}

			if (frame.screen.mozOrientation) updateObject(frame.screen, "mozOrientation",undefined, false);

		},
		"Pref_UserAgent":function(frame, settings){
			if (!frame.navigator){
				return;
			}

			function updateObject(object, name, val){
				let currProps = Object.getOwnPropertyDescriptor(object, name) || {configurable:true};
				if (!currProps["configurable"]) return;

				currProps["value"] = val;

				Object.defineProperty(object,name,currProps);
			}

			updateObject(frame.navigator, "buildID", undefined);
			updateObject(frame.navigator, "getUserAgent", undefined);
			updateObject(frame.navigator, "vendor", "");
			updateObject(frame.navigator, "product", "Gecko");

			if (settings.ua){
				let appVer = settings.ua.substring(8);

				updateObject(frame.navigator, "appVersion",  appVer || "");
				updateObject(frame.navigator, "userAgent", settings.ua || "");
			}

			updateObject(frame.navigator, "oscpu", settings.os || "");
			updateObject(frame.navigator, "platform", settings.plat || "");
		},
		"Pref_WebGLFingerprint":function(frame, settings) {
			var rand = function(min,max){
				return Math.floor(Math.random() * (max - min) + min);
			};
			var randArr = function(arr){
				return arr[Math.floor(Math.random() * arr.length)];
			};

			if (rand(1,3) === 2){
				settings["ctx_vendor"] = "Mozilla";
				settings["ctx_gpu"] = "Mozilla";
			}

			settings["offset"] = Math.random();

			function safeOverwrite(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop);
				props["value"] = newVal;

				return props;
			}

			let changeMap = {};

			if (settings["parameters"]["enabled"]){
				let paramChanges = {
					3379:Math.pow(2,settings["parameters"]["list"]["MAX_TEXTURE_SIZE"] || 14),
					3386:Math.pow(2,settings["parameters"]["list"]["MAX_VIEWPORT_DIMS"] || 14),
					3410:Math.pow(2,settings["parameters"]["list"]["RED_BITS"] || 3),
					3411:Math.pow(2,settings["parameters"]["list"]["GREEN_BITS"] || 3),
					3412:Math.pow(2,settings["parameters"]["list"]["BLUE_BITS"] || 3),
					3413:Math.pow(2,settings["parameters"]["list"]["ALPHA_BITS"] || 3),
					3414:24,
					3415:Math.pow(2,settings["parameters"]["list"]["STENCIL_BITS"] || 3),
					6408:rand(6400,6420),
					34024:Math.pow(2,settings["parameters"]["list"]["MAX_RENDERBUFFER_SIZE"] || 14),
					30476:Math.pow(2,settings["parameters"]["list"]["MAX_CUBE_MAP_TEXTURE_SIZE"] || 14),
					34921:Math.pow(2,settings["parameters"]["list"]["MAX_VERTEX_ATTRIBS"] || 4),
					34930:Math.pow(2,settings["parameters"]["list"]["MAX_TEXTURE_IMAGE_UNITS"] || 4),
					35660:Math.pow(2,settings["parameters"]["list"]["MAX_VERTEX_TEXTURE_IMAGE_UNITS"] || 4),
					35661:randArr([128, 192, 256]),
					36347:Math.pow(2,settings["parameters"]["list"]["MAX_VERTEX_UNIFORM_VECTORS"] || 12),
					36349:Math.pow(2,rand(9,12)),

					7936:settings["ctx_vendor"] || "WebKit",
					7937:settings["ctx_gpu"] || "WebKit WebGL",
					37445:settings["debug_vendor"] || "Google Inc."
				};
				changeMap = Object.assign(changeMap, paramChanges);
			}

			// Check that GPU is defined
			if (settings["gpuList"]["enabled"]){
				changeMap[37446] = settings["gpuChose"] ? settings["gpuChose"] : ("ANGLE (" + randArr(settings["gpuList"]["list"]) + ")");
			}

			["WebGLRenderingContext", "WebGL2RenderingContext"].forEach(function(ctx){
				if (!frame[ctx]) return;

				// Modify getParameter
				let oldParam = frame[ctx].prototype.getParameter;
				Object.defineProperty(frame[ctx].prototype, "getParameter",
					safeOverwrite(frame[ctx].prototype, "getParameter",function(param){
						if (changeMap[param]) return changeMap[param];
						return oldParam.apply(this,arguments);
					})
				);

				// Modify bufferData (this updates the image hash)
				let oldBuffer = frame[ctx].prototype.bufferData;
				Object.defineProperty(frame[ctx].prototype, "bufferData",
					safeOverwrite(frame[ctx].prototype, "bufferData",function(){
						for (let i = 0;i<arguments[1].length;i++){
							arguments[1][i] += settings["offset"] * 1e-3;
						}
						return oldBuffer.apply(this,arguments);
					})
				);
			});
		},
		"Pref_WebRTC":function(frame, settings){
			if (!frame.navigator) return;

			function doUpdateProp(obj, prop, newVal){
				let props = Object.getOwnPropertyDescriptor(obj, prop) || {configurable:true};

				if (!props["configurable"]) {
					//console.warn("Issue with property not being able to be configured.");
					return;
				}

				props["value"] = newVal;
				Object.defineProperty(obj, prop, props);

				return props;
			}

			if (settings["deviceEnumeration"]["enabled"]){
				doUpdateProp(frame.navigator, "webkitGetUserMedia", undefined);

				if (frame.navigator.mediaDevices){
					doUpdateProp(frame.navigator.mediaDevices, "enumerateDevices", undefined);
				}

				if (frame.MediaStreamTrack){
					doUpdateProp(frame.MediaStreamTrack, "getSources", undefined);
					doUpdateProp(frame.MediaStreamTrack, "getMediaDevices", undefined);
				}
			}

			if (settings["wrtcPeerConnection"]["enabled"] === true && frame.RTCPeerConnection){
				doUpdateProp(frame, "RTCPeerConnection", function(){
					//window.top.postMessage("trace-protection::ran::webrtcpeerconnection::main", '*');
					console.log("%c [Tr]->Protected[RTCPeerConnection] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
				});
				doUpdateProp(frame, "webkitRTCPeerConnection", function(){
					//window.top.postMessage("trace-protection::ran::webrtcpeerconnection::main", '*');
					console.log("%c [Tr]->Protected[RTCPeerConnection] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
				});
			}

			if (settings["wrtcDataChannel"]["enabled"] === true && frame.RTCDataChannel){
				doUpdateProp(frame, "RTCDataChannel", function(){
					//window.top.postMessage("trace-protection::ran::webrtcdataconnection::main", '*');
					console.log("%c [Tr]->Protected[RTCDataChannel] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
				});
			}

			if (settings["wrtcRtpReceiver"]["enabled"] === true && frame.RTCRtpReceiver){
				doUpdateProp(frame, "RTCRtpReceiver", function(){
					//window.top.postMessage("trace-protection::ran::webrtcrtpreceiver::main", '*');
					console.log("%c [Tr]->Protected[RTCRtpReceiver] ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");
				});
			}
		}
	},

	/*
	protectAudioFinger:function(){
		var opts = {
			audioBuffer:{enabled:TPage.Prefs.BlockAudioFinger.audioBuffer.enabled},
			audioData:{enabled:TPage.Prefs.BlockAudioFinger.audioData.enabled},
			audioOfflineMain:{enabled:TPage.Prefs.BlockAudioFinger.audioOfflineMain.enabled},
			audioMain:{enabled:TPage.Prefs.BlockAudioFinger.audioMain.enabled}
		};

		// If nothing is enabled just don't run the protection
		if (opts["audioBuffer"]["enabled"] !== true && opts["audioData"]["enabled"] !== true && opts["audioMain"]["enabled"] !== true){
			return;
		}

		TPage.codeNewPreInject(
			function(opts){
				return opts;
			},
			function(frame,opts){
				var opts = JSON.parse(opts);

				// Get those Objects
				var ab = frame.AudioBuffer;
				var an = frame.AnalyserNode;
				var ae = frame;

				if (opts["audioBuffer"]["enabled"] === true) {
					ab.prototype.copyFromChannel = function(){console.log("%c [Tr]Blocked [AF][CF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");return false;};
					ab.prototype.getChannelData = function(){console.log("%c [Tr]Blocked [AF][CD] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;");return false;};
				}
				if (opts["audioData"]["enabled"] === true){
					an.prototype.getFloatFrequencyData = function(){console.log("%c [Tr]Blocked [AF][FF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getByteFrequencyData = function(){console.log("%c [Tr]Blocked [AF][BF] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getFloatTimeDomainData = function(){console.log("%c [Tr]Blocked [AF][TD] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
					an.prototype.getByteTimeDomainData = function(){console.log("%c [Tr]Blocked [AF][BT] Audio Tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return false;};
				}
				if (opts["audioOfflineMain"]["enabled"] === true){
					ae.OfflineAudioContext = function(){console.log("%c [Tr]Blocked [AF][AO] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return {};};
					ae.webkitOfflineAudioContext = function(){console.log("%c [Tr]Blocked [AF][WO] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return {};};
				}
				if (opts["audioMain"]["enabled"] === true){
					ae.AudioContext = function(){console.log("%c [Tr]Blocked [AF][AC] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return {};};
					ae.webkitAudioContext = function(){console.log("%c [Tr]Blocked [AF][WA] Audio tracking ","font-size:1em;line-height:2em;color:#1a1a1a;background-color:#ffffff;border:.2em solid #0f0;"); return {};};
				}
			},"'" + JSON.stringify(opts) + "'",true
		);
	}
	*/
};

// Let's begin
TPage.startTracePage();