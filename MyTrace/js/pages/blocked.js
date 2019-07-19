/*
 * 	Trace blocked page script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var TraceBlock = {
	blockedURL:"",
	blockReason:0,
	whitelistData:{},
	init:function(){
		TraceBlock.Auth.Init();
		TraceBlock.assignButtonEvents();
		TraceBlock.getPageDetails();
		TraceBlock.setBasicContent();
		TraceBlock.setWhitelistOptions();

		if (/Firefox/.test(navigator.userAgent)){
			$("body").css("font-size","0.8em");
		}
	},
	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				TraceBlock.Auth.Channel = new BroadcastChannel('TraceAuth');
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof TraceBlock.Auth.Channel !== null){
					TraceBlock.Auth.Channel.postMessage(data);
				}
			}
		}
	},
	assignButtonEvents:function(){
		document.getElementById("open_settings").addEventListener("click",function(){
			if (/Chrome/.test(navigator.userAgent)){
				chrome.tabs.create({url:"html/options.html"});
			} else {
				chrome.tabs.create({url:"options.html"});
			}
		},false);
		document.getElementById("go_back").addEventListener("click",function(){
			try{
				history.go(-1);
			} catch(e){
				window.close();
			}
		},false);
	},
	getPageDetails:function(){
		if (window.location.hash.includes("u;")){
			var u = window.location.hash.split(";")[1];
			var t = u.split("&");
			TraceBlock.blockedURL = atob(t[0]);
			TraceBlock.blockReason = t[1];
		} else {
			TraceBlock.blockedURL = null;
		}
	},
	setBasicContent:function(){
		var u = $("#url"), r = $("#reason");
		if (TraceBlock.blockedURL === null){
			u.text("No information was provided");
			r.empty();
			return;
		}

		var types = {
			0:"Unknown",
			1:"Blocked because the Top Level Domain (e.g. .com, .au, .org) matched the blocklist",
			2:"Blocked because the website domain matched the blocklist",
			3:"Blocked because the website hostname matched the blocklist",
			4:"Blocked because URL matched the blocklist",
			5:"Blocked because file matched blacklisted files",
			"undefined":"No reason set"
		};
		u.text(TraceBlock.blockedURL);
		r.text(types[TraceBlock.blockReason]);
	},
	setWhitelistOptions:function(){
		if (TraceBlock.blockedURL === null) return;

		var url = new URL(TraceBlock.blockedURL);
		TraceBlock.whitelistData["origin"] = url.origin + "/*";
		TraceBlock.whitelistData["path"] = "*" + url + "*";
		TraceBlock.whitelistData["host"] = "*" + extractHostname(TraceBlock.blockedURL) + "*";
		TraceBlock.whitelistData["root"] = "*" + extractRootDomain(TraceBlock.blockedURL) + "*";

		var el = $("#whitelist_opts");

		if (typeof TraceBlock.whitelistData["origin"] === "string"){
			el.append(
				$("<label/>",{"for":"url_origin"}).text("Unblock the Origin URL: "),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_origin",
						"id":"url_origin",
						"placeholder":"Origin URL",
						"value":TraceBlock.whitelistData["origin"]
					}),
					$("<button/>").text("Apply").on("click enter",function(){TraceBlock.whitelistURL("origin");}),$("<br />")
				)
			);
		}
		if (typeof TraceBlock.whitelistData["path"] === "string" && TraceBlock.whitelistData["path"] !== "*/*" && TraceBlock.whitelistData["path"].split("/").length > 4){
			el.append(
				$("<label/>",{"for":"url_path"}).text("Unblock the URL path: "),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_path",
						"id":"url_path",
						"placeholder":"URL pathname",
						"value":TraceBlock.whitelistData["path"]
					}),
					$("<button/>").text("Apply").on("click enter",function(){TraceBlock.whitelistURL("path");}),$("<br />")
				)
			);
		}
		if (typeof TraceBlock.whitelistData["host"] === "string" && TraceBlock.whitelistData.host !== TraceBlock.whitelistData.root){
			el.append(
				$("<label/>",{"for":"url_host"}).text("Unblock the Host URL: "),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_host",
						"id":"url_host",
						"placeholder":"Hostname",
						"value":TraceBlock.whitelistData["host"]
					}),
					$("<button/>").text("Apply").on("click enter",function(){TraceBlock.whitelistURL("host");}),$("<br />")
				)
			);
		}
		if (typeof TraceBlock.whitelistData["root"] === "string"){
			el.append(
				$("<label/>",{"for":"url_root"}).text("Unblock the Root Domain: "),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_root",
						"id":"url_root",
						"placeholder":"Root Domain Name",
						"value":TraceBlock.whitelistData["root"]
					}),
					$("<button/>").text("Apply").on("click enter",function(){TraceBlock.whitelistURL("root");})
				)
			);
		}
	},
	whitelistURL:function(type){
		var url = TraceBlock.whitelistData[type], result;

		result = confirm("Are you sure you wish to allow access to:\n"+url);
		if (result !== true){
			return;
		}

		chrome.runtime.getBackgroundPage(function(bg){
			bg.Whitelist.AddItem(url,ProtectionTemplate(false),function(){
				TraceBlock.Auth.SafePost({action:"ReloadWhitelist"});
				window.location.href = TraceBlock.blockedURL;
			});
		});
	}
};
TraceBlock.init();