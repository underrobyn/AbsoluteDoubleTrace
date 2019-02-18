/*
 * 	Trace popup script
 * 	Copyright AbsoluteDouble 2018 - 2019
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

// A general fix for browser that use window.browser instead of window.chrome
if (typeof window.chrome === "undefined" || !window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

var TraceTool = {

	DEBUG:false,
	whitelistData:{
		"currentOpenURL":""
	},
	currentStatistics:{"code":0,"media":0,"webpage":0,"other":0},
	prefs:{},
	reloadInt:null,

	init:function(){
		TraceTool.reloadInt = setInterval(function(){TraceTool.loadThisTab("update");},1000);

		chrome.runtime.getBackgroundPage(function(bg){
			TraceTool.DEBUG = bg.Trace.DEBUG;
		});

		TraceTool.assignEvents();
		TraceTool.getCurrentURL();
		TraceTool.loadThisTab("create");
		TraceTool.loadPrefs();
		TraceTool.Auth.Init();

		if (/Firefox|Edge/.test(navigator.userAgent)) {
			$("body").css("font-size", "0.8em");
		}
	},

	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				TraceTool.Auth.Channel = new BroadcastChannel('TraceAuth');
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof TraceTool.Auth.Channel !== null){
					TraceTool.Auth.Channel.postMessage(data);
				}
			}
		}
	},
	assignEvents:function(){
		$(".section_toggle").each(function(){
			$(this).on("click enter",function(){
				var sel = $(this).data("tracetool");

				if (sel !== "home") $("#current_section").addClass("padded_sect");
				if (sel !== "home" && TraceTool.reloadInt) clearInterval(TraceTool.reloadInt);

				if (sel === "home"){
					$("#current_section").removeClass("padded_sect");
					TraceTool.loadThisTab("create");
					TraceTool.reloadInt = setInterval(function(){TraceTool.loadThisTab("update");},1000);
				} else if (sel === "report"){
					TraceTool.createReportPanel();
				} else if (sel === "whitelist"){
					TraceTool.scope.createPanel();
				} else if (sel === "settings"){
					TraceTool.settingsWindow();
				} else {
					console.log("Unknown tab: " + sel);
				}
			});
		});
	},
	loadPrefs:function() {
		chrome.runtime.getBackgroundPage(function (bg) {
			TraceTool.prefs = bg.Trace.p.Current;
		});
	},
	loadThisTab:function(type){
		chrome.runtime.getBackgroundPage(function(bg){
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var currTab = tabs[0];
				if (currTab) {
					var data = bg.Trace.t.TabList[currTab.id];

					var call = TraceTool.home.updateSection;
					if (type === "create") call = TraceTool.home.createStructure;

					call(data,currTab,bg.Trace.p.Current);
				}
			});
		});
	},
	getCurrentURL:function(){
		// This function gets the current URL and stores it in the main object in multiple forms
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var currTab = tabs[0];
			if (currTab) {
				TraceTool.whitelistData.currentOpenURL = currTab.url;
			}

			if (!TraceTool.whitelistData.currentOpenURL){
				TraceTool.whitelistData.currentOpenURL = false;
			}

			// Make sure its a URL we are allowed to interact with and that the URL object can decode
			if (TraceTool.whitelistData.currentOpenURL.substring(0,4).toLowerCase() !== "http" || !TraceTool.whitelistData.currentOpenURL.includes("://")){
				TraceTool.whitelistData.currentOpenURL = false;
			}
		});
	},

	openTab:function(page){
		if (/Chrome/.test(navigator.userAgent)){
			chrome.tabs.create({url:"html/"+page});
		} else {
			chrome.tabs.create({url:page});
		}
		window.close();
	},
	settingsWindow:function(){
		TraceTool.openTab("options.html");
	},
	gotoWhitelist:function(){
		TraceTool.openTab("options.html#view=whitelist");
	},

	home:{
		text:{
			"rTypes":["code","media","webpage","other"],
			"rNames":["Code Requests","Media Requests", "Webpage Requests", "Misc"],
			"hTypes":["etag","google","proxyip","referer","cookies","setcookie","useragent"],
			"hNames":["E-Tags blocked", "Google Headers blocked", "Requests with IP Spoofed", "Referer Headers blocked","Cookie Headers modified","Set-Cookies modified","User-Agent Headers spoofed"],
			"hPrefs":["Pref_ETagTrack","Pref_GoogleHeader","Pref_IPSpoof","Pref_ReferHeader","Pref_CookieEater","Pref_CookieEater","Pref_UserAgent"]
		},
		createStructure:function(data,tab,prefs){
			$("#title").text("Trace");
			if (TraceTool.currentStatistics === undefined){
				$("#current_section").empty().append(
					$("<h1/>").text("Trace")
				);
			}

			// Create main element
			var el = $("<div/>",{"class":"home_section"});

			if (TraceTool.DEBUG === true) el.append($("<h2/>").text("TabID: "+tab.id));

			// Web requests section
			var	rTotal = 0, rEl = $("<div/>",{"class":"home_sect_d","id":"home_data_requests"});

			for (var i = 0;i<TraceTool.home.text.rTypes.length;i++){
				rEl.append(
					$("<div/>",{"class":"home_sect_r","id":"home_upd_r"+TraceTool.home.text.rTypes[i]}).text(TraceTool.home.text.rNames[i] + ": " + data.data.webRequests[TraceTool.home.text.rTypes[i]]).contextmenu(TraceTool.createUriList)
				);
				rTotal += data.data.webRequests[TraceTool.home.text.rTypes[i]];
			}
			el.append($("<div/>",{"class":"home_sect_t","id":"home_requests_title","data-opens":"#home_data_requests"}).text("Web Requests (" + rTotal + " blocked)"),rEl);

			// HTTP Header section
			var hTotal = 0, hEl = $("<div/>",{"class":"home_sect_d","id":"home_data_headers"}), hTot = 0;
			for (var i = 0;i<TraceTool.home.text.hTypes.length;i++){
				var cList = "home_sect_r";
				if (prefs[TraceTool.home.text.hPrefs[i]].enabled !== true){
					cList += " home_sect_hide";
				} else {
					if (data.data.headers[TraceTool.home.text.hTypes[i]] === 0){
						cList += " home_sect_fade";
					}
					hTot++;
				}

				hEl.append(
					$("<div/>",{"class":cList,"id":"home_upd_h"+TraceTool.home.text.hTypes[i]}).text(TraceTool.home.text.hNames[i] + ": " + data.data.headers[TraceTool.home.text.hTypes[i]].toString())
				);
				hTotal += data.data.headers[TraceTool.home.text.hTypes[i]];
			}

			var msg = "Headers (" + hTotal + " modified)";
			if (hTot === 0) msg = "No Header Protections Enabled";
			if (hTotal === 0) msg = "No Header Protections Used In This Tab";

			el.append($("<div/>",{"class":"home_sect_t","id":"home_headers_title","data-opens":"#home_data_headers"}).text(msg),hEl);

			// Update HTML
			$("#current_section").empty().append(el);

			$(".home_sect_t").on("click enter",function(){
				$($(this).data("opens")).toggle();
			});

			// Requests shown by default
			$("#home_data_requests").show();
		},
		updateSection:function(data,tab,prefs){
			// Web requests section
			var	rTotal = 0;
			for (var i = 0;i<TraceTool.home.text.rTypes.length;i++){
				$("#home_upd_r"+TraceTool.home.text.rTypes[i]).text(TraceTool.home.text.rNames[i] + ": " + data.data.webRequests[TraceTool.home.text.rTypes[i]]);
				rTotal += data.data.webRequests[TraceTool.home.text.rTypes[i]];
			}
			$("#home_requests_title").text("Web Requests (" + rTotal + " blocked)");

			// HTTP Header section
			var hTotal = 0, hTot = 0;
			for (var i = 0;i<TraceTool.home.text.hTypes.length;i++){
				var cList = "home_sect_r";
				if (prefs[TraceTool.home.text.hPrefs[i]].enabled !== true){
					cList += " home_sect_fade";
				} else {
					if (data.data.headers[TraceTool.home.text.hTypes[i]] === 0){
						cList += " home_sect_fade";
					}
					hTot++;
				}
				$("#home_upd_h"+TraceTool.home.text.hTypes[i]).text(TraceTool.home.text.hNames[i] + ": " + data.data.headers[TraceTool.home.text.hTypes[i]]).attr("class",cList);
				hTotal += data.data.headers[TraceTool.home.text.hTypes[i]];
			}

			var msg = "Headers (" + hTotal + " modified)";
			if (hTot === 0) msg = "No Header Protections Enabled";
			if (hTotal === 0) msg = "No Header Protections Used In This Tab";
			$("#home_headers_title").text(msg);
			//TraceTool.createUriList(data,tab);
		},
		createUriList:function(data,tab){
			console.log(data);
		}
	},

	createReportPanel:function(){
		$("#title").text("Report Website");
		$("#current_section").empty().append(
			$("<span/>",{"class":"msg", "id":"report_msg"}).text(""),
			$("<div/>",{"id":"page_form"}).append(
				$("<div/>",{"id":"user_in"}).append(
					$("<input/>",{
						"type":"text",
						"placeholder":"Page URL",
						"value":"Couldn't get tab information",
						"id":"report_url",
						"readonly":"true"
					}),
					$("<textarea/>",{
						"id":"user_message",
						"placeholder":"Your message about the report goes here.\n\nLeave your email if you would like a response."
					}),
					$("<br/>"), $("<br/>"),
					$("<button/>",{
						"id":"send_report"
					}).text("Send Report").on("click enter",TraceTool.sendPageReport)
				)
			)
		);

		if (TraceTool.whitelistData.currentOpenURL === false){
			$("#page_form").empty().append(
				$("<h1/>").text("Unsupported URL"),
				$("<span/>").text("You can only send reports about pages that are http or https")
			);
		} else {
			$("#report_url").val(TraceTool.whitelistData.currentOpenURL);
		}
	},
	sendPageReport:function(){
		var user_text = $("#user_message").val();
		var rep_msg = $("#report_msg");
		if (!navigator.onLine){
			rep_msg.html("<h2>No internet connection found</h2>");
			return;
		}

		var dataStr = "type=report";
		dataStr += "&url=" + btoa(TraceTool.whitelistData.currentOpenURL);
		dataStr += "&msg=" + btoa(user_text);
		dataStr += "&ver=" + btoa(chrome.runtime.getManifest().version);
		dataStr += "&brw=" + btoa(navigator.userAgent);
		dataStr += "&usr=" + btoa("xyz");
		dataStr += "&prf=" + btoa(JSON.stringify(TraceTool.prefs));

		$.ajax({
			url:"https://absolutedouble.co.uk/trace/app/errorscript.php",
			type:"POST",
			data:dataStr,
			timeout:45000,
			beforeSend:function(){
				$("#send_report").html("Sending...").prop("disabled","true");
			},
			success:function(d){
				$("#send_report").html("Send Report").prop("disabled","false");
				console.log(d);
				if (d === "") {
					$("#user_in").slideUp(500);
					setTimeout(function(){
						rep_msg.html("<h2>Report Successful</h2>");
					},500);
				} else {
					rep_msg.html("<h2>Report Sending Failed</h2>");
				}
			},
			error:function(e){
				$("#send_report").html("Send Report").prop("disabled","false");
				if (!navigator.onLine){
					rep_msg.html("<h2>No internet connection found</h2>");
				} else {
					if (e.status === 0){
						rep_msg.html("<h2>Report Sending Failed</h2><h3>Unable to establish a connection to the server</h3>");
						return;
					}
					rep_msg.html("<h2>Report Sending Failed<br />Error Code: " + e.status + "</h2>");
					console.log(e);
				}
			}
		});
	},
	
	scope:{
		ProtectionTemplate:{
			SiteBlocked:false,
			InitRequests:true,
			Protections:{
				Pref_AudioFingerprint:true,
				Pref_BatteryApi:false,
				Pref_CanvasFingerprint: true,
				Pref_ClientRects:true,
				Pref_CookieEater:false,
				Pref_ETagTrack:false,
				Pref_GoogleHeader:false,
				Pref_IPSpoof:false,
				Pref_NativeFunctions:false,
				Pref_NetworkInformation:false,
				Pref_HardwareSpoof:false,
				Pref_PingBlock:false,
				Pref_PluginHide:false,
				Pref_ReferHeader:false,
				Pref_ScreenRes:false,
				Pref_UserAgent:false,
				Pref_WebRTC:false,
				Pref_WebGLFingerprint:false
			}
		},
		SettingName:{
			"Pref_AudioFingerprint":"Audio Fingerprinting Protection",
			"Pref_BatteryApi":"Battery API Protection",
			"Pref_CanvasFingerprint":"Canvas Fingerprinting Protection",
			"Pref_ClientRects":"getClientRects Protection",
			"Pref_CookieEater":"Cookie Eater",
			"Pref_HardwareSpoof":"Hardware Fingerprinting Protection",
			"Pref_ETagTrack":"E-Tag Tracking Protection",
			"Pref_GoogleHeader":"Google Header Removal",
			"Pref_IPSpoof":"Proxy IP Header Spoofing",
			"Pref_NativeFunctions":"JS functions",
			"Pref_NetworkInformation":"Network Information API",
			"Pref_PingBlock":"Ping Protection",
			"Pref_PluginHide":"JS Plugin Hide",
			"Pref_ReferHeader":"Referer Controller",
			"Pref_ScreenRes":"Screen Resolution Tracking",
			"Pref_UserAgent":"User-Agent Randomiser",
			"Pref_WebGLFingerprint":"WebGL Fingerprinting Protection",
			"Pref_WebRTC":"WebRTC Protection"
		},
		createPanel:function(){
			// Start writing the UI
			$("#current_section").empty().append($("<div/>",{"id":"page_form"}));
			$("#title").text("Whitelist");

			if (TraceTool.whitelistData.currentOpenURL === false || TraceTool.whitelistData.currentOpenURL === null){
				$("#page_form").empty().append(
					$("<h1/>").text("Unsupported URL"),
					$("<span/>").text("You can only whitelist pages that are http or https")
				);
				return;
			}

			// Check if hostname is affected by the whitelist
			chrome.runtime.getBackgroundPage(function(bg){
				var decWl = bg.Trace.c.decodedWhitelist;
				var stoWl = bg.Trace.c.storedWhitelist;
				var entriesApply = 0;

				for (var i = 0, l = decWl.keys.length;i<l;i++){
					if (decWl.keys[i].test(TraceTool.whitelistData.currentOpenURL) !== true) continue;

					// Log number of entries that apply but only allow editing the first (Temp fix)
					entriesApply++;
					if (entriesApply > 1) continue;

					TraceTool.whitelistData.txtEntry = Object.keys(stoWl)[i];
					TraceTool.whitelistData.entry = decWl.keys[i];
				}

				// Update the UI
				if (entriesApply !== 0) TraceTool.scope.createEditor(bg,entriesApply);
			});

			TraceTool.scope.createOpts();
		},
		createEditor:function(bg,entriesApply){
			var entriesWarning = $("<span/>",{"class":"msg","style":"font-weight:400;"}).text(
				(entriesApply === 1 ? "" : "More than 1 whitelist entry applies to this site!")
			).append($("<br/>")).prepend($("<br/>"));

			$("#current_section").empty().append(
				$("<br/>"),$("<span/>",{"class":"msg","style":"font-weight:400;"}).text("Edit whitelist entry for this site:"),entriesWarning,
				$("<div/>",{"id":"user_in"}).append(
					$("<div/>",{"class":"setting_conf_opt"}).append(
						$("<label/>",{
							"for":"s_prot_blocksite",
							"class":"checkbox_cont xlarge"
						}).text("Block access to this site").append(
							$("<input/>",{"id":"s_prot_blocksite","type":"checkbox"}),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<div/>",{"class":"setting_conf_opt"}).append(
						$("<label/>",{
							"for":"s_prot_initreqs",
							"class":"checkbox_cont xlarge"
						}).text("Allow this site to make requests to blocked sites").append(
							$("<input/>",{"id":"s_prot_initreqs","type":"checkbox","checked":"checked"}),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<div/>",{"id":"whitelist_prots_list"}).append($("<h1/>").text("Loading...")),
					$("<button/>",{"id":"whitelist_save"}).text("Save Entry").on("click enter",TraceTool.scope.updateEntry),
					$("<button/>",{"id":"whitelist_rmdomain"}).text("Remove Entry").on("click enter",TraceTool.scope.removeEntry),
					$("<button/>",{"id":"whitelist_goto"}).text("Open Whitelist").on("click enter",TraceTool.gotoWhitelist)
				)
			);
			TraceTool.scope.createExecs(bg);
			TraceTool.scope.updateExecs(bg);
		},
		createExecs:function(bg){
			var dpAllPage = bg.Trace.p.Current.Main_ExecutionOrder.AllPage || [];
			var dpPerPage = bg.Trace.p.Current.Main_ExecutionOrder.PerPage || [];
			var w = $("#whitelist_prots_list");

			w.empty();

			if (dpAllPage.length !== 0){
				w.append($("<h2/>").text("Applies to all pages"));
				for (var i = 0;i<dpAllPage.length;i++){
					var style = "", protmsg = "When checked, this setting is allowed to run", enabledStatus = "";
					if (bg.Trace.p.Current[dpAllPage[i]].enabled !== true) {
						style = "cursor:not-allowed";
						enabledStatus = " (Disabled)";
						protmsg = "This setting is disabled fully. Go to the Trace settings page to enable it.";
					}

					w.append(
						$("<div/>",{"class":"setting_conf_opt"}).append(
							$("<label/>",{
								"class":"checkbox_cont xlarge",
								"style":style,
								"title":protmsg
							}).text((TraceTool.scope.SettingName[dpAllPage[i]] || dpAllPage[i]) + enabledStatus).append(
								$("<input/>",{
									"type":"checkbox",
									"checked":"checked",
									"data-controls":dpAllPage[i]
								}),
								$("<span/>",{"class":"ccheck"})
							)
						)
					);
				}
			}

			if (dpPerPage.length !== 0){
				w.append($("<h2/>").text("Applies to some pages"));
				for (var i = 0;i<dpPerPage.length;i++){
					var style = "", protmsg = "When checked, this setting is allowed to run", enabledStatus = "";
					if (bg.Trace.p.Current[dpPerPage[i]].enabled !== true) {
						style = "cursor:not-allowed";
						enabledStatus = " (Disabled)";
						protmsg = "This setting is disabled fully. Go to the Trace settings page to enable it.";
					}

					w.append(
						$("<div/>",{"class":"setting_conf_opt"}).append(
							$("<label/>",{
								"class":"checkbox_cont xlarge",
								"style":style,
								"title":protmsg
							}).text((TraceTool.scope.SettingName[dpPerPage[i]] || dpPerPage[i]) + enabledStatus).append(
								$("<input/>",{
									"type":"checkbox",
									"data-controls":dpPerPage[i]
								}),
								$("<span/>",{"class":"ccheck"})
							)
						)
					);
				}
			}
		},
		updateExecs:function(bg){
			var currData = bg.Trace.c.storedWhitelist[TraceTool.whitelistData.txtEntry];

			if (typeof currData.Protections === "undefined"){
				console.error(currData);
				alert("Error with Scope entry.");
			}

			$("input[data-controls]").each(function() {
				$(this).attr("checked",currData.Protections[$(this).data("controls")]);
			});

			$("#s_prot_blocksite").attr("checked",currData.SiteBlocked);
			$("#s_prot_initreqs").attr("checked",currData.InitRequests);
		},
		createOpts:function(){
			var url = new URL(TraceTool.whitelistData.currentOpenURL);
			TraceTool.whitelistData["origin"] = url.origin + "/*";
			TraceTool.whitelistData["path"] = "*" + url + "*";
			TraceTool.whitelistData["host"] = "*" + TraceTool.extractHostname(TraceTool.whitelistData.currentOpenURL) + "*";
			TraceTool.whitelistData["root"] = "*" + TraceTool.extractRootDomain(TraceTool.whitelistData.currentOpenURL) + "*";

			var el = $("#page_form");

			if (typeof TraceTool.whitelistData["origin"] === "string"){
				el.append(
					$("<label/>",{"for":"url_origin"}).text("Unblock the Origin URL: "),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_origin",
							"id":"url_origin",
							"placeholder":"Origin URL",
							"readonly":true,
							"value":TraceTool.whitelistData["origin"]
						}),
						$("<button/>",{"data-type":"origin"}).text("Apply").on("click enter",TraceTool.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TraceTool.whitelistData["path"] === "string" && TraceTool.whitelistData["path"] !== "*/*" && TraceTool.whitelistData["path"].split("/").length > 4){
				el.append(
					$("<label/>",{"for":"url_path"}).text("Unblock the URL path: "),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_path",
							"id":"url_path",
							"placeholder":"URL pathname",
							"readonly":true,
							"value":TraceTool.whitelistData["path"]
						}),
						$("<button/>",{"data-type":"path"}).text("Apply").on("click enter",TraceTool.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TraceTool.whitelistData["host"] === "string" && TraceTool.whitelistData.host !== TraceTool.whitelistData.root){
				el.append(
					$("<label/>",{"for":"url_host"}).text("Unblock the Host URL: "),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_host",
							"id":"url_host",
							"placeholder":"Hostname",
							"readonly":true,
							"value":TraceTool.whitelistData["host"]
						}),
						$("<button/>",{"data-type":"host"}).text("Apply").on("click enter",TraceTool.scope.submitEntry),$("<br />")
					)
				);
			}
			if (typeof TraceTool.whitelistData["root"] === "string"){
				el.append(
					$("<label/>",{"for":"url_root"}).text("Unblock the Root Domain: "),
					$("<form/>").append(
						$("<input/>",{
							"type":"text",
							"name":"url_root",
							"id":"url_root",
							"placeholder":"Root Domain Name",
							"readonly":true,
							"value":TraceTool.whitelistData["root"]
						}),
						$("<button/>",{"data-type":"root"}).text("Apply").on("click enter",TraceTool.scope.submitEntry),$("<br />")
					)
				);
			}
		},
		submitEntry:function(e){
			e.preventDefault();
			var that = $(this);

			that.text("Applying...");
			console.log("Calling addNewEntry("+that.data("type")+")");

			TraceTool.scope.addNewEntry(that.data("type"),function(){
				that.text("Applied!");

				TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
				setTimeout(TraceTool.scope.createPanel,1500);
			});
		},
		addNewEntry:function(type,callback){
			var url = TraceTool.whitelistData[type], result;

			result = confirm("Are you sure you wish to add the following item to the whitelist:\n"+url);
			if (result !== true){
				return;
			}

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Trace.c.AddItem(url,TraceTool.scope.ProtectionTemplate,callback);
			});
		},
		removeEntry:function(){
			var that = $(this);
			that.text("Removing...");

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Trace.c.RemoveItem(TraceTool.whitelistData.txtEntry,function(){
					$("#current_section .msg").html("<strong>Action Completed!</strong>");
					$("#user_in").empty().html("<span class='msg'><br />" + TraceTool.whitelistData.txtEntry + "<br /> Has been removed from the list.<br /><br />Reload page to apply action</span>");

					TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
					setTimeout(TraceTool.scope.createPanel,2000);
				});
			});
		},
		updateEntry:function(){
			var that = $(this);
			that.text("Saving..");

			// Get information
			var item = TraceTool.whitelistData.txtEntry;
			console.log("Updating",item);

			// Default protection template
			var scopeData = TraceTool.scope.ProtectionTemplate;

			// Update 2 main controllers
			scopeData["SiteBlocked"] = $("#s_prot_blocksite").is(":checked");
			scopeData["InitRequests"] = $("#s_prot_initreqs").is(":checked");

			// Update protection object
			$("input[data-controls]").each(function() {
				scopeData["Protections"][$(this).data("controls")] = $(this).is(":checked");
			});

			chrome.runtime.getBackgroundPage(function(bg){
				bg.Trace.c.EditItem(item,item,scopeData,function(){
					setTimeout(function(){
						that.text("Save Entry");
					},500);
					TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
				});
			});
		}
	},
	
	// Thanks to https://stackoverflow.com/a/23945027/
	extractHostname:function(url){
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
	extractRootDomain:function(url){
		var domain = TraceTool.extractHostname(url);
		if (domain === false) return false;

		var	splitArr = domain.split('.'),
			arrLen = splitArr.length;

		if (arrLen > 2) {
			domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
			if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
				domain = splitArr[arrLen - 3] + '.' + domain;
			}
		}
		return domain;
	}
};

$(document).ready(function(){
	TraceTool.init();
});