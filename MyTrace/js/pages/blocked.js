/*
 * 	Trace blocked page script
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

let tBlock = {
	blockedURL:"",
	blockReason:0,
	whitelistData:{},

	init:function(){
		Auth.Init();
		tBlock.assignButtonEvents();
		tBlock.getPageDetails();
		tBlock.setBasicContent();
		tBlock.setWhitelistOptions();

		if (/Firefox/.test(navigator.userAgent)){
			$("body").css("font-size","0.8em");
		}
	},

	assignButtonEvents:function(){
		$("#open_settings").on("click enter",function(){
			TraceBg(function(bg){
				bg.Trace.f.OpenSettingsPage();
			});
		});
		$("#go_back").on("click enter",function(){
			try{
				history.go(-1);
			} catch(e){
				window.close();
			}
		});
		$("#pause_trace").on("click enter",function(){
			TraceBg(function(bg){
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
		if (!window.location.hash.includes("u;")) return;

		let u = window.location.hash.split(";")[1];
		let t = u.split("&");
		tBlock.blockedURL = atob(t[0]);
		tBlock.blockReason = t[1];
	},
	setBasicContent:function(){
		let u = $("#url"), l = $("#url_link"), r = $("#reason");
		if (tBlock.blockedURL === ""){
			u.text("No information was provided");
			r.empty();
			return;
		}

		let types = {
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
		if (!tBlock.blockedURL || tBlock.blockedURL === "") return;

		let wld = getURLComponents(tBlock.blockedURL);
		tBlock.whitelistData = wld;

		var el = $("#whitelist_opts");

		["origin","path","host","root"].forEach(function(part){
			if (typeof wld[part] !== "string") return;

			// Check for duplicated UI elements
			if (part !== "root" && wld[part] === wld.root) return;
			if (part !== "origin" && (wld[part].substring(1) === wld.origin && wld.origin.substring(0,4) === "http")) return;

			// Check for valid path UI element
			if (part === "path" && (wld.path === "*/*" || wld.path.split("/").length < 4)) return;

			el.append(
				$("<label/>",{"for":"url_" + part}).text(lang("miscMsgUnblock" + part.capitalize())),
				$("<form/>").append(
					$("<input/>",{
						"type":"text",
						"name":"url_" + part,
						"id":"url_" + part,
						"placeholder":part,
						"value":wld[part]
					}),
					$("<button/>",{"data-part":part}).text(lang("miscCtrlApplyEntry")).on("click enter",tBlock.whitelistURL),$("<br />")
				)
			);
		});
	},
	whitelistFinished:function(){
		$(".page_action").fadeOut(400);
		$("#title").text("Site has been whitelisted.");
		$("#reason").text("Click the link below to continue to the site");
	},
	whitelistURL:function(e){
		e.preventDefault();

		let type = $(this).data("part");
		var url = tBlock.whitelistData[type];

		$(this).text("Whitelisting...");

		TraceBg(function(bg){
			bg.Whitelist.AddItem(url,ProtectionTemplate(false),function(){
				Auth.SafePost({action:"ReloadList"});
				tBlock.whitelistFinished();
			});
		});
	}
};
tBlock.init();