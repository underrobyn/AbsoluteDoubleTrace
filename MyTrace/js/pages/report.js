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

	init:function(){
		TraceTool.assignEvents();
		TraceTool.getCurrentURL();
		TraceTool.loadThisTab();
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
				if (sel === "home"){
					TraceTool.loadThisTab();
				} else if (sel === "report"){
					TraceTool.createReportPanel();
				} else if (sel === "whitelist"){
					TraceTool.createWhitelistPanel();
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
	loadThisTab:function(){
		chrome.runtime.getBackgroundPage(function(bg){
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
				var currTab = tabs[0];
				if (currTab) {
					var data = bg.Trace.t.TabList[currTab.id];
					TraceTool.createHomePage(data,currTab);
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
	settingsWindow:function(){
		if (/Chrome/.test(navigator.userAgent)){
			chrome.tabs.create({url:"html/options.html"});
		} else {
			chrome.tabs.create({url:"options.html"});
		}
		window.close();
	},
	createHomePage:function(data,tab){
		$("#title").text("Trace");
		if (TraceTool.currentStatistics === undefined){
			$("#current_section").empty().append(
				$("<h1/>").text("Trace")
			);
		}

		$("#current_section").empty().append(
			$("<div/>").append(
				$("<h1/>").text("Blocked in this tab:"),
				$("<ul/>").append(
					$("<li/>",{"style":"display:none;"}).text("Tab ID: " + tab.id),
					$("<li/>").text("Code Requests: " + data.data.webRequests.code),
					$("<li/>").text("Media Requests: " + data.data.webRequests.media),
					$("<li/>").text("Webpage Requests: " + data.data.webRequests.webpage),
					$("<li/>").text("Other Requests: " + data.data.webRequests.other)
				)
			)
		);
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
	createWhitelistPanel:function(){
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
			for (var i = 0, l = decWl.keys.length;i<l;i++){
				if (decWl.keys[i].test(TraceTool.whitelistData.currentOpenURL) !== true) continue;

				// Add UI for multiple whitelist entries that apply to a domain
				if (decWl.values[i].SiteBlocked === false){
					TraceTool.whitelistData.txtEntry = Object.keys(stoWl)[i];
					TraceTool.whitelistData.entry = decWl[i];
					TraceTool.createWhitelistEdit();
				}
			}
		});

		TraceTool.createWhitelistOpts();
	},
	createWhitelistEdit:function(data){
		$("#current_section").empty().append(
			$("<br/>"),$("<span/>",{"class":"msg"}).text("This URL matches an item already in the Whitelist."),$("<br/>"),$("<br/>"),
			$("<div/>",{"id":"user_in"}).append(
				$("<button/>",{"id":"whitelist_rmdomain"}).text("Remove Entry").on("click enter",TraceTool.whitelistRemove)
			)
		);
	},
	createWhitelistOpts:function(){
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
					$("<button/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceTool.whitelistURL("origin");}),$("<br />")
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
					$("<button/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceTool.whitelistURL("path");}),$("<br />")
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
					$("<button/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceTool.whitelistURL("host");}),$("<br />")
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
					$("<button/>",{"href":window.location.hash}).text("Apply this").on("click enter",function(){TraceTool.whitelistURL("root");}),$("<br />")
				)
			);
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
	},
	whitelistURL:function(type){
		var url = TraceTool.whitelistData[type], result;

		result = confirm("Are you sure you wish to add the following item to the whitelist:\n"+url);
		if (result !== true){
			return;
		}

		chrome.runtime.getBackgroundPage(function(bg){
			bg.Trace.c.AddItem(url,TraceTool.ProtectionTemplate,function(){
				$("#current_section .msg").html("Whitelisted domain");
				$("#user_in").empty().html("<span class='msg'>The domain: <br />" + url + "<br /><br /> Has been added to the list.</span>");
				TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
			});
		});
	},
	whitelistAdded:function(){

	},
	whitelistRemove:function(){
		chrome.runtime.getBackgroundPage(function(bg){
			bg.Trace.c.RemoveItem(TraceTool.whitelistData.txtEntry,function(){
				$("#current_section .msg").html("Action Completed!");
				$("#user_in").empty().html("<span class='msg'><br />" + TraceTool.whitelistData.txtEntry + "<br /> Has been removed from the list.<br /><br />Reload page to apply action</span>");
				TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
			});
		});
	}
};

$(document).ready(function(){
	TraceTool.init();
});