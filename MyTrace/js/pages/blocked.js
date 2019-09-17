/*
 * 	Trace blocked page script
 * 	Copyright AbsoluteDouble 2018 - 2019
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var tBlock = {
	blockedURL:"",
	blockReason:0,
	whitelistData:{},
	init:function(){
		tBlock.Auth.Init();
		tBlock.assignButtonEvents();
		tBlock.getPageDetails();
		tBlock.setBasicContent();
		tBlock.setWhitelistOptions();

		if (/Firefox/.test(navigator.userAgent)){
			$("body").css("font-size","0.8em");
		}
	},
	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				tBlock.Auth.Channel = new BroadcastChannel('TraceAuth');
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof tBlock.Auth.Channel !== null){
					tBlock.Auth.Channel.postMessage(data);
				}
			}
		}
	},
	assignButtonEvents:function(){
		$("#open_settings").on("click enter",function(){
			if (/Chrome/.test(navigator.userAgent)){
				chrome.tabs.create({url:"html/options.html"});
			} else {
				chrome.tabs.create({url:"options.html"});
			}
		});
		$("#go_back").on("click enter",function(){
			try{
				history.go(-1);
			} catch(e){
				window.close();
			}
		});
		$("#pause_trace").on("click enter",function(){
			chrome.runtime.getBackgroundPage(function(bg){
				var state = bg.Vars.paused;
				var newState = !state;

				bg.Vars.paused = newState;
				bg.Vars.pauseEnd = 999999;
				console.log("Updated pause state to "+newState);

				$("#pause_trace").text(newState === true ? lang("popNavCtrlUnpause") : lang("popNavCtrlPause"));
			});
		});
	},
	getPageDetails:function(){
		if (window.location.hash.includes("u;")){
			var u = window.location.hash.split(";")[1];
			var t = u.split("&");
			tBlock.blockedURL = atob(t[0]);
			tBlock.blockReason = t[1];
		} else {
			tBlock.blockedURL = null;
		}
	},
	setBasicContent:function(){
		var u = $("#url"), l = $("#url_link"), r = $("#reason");
		if (tBlock.blockedURL === null){
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
		l.attr("href",tBlock.blockedURL);
		u.text(tBlock.blockedURL);
		r.text(types[tBlock.blockReason]);
	},
	setWhitelistOptions:function(){
		if (tBlock.blockedURL === null) return;

		var url = new URL(tBlock.blockedURL);
		tBlock.whitelistData["origin"] = url.origin + "/*";
		tBlock.whitelistData["path"] = "*" + url + "*";
		tBlock.whitelistData["host"] = "*" + extractHostname(tBlock.blockedURL) + "*";
		tBlock.whitelistData["root"] = "*" + extractRootDomain(tBlock.blockedURL) + "*";

		var el = $("#whitelist_opts");

		if (typeof tBlock.whitelistData["origin"] === "string"){
			el.append(
				$("<label/>",{"for":"url_origin"}).text(lang("miscMsgUnblockOrigin")),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_origin",
						"id":"url_origin",
						"placeholder":"Origin URL",
						"value":tBlock.whitelistData["origin"]
					}),
					$("<button/>").text(lang("miscCtrlApplyEntry")).on("click enter",function(){tBlock.whitelistURL("origin");}),$("<br />")
				)
			);
		}
		if (typeof tBlock.whitelistData["path"] === "string" && tBlock.whitelistData["path"] !== "*/*" && tBlock.whitelistData["path"].split("/").length > 4){
			el.append(
				$("<label/>",{"for":"url_path"}).text(lang("miscMsgUnblockPath")),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_path",
						"id":"url_path",
						"placeholder":"URL pathname",
						"value":tBlock.whitelistData["path"]
					}),
					$("<button/>").text(lang("miscCtrlApplyEntry")).on("click enter",function(){tBlock.whitelistURL("path");}),$("<br />")
				)
			);
		}
		if (typeof tBlock.whitelistData["host"] === "string" && tBlock.whitelistData.host !== tBlock.whitelistData.root){
			el.append(
				$("<label/>",{"for":"url_host"}).text(lang("miscMsgUnblockHost")),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_host",
						"id":"url_host",
						"placeholder":"Hostname",
						"value":tBlock.whitelistData["host"]
					}),
					$("<button/>").text(lang("miscCtrlApplyEntry")).on("click enter",function(){tBlock.whitelistURL("host");}),$("<br />")
				)
			);
		}
		if (typeof tBlock.whitelistData["root"] === "string"){
			el.append(
				$("<label/>",{"for":"url_root"}).text(lang("miscMsgUnblockRoot")),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_root",
						"id":"url_root",
						"placeholder":"Root Domain Name",
						"value":tBlock.whitelistData["root"]
					}),
					$("<button/>").text(lang("miscCtrlApplyEntry")).on("click enter",function(){tBlock.whitelistURL("root");})
				)
			);
		}
	},
	whitelistURL:function(type){
		var url = tBlock.whitelistData[type];

		chrome.runtime.getBackgroundPage(function(bg){
			bg.Whitelist.AddItem(url,ProtectionTemplate(false),function(){
				tBlock.Auth.SafePost({action:"ReloadWhitelist"});
				window.location.href = tBlock.blockedURL;
			});
		});
	}
};
tBlock.init();