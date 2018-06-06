/* Copyright AbsoluteDouble Trace 2018 */

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}

var TraceTool = {

	DEBUG:false,
	currentOpenURL:"",
	currentRootDomain:"",
	currentHostname:"",
	currentStatistics:{"code":0,"media":0,"webpage":0,"other":0},

	init:function(){
		TraceTool.assignEvents();
		TraceTool.getCurrentURL();
		TraceTool.loadTodaysStats();
		TraceTool.createHomePage();
		TraceTool.Auth.Init();

		if (/Firefox/.test(navigator.userAgent)) {
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
					TraceTool.loadTodaysStats();
					TraceTool.createHomePage();
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
	loadTodaysStats:function(){
		var stats = chrome.extension.getBackgroundPage().Trace.s.Current;
		if (typeof stats !== "object" || stats === undefined) return;
		if (Object.keys(stats).length === 0) return;

		TraceTool.currentStatistics = stats[Object.keys(stats).pop()];
	},
	getCurrentURL:function(){
		// This function gets the current URL and stores it in the main object in multiple forms
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			var currTab = tabs[0];
			if (currTab) {
				TraceTool.currentOpenURL = currTab.url;
			}

			if (!TraceTool.currentOpenURL){
				TraceTool.currentOpenURL = false;
			}

			// Make sure its a URL we are allowed to interact with
			if (TraceTool.currentOpenURL.substring(0,4).toLowerCase() !== "http" && TraceTool.currentOpenURL.substring(0,5).toLowerCase() !== "https"){
				TraceTool.currentOpenURL = false;
			}

			if (TraceTool.currentOpenURL !== false){
				TraceTool.currentHostname = TraceTool.extractHostname(TraceTool.currentOpenURL);
				TraceTool.currentRootDomain = TraceTool.extractRootDomain(TraceTool.currentOpenURL);
			}
		});
	},
	settingsWindow:function(){
		if (/Chrome/.test(navigator.userAgent)){
			chrome.tabs.create({url:"html/options.html"});
		} else {
			chrome.tabs.create({url:"options.html"});
		}
	},
	createHomePage:function(){
		$("#title").text("Trace");
		if (TraceTool.currentStatistics === undefined){
			$("#current_section").empty().append(
				$("<h1/>").text("Trace 1.9")
			);
		}
		$("#current_section").empty().append(
			$("<h1/>").text("Today's statistics"),
			$("<ul/>").append(
				$("<li/>").text("Code requests blocked: " + TraceTool.currentStatistics.code),
				$("<li/>").text("Media requests blocked: " + TraceTool.currentStatistics.media),
				$("<li/>").text("Webpage requests blocked: " + TraceTool.currentStatistics.webpage),
				$("<li/>").text("Other requests blocked: " + TraceTool.currentStatistics.other)
			)
		);
	},
	createReportPanel:function(){
		$("#title").text("Report Website");
		$("#current_section").empty().append(
			$("<span/>",{"class":"msg", "id":"report_msg"}).text(""),
			$("<div/>",{
				"id":"page_form"
			}).append(
				$("<div/>",{
					"id":"user_in"
				}).append(
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

		if (TraceTool.currentOpenURL === false){
			$("#page_form").empty().append(
				$("<h1/>").text("Unsupported URL"),
				$("<span/>").text("You can only send reports about pages that are http or https")
			);
		} else {
			$("#report_url").val(TraceTool.currentOpenURL);
		}
	},
	sendPageReport:function(){
		var user_text = $("#user_message").val();
		if (!navigator.onLine){
			$("#report_msg").html("<h2>No internet connection found</h2>");
			return;
		}

		var dataStr = "type=report";
		dataStr += "&url=" + btoa(TraceTool.currentOpenURL);
		dataStr += "&msg=" + btoa(user_text);
		dataStr += "&ver=" + btoa(chrome.runtime.getManifest().version);
		dataStr += "&brw=" + btoa(navigator.userAgent);
		dataStr += "&usr=" + btoa("xyz");

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
						$("#report_msg").html("<h2>Report Successful</h2>");
					},500);
				} else {
					$("#report_msg").html("<h2>Report Sending Failed</h2>");
				}
			},
			error:function(e){
				$("#send_report").html("Send Report").prop("disabled","false");
				if (!navigator.onLine){
					$("#report_msg").html("<h2>No internet connection found</h2>");
				} else {
					if (e.status === 0){
						$("#report_msg").html("<h2>Report Sending Failed</h2><h3>Unable to establish a connection to the server</h3>");
						return;
					}
					$("#report_msg").html("<h2>Report Sending Failed<br />Error Code: " + e.status + "</h2>");
					console.log(e);
				}
			}
		});
	},
	createWhitelistPanel:function(){
		// Check if whitelisting is enabled in settings
		if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.Whitelist.enabled !== true){
			$("#current_section").empty().append(
				$("<br />"),
				$("<span/>",{"class":"msg"}).text("Enable whitelisting in settings to use this feature.")
			);
			return;
		}

		// Start writing the UI
		$("#current_section").empty().append($("<div/>",{"id":"page_form"}));
		$("#title").text("Whitelist Website");

		// Check if hostname is affected by the whitelist
		if (chrome.extension.getBackgroundPage().Trace.c.whitelist[TraceTool.currentHostname] !== undefined){
			$("#current_section").empty().append(
				$("<br/>"),$("<span/>",{"class":"msg"}).text("Hostname already in whitelist"),$("<br/>"),$("<br/>"),
				$("<div/>",{"id":"user_in"}).append(
					$("<button/>",{"id":"whitelist_rmhostname"}).text("Remove Hostname").on("click enter",function(e){TraceTool.whitelistRemove("host",e);})
				)
			);
			return;
		}

		// Check if root domain is affected by the whitelist
		if (chrome.extension.getBackgroundPage().Trace.c.whitelist[TraceTool.currentRootDomain] !== undefined){
			$("#current_section").empty().append(
				$("<br/>"),$("<span/>",{"class":"msg"}).text("Domain already in whitelist"),$("<br/>"),$("<br/>"),
				$("<div/>",{"id":"user_in"}).append(
					$("<button/>",{"id":"whitelist_rmdomain"}).text("Remove Domain").on("click enter",function(e){TraceTool.whitelistRemove("root",e);})
				)
			);
			return;
		}

		$("<div/>",{"id":"user_in"}).append(
			$("<label/>",{"for":"whitelist_root"}).text("Current Root Domain:"),$("<br/>"),
			$("<input/>",{
				"type":"text",
				"value":"Couldn't get tab information",
				"id":"whitelist_root",
				"readonly":"true"
			}),
			$("<br/>"),
			$("<label/>",{"for":"whitelist_host"}).text("Current Hostname"),$("<br/>"),
			$("<input/>",{
				"type":"text",
				"value":"Couldn't get tab information",
				"id":"whitelist_host",
				"readonly":"true"
			}),
			$("<br/>"),$("<br/>"),
			$("<span/>",{"class":"smsg"}).text("This will add the site to the whitelist which will stop TracePage and the Web Request Controller from affecting the site and requests it makes."),
			$("<br/>"), $("<br/>"),
			$("<button/>",{"id":"whitelist_doroot"}).text("Whitelist Domain").on("click enter",function(e){TraceTool.whitelistItem("root",e);}),
			$("<button/>",{"id":"whitelist_dohost"}).text("Whitelist Hostname").on("click enter",function(e){TraceTool.whitelistItem("host",e);})
		).appendTo("#page_form");

		if (TraceTool.currentOpenURL === false){
			$("#page_form").empty().append(
				$("<h1/>").text("Unsupported URL"),
				$("<span/>").text("You can only whitelist pages that are http or https")
			);
		} else {
			$("#whitelist_root").val(TraceTool.currentRootDomain);
			$("#whitelist_host").val(TraceTool.currentHostname);
		}
	},
	ValidateDomain:function(clean){
		return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(clean);
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
	whitelistItem:function(item,e){
		$(e).text("Whitelisting...");

		var add = TraceTool.currentHostname;
		if (item === "root"){
			add = TraceTool.currentRootDomain;
		}

		chrome.extension.getBackgroundPage().Trace.c.AddItem(add,function(){
			$("#current_section .msg").html("Whitelisted domain");
			$("#user_in").empty().html("<span class='msg'>The domain: <br />" + add + "<br /><br /> Has been added to the whitelist.</span>");
			TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
		});
	},
	whitelistRemove:function(item,e){
		$(e).text("Removing...");

		var rem = TraceTool.currentHostname;
		if (item === "root"){
			rem = TraceTool.currentRootDomain;
		}

		chrome.extension.getBackgroundPage().Trace.c.RemoveItem(rem,function(){
			$("#current_section .msg").html("Removed site from whitelist");
			$("#user_in").empty().html("<span class='msg'><br />" + rem + "<br /> Has been removed from the whitelist.<br /><br />Reload page to apply action</span>");
			TraceTool.Auth.SafePost({action:"ReloadWhitelist"});
		});
	}
};

$(document).ready(function(){
	TraceTool.init();
});