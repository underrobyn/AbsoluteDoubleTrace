/* Copyright AbsoluteDouble Trace 2018 */

var showErr = function(m){
	document.getElementById("e_msg").style.display = "block";
	document.getElementById("fail_reason").innerHTML = m;
};

if (typeof $ !== "function" || typeof jQuery !== "function") {
	showErr("jQuery Library failed to load.");
}
if (typeof window.JSON !== "object"){
	showErr("JSON Library failed to load.");
}

// A general fix for browser that use window.browser instead of window.chrome
if (window["chrome"] === null || typeof (window["chrome"]) === "undefined"){
	window.chrome = window.browser;
}
if (typeof chrome.extension.getBackgroundPage !== "function"){
	showErr("Extension failed to connect to background page. Please try reloading the page.");
}

var TraceOpt = {
	s:"M2ysyaSd58sqt4zVGicIfbMYac8dqhtrk5yyA8tiG31gZ",
	homeRefresh:null,
	beta:false,
	currentSettingTab:"settings_stracefeature",
	// Thanks to: https://stackoverflow.com/a/4900484/
	getChromeVersion:function() {
		var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
		return raw ? parseInt(raw[2], 10) : false;
	},
	makeRandomID:function(r){
		for(var n="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",a=0;r > a;a++){
			n += t.charAt(Math.floor(Math.random()*t.length));
		}
		return n;
	},
	theDate:function(){
		var date = new Date();
		var day = date.getDate();
		var month = date.getMonth()+1;
		day.toString().length !== 2 ? day = "0" + day.toString() : 0;
		month.toString().length !== 2 ? month = "0" + month.toString() : 0;

		return [date.getFullYear().toString(),month.toString(),day.toString()];
	},
	FreshInstall:function(){
		$("#overlay_message").fadeOut(300);
		window.location.hash = '#';
		setTimeout(function(){$("#ux").removeClass("blurred");},10);
	},
	CloseOverlay:function(){
		$("#overlay_message").slideUp(250);
		$("#ux").removeClass("blurred");
	},
	AssignCloseOverlay:function(){
		$("#ux").addClass("blurred");
		$("#overlay_message").slideDown(300);
		$("#overlay_close").click(TraceOpt.CloseOverlay);
		$(window).click(function(e){
			if ($(e.target)[0].id === "overlay_message"){
				TraceOpt.CloseOverlay();
			}
		});
	},
	Auth:{
		Channel:null,
		Init:function(){
			if ('BroadcastChannel' in self) {
				// Start Authentication Channel
				TraceOpt.Auth.Channel = new BroadcastChannel('TraceAuth');

				TraceOpt.Auth.Channel.onmessage = function(m){
					if (m.data.action === "ByeByeTab"){
						clearInterval(TraceOpt.homeRefresh);

						document.title = "Tab Disabled";

						$("#drop_message").empty().append(
							$("<h1/>").text("Tab disabled"),
							$("<span/>").text("Trace only allows one tab to be open at a time, you are now using Trace in a new tab and so this one will close in 10 seconds.")
						);
						$("#ux").addClass("blurred");
						$("#overlay_message").slideDown(300);
						$("#overlay_close").hide();

						setTimeout(function(){
							window.close();
						},10000);
					} else if (m.data.action === "ReloadWhitelist"){

						TraceOpt.WhitelistEdit.ReloadWhitelist();

					} else {
						console.log("Authenticator: No action taken");
					}
				};
			}

			return true;
		},
		SafePost:function(data){
			if ('BroadcastChannel' in self) {
				if (typeof TraceOpt.Auth.Channel !== null){
					TraceOpt.Auth.Channel.postMessage(data);
				}
			}
		},
		Integrity:function(){
			TraceOpt.Auth.SafePost({action:"ByeByeTab"});
		}
	},
	Tutorial:{
		ShowAdvanced:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Trace's Extra Settings"),
				$("<h2/>").text("These features will soon be moving into the regular settings section but are mostly in beta"),
				$("<h3/>").html("If you find a bug with anything, especially features marked as 'Beta', please report it to <a class='dark' href='mailto:absolutedouble@gmail.com'>absolutedouble@gmail.com</a>"),
				$("<button/>",{
					"title":"Close"
				}).text("Okay").click(TraceOpt.CloseOverlay)
			);

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);
			$("#overlay_close").click(TraceOpt.CloseOverlay);

			localStorage["showAdvancedTutorial"] = false;
		},
		ShowSettings:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Introduction to Trace's settings"),
				$("<span/>").text("Click on setting name to reveal a description of what it does."),
				$("<br/>"),$("<br/>"),
				$("<span/>").text("Advanced features should be used with caution due to the fact they can make websites behave in strange ways"),
				$("<br/>"),$("<br/>"),
				$("<span/>").text("Browser settings are hidden settings already in your browser, they're shown here to make it easy for you to change them."),
				$("<br/>"),$("<br/>"),
				$("<span/>").text("Domain blocking is enabled by default, more domains are available in the 'Extra' section of Trace and whitelisting domains can be enabled here."),
				$("<br/>"),$("<br/>"),
				$("<h3/>").html("If you find a bug with anything, especially features marked as 'Beta', please report it to <a class='dark' href='mailto:absolutedouble@gmail.com'>absolutedouble@gmail.com</a>"),
				$("<button/>",{
					"title":"Close"
				}).text("Okay").click(TraceOpt.CloseOverlay)
			);

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);
			$("#overlay_close").click(TraceOpt.CloseOverlay);

			localStorage["showSettingsTutorial"] = false;
		}
	},
	WindowLoad:function(){
		// Check if Chrome API is being stupid
		if (typeof chrome.extension !== "object"){
			$("#drop_message").empty().append(
				$("<h1/>").text("Chrome API did not load"),
				$("<h2/>").text("Trace will reload the page in 3 seconds")
			);
			$("#overlay_message").slideDown(300);
			setTimeout(function(){
				window.location.reload();
			},3300);
			return;
		}

		// Assign click events to nav bar
		TraceOpt.AssignNavigationClickEvents();

		TraceOpt.GenerateGreeting();
		TraceOpt.BrowserCompatibility();

		// Start Auth Channel and check integrity
		TraceOpt.Auth.Init();
		TraceOpt.Auth.Integrity();

		// Assign storage event
		//window.addEventListener("storage",function (a){
		//	console.log(a);
		//},false);

		// Get main page text and start update intervals
		TraceOpt.GetPremiumStatus();
		TraceOpt.GetMainPage();
		TraceOpt.homeRefresh = setInterval(function(){
			TraceOpt.GetMainPage();
			TraceOpt.GetPremiumStatus();
			TraceOpt.Stats.GetStatsData(function(d){
				TraceOpt.Stats.MakeData(d,TraceOpt.Stats.MakeGraph);
			});
		},5000);

		// Get status of settings
		TraceOpt.GetCurrentSettings();

		// Assign click events to settings table
		TraceOpt.AssignSettingClickEvents();
		$("#settings_straceadvanced, #settings_sbrowserfeature, #settings_stracesetting").hide();

		// Get statistics loaded and ready
		TraceOpt.Stats.StructureGraph();
		TraceOpt.Stats.GetStatsData(function(d){
			TraceOpt.Stats.MakeData(d,TraceOpt.Stats.MakeGraph);
		});

		// Assign click events to stats page
		TraceOpt.Stats.AssignGraphOptions();

		// Assign click events to advanced settings
		TraceOpt.Whitelist.DoInit(false);
		TraceOpt.Whitelist.init();
		TraceOpt.BadTopLevelBlock.AssignEvents();
		TraceOpt.URLCleaner.AssignEvents();

		TraceOpt.GenerateTip();
	},
	BrowserCompatibility:function(){
		if (/OPR/.test(navigator.userAgent)){
			$("#home .sect_cont").append(
				$("<div/>",{
					"class":"sect_adv"
				}).append(
					$("<div/>",{
						"class":"sect_adv_header"
					}).html("&nbsp;Developer Message"),
					$("<div/>",{
						"class":"sect_adv_cont"
					}).text("This is a beta version of Trace for Opera, feel free to report bugs to absolutedouble@gmail.com")
				)
			);
		}
		if (/Firefox/.test(navigator.userAgent)){
			$("body").css("font-size","0.75em");
			$("#home .sect_cont").append(
				$("<div/>",{
					"class":"sect_adv"
				}).append(
					$("<div/>",{
						"class":"sect_adv_header"
					}).html("&nbsp;Developer Message"),
					$("<div/>",{
						"class":"sect_adv_cont"
					}).text("This is a beta version of Trace for Firefox, feel free to report bugs to absolutedouble@gmail.com")
				)
			);
		}
	},
	FormatNumber:function(x) {
		if (!x) return "0";
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	},
	GenerateGreeting:function(){
		var greetings = [
			"Welcome to the Trace Dashboard!",
			"Trace Dashboard"
		];
		$("#trace_main_title").text(greetings[Math.floor(Math.random()*greetings.length)]);
	},
	GenerateTip:function(){
		var tips = [
			"In the 'Settings' section you can click any setting name to open a menu that tells you what it does.",
			"You can enable Domain Whitelisting under the 'Settings' section.",
			"Bad TLD Protection is a very effective way to block unknown tracking domains, enable it in the 'Extra' section.",
			"You can download all of your statistics data to csv, xml or json format to use externally.",
			"Hold down on the 'Settings' menu toggle to reset Trace's settings to default.",
			"Click the Trace icon in the top corner of your browser window to report a site to Trace's developer.",
			"A changelog and roadmap for Trace is available <a href='https://absolutedouble.co.uk/trace/information.html' title='Trace RoadMap/Changelog'>here</a>.",
			"To contact the Trace Developer check the 'Privacy' section for details.",
			"Many more features are coming to Trace soon! Find out more on the roadmap."
		];
		$("#user_tip").html(tips[Math.floor(Math.random()*tips.length)]);
	},
	GetMainPage:function(){
		chrome.extension.getBackgroundPage().Trace.s.MainText(function(i,t,d){
			var text = "<br />Trace has been protecting you since <span>" + i + "</span>";
			if (TraceOpt.FormatNumber(t["total"]).toString() !== "0"){
				text += ",<br />Since then, there have been a total of <span>" + TraceOpt.FormatNumber(t["total"]) + "</span>" +
				" requests blocked. That includes, <span>" + TraceOpt.FormatNumber(t["webpage"]) + "</span> page load" + (t["webpage"] === 1 ? "" : "s") + ", " +
				"<span>" + TraceOpt.FormatNumber(t["media"]) + "</span> media request" + (t["media"] === 1 ? "" : "s") + " (tracking pixels, page ads), also, Trace blocked " +
				"<span>" + TraceOpt.FormatNumber(t["code"]) + "</span> code request" + (t["code"] === 1 ? "" : "s") + " (3rd party scripts, ping requests), and finally " +
				"<span>" + TraceOpt.FormatNumber(t["other"]) + "</span> miscellaneous requests to tracking servers.";
			}

			if (d.length === 4){
				var totalBlocked = d[2][0] + d[2][1] + d[2][2] + d[2][3] + d[2][4];
				if (TraceOpt.FormatNumber(d[1]) === "0"){
					if (TraceOpt.FormatNumber(d[2]) !== "0"){
						text += "<br /><br />Trace is currently blocking <span>" + TraceOpt.FormatNumber(totalBlocked) + "</span> records.";
					}
				} else {
					if (TraceOpt.FormatNumber(d[2]) !== "0"){
						text += "<br /><br />Trace is currently blocking <span>" + TraceOpt.FormatNumber(totalBlocked) + "</span> records from the " + (d[3] === true ? "cached " : "uncached ") + d[0] + " blocklist. <br />";
						try{
							text += "The list contains: ";
							text += (d[2][0] !== 0 ? TraceOpt.FormatNumber(d[2][0]) + " domains, " : "");
							text += (d[2][1] !== 0 ? TraceOpt.FormatNumber(d[2][1]) + " hostnames, " : "");
							text += (d[2][2] !== 0 ? TraceOpt.FormatNumber(d[2][2]) + " TLDs, " : "");
							text += (d[2][3] !== 0 ? TraceOpt.FormatNumber(d[2][3]) + " URLs and " : "");
							text += (d[2][4] !== 0 ? TraceOpt.FormatNumber(d[2][4]) + " tracking scripts." : "");
						} catch(e){}
						text += "<br />WebController List Version: " + d[1] + ".";
					} else {
						text += "<br /><br />Domain blocking is enabled.";
					}
				}
			}
			$("#trace_info").html(text);
		});
	},
	AssignNavigationClickEvents:function(){
		$(".side_el").each(function(){
			$(this).on("click enter", function(){

				$(".view").addClass("hidden");

				var load = $(this).data("load");
				$("#" + load).removeClass("hidden");

				if (load === "extra"){
					if (typeof Storage !== "undefined" && localStorage !== null){
						if (localStorage["showAdvancedTutorial"] === "true"){
							TraceOpt.Tutorial.ShowAdvanced();
						}
					}
					document.title = "Trace | More Settings";
				} else if (load === "settings"){
					if (typeof Storage !== "undefined" && localStorage !== null){
						if (localStorage["showSettingsTutorial"] === "true"){
							TraceOpt.Tutorial.ShowSettings();
						}
					}
					document.title = "Trace | Settings";
				} else if (load === "statistics"){
					TraceOpt.Stats.GetStatsData(function(d){
						TraceOpt.Stats.MakeData(d,TraceOpt.Stats.MakeGraph);
					});
					document.title = "Trace | Statistics";
				} else if (load === "whitelist"){
					if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.enabled !== true){
						var rst = function(){
							TraceOpt.CloseOverlay();
							$(".view").addClass("hidden");
							$("#home").removeClass("hidden");
							document.title = "Trace";
						};

						$("#drop_message").empty().append(
							$("<h1/>").text("To continue, enable Domain Blocking"),
							$("<span/>").text("This setting requires Domain Blocking to be enabled, otherwise there is no point editing the whitelist..."),
							$("<br/>"),$("<br/>"),

							$("<button/>",{
								"title":"Enable Domain Blocking"
							}).text("Enable").click(function(){
								chrome.extension.getBackgroundPage().Trace.p.ToggleSetting("Pref_WebController",TraceOpt.GetCurrentSettings);

								TraceOpt.CloseOverlay();
								TraceOpt.GetCurrentSettings();
							}),
							$("<button/>",{
								"title":"Don't enable Domain Blocking"
							}).text("Cancel").click(function(){
								rst();
							})
						);

						$("#ux").addClass("blurred");
						$("#overlay_message").slideDown(300);
						$("#overlay_close").click(function() {
							rst();
						});
					}
					document.title = "Trace | Whitelist";
				} else if (load === "home"){
					TraceOpt.GetMainPage();
					TraceOpt.GetPremiumStatus();
					document.title = "Trace";
				} else if (load === "privacy"){
					document.title = "Trace | Privacy";
				}

			}).on("keypress",function(e) {

				if(e.which === 13) {
					$(this).trigger('enter');
				}

			}).longclick(750,function(e){

				var load = $(this).data("load");
				if (load === "settings"){
					if (confirm("Reset Trace settings to default? It will also remove your premium code from Trace's storage.")){
						chrome.extension.getBackgroundPage().Trace.p.SetDefaults(true,function(){
							window.location.reload();
						});
					}
				} else if (load === "advanced"){
					if (confirm("Toggle Debug Mode?")){
						chrome.extension.getBackgroundPage().Trace.p.ToggleSetting("Main_Trace.DebugApp",function(){
							window.location.reload();
						});
					}
				}

			});
		});
	},
	AssignSettingClickEvents:function(){
		// Settings category events
		$(".setting_title").each(function(){
			$(this).on("click enter", function(){
				var newTab = $(this).data("content");

				if (TraceOpt.currentSettingTab !== ""){
					$("#" + TraceOpt.currentSettingTab).hide().fadeOut(200);
				}
				if (TraceOpt.currentSettingTab !== newTab){
					$("#" + newTab).show().fadeIn(200);
					TraceOpt.currentSettingTab = newTab;
				} else {
					TraceOpt.currentSettingTab = "";
				}

			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});

		// Settings info events
		$(".setting_info").each(function(){
			$(this).on("click enter", function(){
				var isVis = $("#" + $(this).data("info")).is(":visible");
				$(".hiddensettinginfo").hide();
				if (isVis === false){
					$("#" + $(this).data("info")).show();
				}
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});

		// Settings toggle events
		$(".setting_toggle, .trace_toggle").each(function(){
			$(this).on("click enter", function(){
				chrome.extension.getBackgroundPage().Trace.p.ToggleSetting($(this).data("toggle"),TraceOpt.GetCurrentSettings);
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});

		// Settings configuration events
		$(".setting_config").each(function(){
			$(this).on("click enter", function(){
				TraceOpt.Config.Options($(this).data("config"));
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});

		// Special Setting Toggle events
		$(".isetting_toggle").each(function(){
			$(this).on("click enter", function(){
				var setting = $(this).data("toggle");

				if (setting === "Pref_TracePage"){
					if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_TracePage.enabled === true){
						if (!confirm("Disabling this will have an affect on other settings in Trace, are you sure you want to continue?")){
							return;
						}
					}
				}

				if (setting !== "Pref_TracePage" && chrome.extension.getBackgroundPage().Trace.p.Current.Pref_TracePage.enabled !== true){
					$("#drop_message").empty().append(
						$("<h1/>").text("To continue, enable TracePage"),
						$("<span/>").text("This setting requires TracePage to be enabled."),
						$("<br/>"),$("<br/>"),

						$("<button/>",{
							"title":"Enable TracePage"
						}).text("Enable").click(function(){
							chrome.extension.getBackgroundPage().Trace.p.ToggleSetting("Pref_TracePage",TraceOpt.GetCurrentSettings);
							chrome.extension.getBackgroundPage().Trace.p.ToggleSetting(setting,TraceOpt.GetCurrentSettings);

							TraceOpt.CloseOverlay();
							TraceOpt.GetCurrentSettings();
						}),
						$("<button/>",{
							"title":"Don't enable TracePage"
						}).text("Cancel").click(TraceOpt.CloseOverlay)
					);
					TraceOpt.AssignCloseOverlay();
				} else {
					chrome.extension.getBackgroundPage().Trace.p.ToggleSetting(setting,TraceOpt.GetCurrentSettings);
				}
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});

		// Direct toggle events
		$(".direct_toggle").each(function(){
			$(this).on("click enter", function(){
				var name = $(this).data("toggle");
				TraceOpt.DirectSetting(this,name,true);
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		});
	},
	GetCurrentSettings:function(){
		// Get current settings
		var settingsList = chrome.extension.getBackgroundPage().Trace.p.Current;

		// Get current settings
		$(".setting_toggle").each(function(){
			var status = $(this).data("toggle"), e = false;

			if (status.includes(".")){
				var a = status.split(".");
				e = settingsList[a[0]][a[1]].enabled;
			} else {
				e = settingsList[status].enabled;
			}
			$(this).text((e === true ? "Enabled" : "Disabled"));
		});
		$(".isetting_toggle").each(function(){
			var status = $(this).data("toggle"), enabled = false;
			if (status.includes(".")){
				var a = status.split(".");
				enabled = settingsList[a[0]][a[1]].enabled;
			} else {
				enabled = settingsList[status].enabled;
			}
			$(this).text((enabled === true ? "Enabled" : "Disabled"));
		});
		$(".direct_toggle").each(function(){
			var status = $(this).data("toggle");
			TraceOpt.DirectSetting(this,status,false);
		});
		$(".trace_toggle").each(function(){
			var status = $(this).data("toggle"), enabled = false;
			if (status.includes(".")){
				var a = status.split(".");
				enabled = settingsList[a[0]][a[1]].enabled;
			} else {
				enabled = settingsList[status].enabled;
			}
			$(this).text((enabled === true ? "Enabled" : "Disabled"));
		});
	},
	UpdateBlocklist:function(){
		if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.enabled !== true){
			chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.enabled = true;
		}
		chrome.extension.getBackgroundPage().Trace.b.BlocklistLoader(true);
		$(this).text("Working...");
	},
	GetPremiumStatus:function(){
		var code = chrome.extension.getBackgroundPage().Trace.v.Premium;
		if (typeof(code) !== "string" || code === ""){
			$("#premium_status").empty().append(
				$("<span/>",{
					id:"premium_inner"
				}).text("Get access to the premium blocklist which contains over 15,000 domains, whilst also supporting the development of Trace."),
				$("<br/>"),$("<br/>"),
				$("<button/>",{
					id:"premium_code_trigger"
				}).click(TraceOpt.EnterPremiumCode).text("Enter Code"),
				$("<span/>").text(" "),
				$("<button/>",{
					id:"premium_code_get"
				}).click(function(){
					var win = window.open("https://absolutedouble.co.uk/trace/premium.html", "_blank");
					if (win !== null) win.focus();
				}).text("Get Premium Code"),
				$("<span/>").text(" "),
				$("<button/>",{
					id:"premium_visit_site"
				}).click(function(){
					var win = window.open("https://absolutedouble.co.uk/trace/", "_blank");
					if (win !== null) win.focus();
				}).text("Website")
			);
		} else {
			$("#premium_status").empty().append(
				$("<span/>").text("Thank you for supporting Trace!"),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("Disable Premium").click(TraceOpt.RemovePremium),
				$("<span/>").text(" "),
				$("<button/>").text(
					(chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.enabled === true ? "Force Blocklist Update" : "Enable Domain Blocking")
				).click(TraceOpt.UpdateBlocklist),
				$("<span/>").text(" "),
				$("<button/>",{
					id:"premium_visit_site"
				}).click(function(){
					var win = window.open("https://absolutedouble.co.uk/trace/", "_blank");
					if (win !== null) win.focus();
				}).text("Website")
			);
		}
	},
	RemovePremium:function(){
		if (confirm("Are you sure you wish to remove your premium code from Trace?\nThis will not delete your code from our servers.\n\nYour code:\n" + chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.PremiumCode)){
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Main_Trace.PremiumCode","");
			chrome.extension.getBackgroundPage().Trace.b.ClearDomainCache();

			$("#premium_inner").empty().html("<h1>Please wait...</h1>");

			setTimeout(TraceOpt.GetMainPage,500);
			setTimeout(TraceOpt.GetPremiumStatus,1500);
		}
	},
	EnterPremiumCode:function(){
		var dto = new Date();
		if (typeof Storage !== "undefined" && typeof localStorage !== "undefined"){
			var attn = 0;
			var ntme = Math.round(dto.getTime()/1000);

			if (typeof localStorage.getItem("attn") === "string" && typeof localStorage.getItem("atme") === "string"){
				attn = parseInt(localStorage.getItem("attn"));
				atme = parseInt(localStorage.getItem("atme"));

				attn++;
			}

			localStorage.setItem("attn",attn);
			localStorage.setItem("atme",ntme);
		} else {
			alert("Nice try.");
			return;
		}

		var uTimeOut = function(t){
			$("#drop_message").empty().append(
				$("<h1/>").text("Trace Premium"),
				$("<h2/>").text("Please wait " + t + " minutes to try again." + (t === "10" ? " Might want to make a cup of tea to pass the time." : "")),
				$("<span/>").text("The timer resets every time you re-enter this popup, wait " + t + " minutes before trying again."),$("<br />"),$("<br />"),
				$("<button/>",{"title":"I need help"}).text("Help").click(TraceOpt.PremiumHelp),
				$("<button/>",{"title":"Close"}).text("Close").click(TraceOpt.CloseOverlay)
			);
			TraceOpt.AssignCloseOverlay();
		};

		if (attn > 12){
			if (ntme-atme < 600){
				uTimeOut("10",attn);
				return;
			}
		} else if (attn > 4){
			if (ntme-atme < 180){
				uTimeOut("5",attn);
				return;
			}
		}

		$("#drop_message").empty().append(
			$("<h1/>").text("Trace Premium"),
			$("<h2/>").text("Thanks for supporting Trace!"),
			$("<input/>",{
				"placeholder":"Premium Code",
				"id":"premium_code_box",
				"class":"text_box boxmod_large"
			}),
			$("<br />"),$("<br />"),
			$("<button/>",{
				"title":"Activate premium code"
			}).text("Activate").click(TraceOpt.Scribble),
			$("<button/>",{
				"title":"I need help"
			}).text("Help").click(TraceOpt.PremiumHelp),
			$("<button/>",{
				"title":"Close"
			}).text("Close").click(TraceOpt.CloseOverlay)
		);
		TraceOpt.AssignCloseOverlay();
	},
	PremiumHelp:function(){
		$("#drop_message").empty().append(
			$("<h1/>").text("Trace Premium Help"),
			$("<h2/>").text("If you don't find what you're looking for here, please email me"),
			$("<div/>",{"class":"textscrollable"}).append(
				$("<ul/>").append(
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("I have a code but it doesn't work"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("Please allow 24-hours for the code to activate, I review all the codes manually so it can take a few hours.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("I've paid for premium but don't have a code"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("You should've filled out a form at the end of the process, if you didn't, please email me and I will sort it out for you as soon as possible.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("My code has been activated, but it isn't working"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("Check it again. Codes are case sensitive, make sure there are no spaces in the code, if you still have issues, please email me and I'll sort it for you.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("It's been more than 24 hours and my code still isn't activated"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("Send me and email and I will activate your code immediately, I'm very sorry for the delay.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("I've lost my code"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("That's okay, I lose things all the time too, just send me an email and I'll send you it.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("Trace is telling me to wait before I enter my code"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("Wait 10 minutes and try again then, I had to add in limits because somebody tried entering about 500 codes which just wasted server bandwidth. Sorry about that.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("I would like a new code"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("That's okay, I can regenerate codes easily, just send me an email, I'll deactivate the current code and give you a new one.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("How many times can I use my code?"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("You can use it on as many installations as you want, please do not share your code online though, if I see that a code is shared online I will email you a new one and deactivate the old one.")
					),
					$("<li/>").append(
						$("<span/>",{"class":"premhelp_q"}).text("Is Trace Premium a one time purchase?"),$("<br />"),
						$("<span/>",{"class":"premhelp_a"}).text("It is, if I do ever decide to make it a subscription then all current premium codes will continue to work as they do at the moment.")
					)
				)
			),
			$("<button/>",{
				"title":"Close"
			}).text("Close").click(TraceOpt.CloseOverlay)
		);
		TraceOpt.AssignCloseOverlay();
	},
	Scribble:function(){
		if ($("#premium_code_box") === null){
			return;
		}

		TraceOpt.CloseOverlay();

		var pt = $("#premium_inner");
		var eden = $("#premium_code_box").val();
		var emsg = "Sorry, that premium code didn't work. If you are having issues, please don't hesitate to contact me.";

		if (eden.length < 5){
			pt.text("Invalid code.");
		}

		chrome.extension.getBackgroundPage()._UserCrashReportService({"PremiumTrace":"TryCode","CodeAttempt":eden},true);

		var u = "https://absolutedouble.co.uk/trace/app/weblist.php?p=";
		u += btoa(eden);
		u += "&s=" + btoa(TraceOpt.s);
		u += "&d=" + btoa((Math.round((new Date()).getTime()/1000))*2);
		u += "&j=M";
		u += "&a=premium_x";
		u += "&c=" + TraceOpt.makeRandomID(5);

		$.ajax({
			url:u,
			cache:false,
			method:"GET",
			timeout:27000,
			beforeSend:function(){
				pt.text("Checking code...");
			},
			success:function(l){
				if (l === TraceOpt.s){
					pt.text("Applying Code...");
					chrome.extension.getBackgroundPage().Trace.p.SetSetting("Main_Trace.PremiumCode",eden);
					chrome.extension.getBackgroundPage()._UserCrashReportService({"PremiumTrace":"AcceptedCode","CodeUsed":eden},true);
					localStorage.removeItem("attn");
					localStorage.removeItem("atme");

					if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.enabled === true){
						pt.text("Please wait... Initialising Premium :)");
						chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.installCodes.a00000001",true);
						chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.installCodes.a00000003",true);
						chrome.extension.getBackgroundPage().Trace.b.BlocklistLoader(true);
						setTimeout(TraceOpt.GetMainPage,750);
						setTimeout(TraceOpt.GetPremiumStatus,3000);
					} else {
						pt.text("Premium blocklist will be used when domain blocking is enabled in setttings.");
					}
				} else {
					chrome.extension.getBackgroundPage().Trace.Notify(emsg,"optd");
					pt.text(emsg);
				}
			},
			error:function(e){
				if (e.status === 403 || e.status === 402){
					chrome.extension.getBackgroundPage().Trace.Notify(emsg,"optd");
					pt.text(emsg);
					return;
				}
				chrome.extension.getBackgroundPage().Trace.Notify("Server communication error!","optd");
				pt.text("Error contacting server: " + e.status);
			}
		});
	},
	DirectSetting:function(obj,name,change){
		// This very large function handles the privacy settings directly in the browser (Privacy API)
		if (!chrome.privacy) {
			$("#settings_sbrowserfeature").empty().append(
				$("<tr/>").append(
					$("<td/>",{
						"colspan":"3"
					}).text("Your browser doesn't yet support these settings")
				)
			);
			return;
		}

		switch (name){
			case "pref_netpredict":
				if (typeof chrome.privacy.network.networkPredictionEnabled === "undefined") {
					$("#row_netpredict").hide();
					return;
				}

				chrome.privacy.network.networkPredictionEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.network.networkPredictionEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			case "pref_alterrpage":
				if (typeof chrome.privacy.services.alternateErrorPagesEnabled === "undefined" || !chrome.privacy.services.alternateErrorPagesEnabled) {
					$("#row_alterrpage").hide();
					return;
				}

				chrome.privacy.services.alternateErrorPagesEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.alternateErrorPagesEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			case "pref_autofill":
				if (typeof chrome.privacy.services.autofillEnabled === "undefined" || !chrome.privacy.services.autofillEnabled) {
					$("#row_autofill").hide();
					return;
				}

				chrome.privacy.services.autofillEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.autofillEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			case "pref_sbextendedrep":
				if (typeof chrome.privacy.services.safeBrowsingExtendedReportingEnabled === "undefined") {
					$("#row_sbextendedrep").hide();
					return;
				}

				chrome.privacy.services.safeBrowsingExtendedReportingEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.safeBrowsingExtendedReportingEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			case "pref_hyperlinkaudit":
				if (typeof chrome.privacy.websites.hyperlinkAuditingEnabled === "undefined") {
					$("#row_hyperlinkaudit").hide();
					return;
				}

				chrome.privacy.websites.hyperlinkAuditingEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.websites.hyperlinkAuditingEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
								console.log(chrome.runtime.lastError);
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			case "pref_referheader":
				if (typeof chrome.privacy.websites.referrersEnabled === "undefined") {
					$("#row_referheader").hide();
					return;
				}

				chrome.privacy.websites.referrersEnabled.get({},function(details){
					$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.websites.referrersEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert("Error changing setting.");
							});
						} else {
							alert("This extension cannot modify that chrome setting\n\n"+details.levelOfControl);
						}
					} else {
						$(obj).text((details.value === true ? "Unprotected" : "Protected"));
					}
				});
				break;
			default:
				alert("Unknown setting.."+name);
				break;
		}
	},
	Config:{
		SelectedOption:"",
		CurrentSettings:{},
		SettingName:{
			audioBuffer:"Disable Audio Channel Functions (e.g. copyFromChannel)",
			audioData:"Disable Audio Data Functions (e.g. getFloatFrequencyData)",
			audioOfflineMain:"Disable Offline AudioContext Object (More commonly used for Tracking)",
			audioMain:"Disable Main AudioContext Object (Breaks lots of websites)",

			rmChromeConnected:"Remove X-Chrome-Connected headers from web requests",
			rmChromeUMA:"Remove X-Chrome-UMA-Enabled headers from web requests",
			rmChromeVariations:"Remove X-Chrome-Variations headers from web requests",
			rmClientData:"Remove X-Client-Data headers from web requests (Will break most Google websites)",

			pingRequest:"Block 'ping' requests in the browser (Recommended)",
			sendBeacon:"Disable the javascript navigator.sendBeacon function on webpages",

			javascript:"Something went wrong if you're seeing this.",
			wrtcInternal:"Stop WebRTC exposing your local IPv4 address",
			wrtcPeerConnection:"Disable the RTCPeerConnection javascript object",
			wrtcDataChannel:"Disable the RTCDataChannel javascript object",
			wrtcRtpReceiver:"Disable the RTCRtpReceiver javascript object"
		},
		Options:function(setting){
			TraceOpt.Config.SelectedOption = setting;
			TraceOpt.Config.CurrentSettings = chrome.extension.getBackgroundPage().Trace.p.Current;

			if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].enabled !== true){
				$("#drop_message").empty().append(
					$("<h1/>").text("Settings"),
					$("<h2/>").text("To edit the configuration enable the setting first.")
				);
				TraceOpt.AssignCloseOverlay();
				return;
			}

			switch(setting){
				case "Pref_AudioFingerprint":
					TraceOpt.Config.s.AudioSettings();
					break;
				case "Pref_GoogleHeader":
					TraceOpt.Config.s.ChromeHeaderSettings();
					break;
				case "Pref_WebRTC":
					TraceOpt.Config.s.WebRTCSettings();
					break;
				case "Pref_PingBlock":
					TraceOpt.Config.s.PingBlockSettings();
					break;
				case "Pref_ScreenRes":
					TraceOpt.ScreenRes.OpenDialog();
					break;
				case "Pref_UserAgent":
					TraceOpt.UserAgent.OpenDialog();
					break;
				case "Pref_IPSpoof":
					TraceOpt.PIPSpoof.OpenDialog();
					break;
				case "Pref_WebController":
					TraceOpt.Blocklist.OpenDialog();
					break;
				case "Main_Interface":
					TraceOpt.UserInterfaceCustomiser.OptionsInterface();
					break;
				default:
					console.error("Method not supported yet.");
					break;
			}
		},
		SaveConf:function(a){
			if (!a) a = this;

			var s = $(a).data("conf"), v = false;
			if ($(a).is(":checked")){
				v = true;
			}
			chrome.extension.getBackgroundPage().Trace.p.SetSetting(s,v);
		},
		GetConf:function(){
			var el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":TraceOpt.Config.SelectedOption
			}).append(
				$("<span/>").text("When the switch is green, the protection is enabled."),$("<br />"),$("<br />")
			);

			for (var i in TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]){
				if (i !== "enabled" && TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i] !== undefined){
					if (Object.keys(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i]).length > 1){
						continue;
					}

					opts = {
						"type":"checkbox",
						"id":"c_opt_"+TraceOpt.makeRandomID(16),
						"data-conf":TraceOpt.Config.SelectedOption + "." + i + ".enabled"
					};
					if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i].enabled === true){
						opts["checked"] = "checked";
					}

					el.append(
						$("<div/>",{
							"class":"setting_conf_opt"
						}).append(
							$("<label/>",{
								"for":opts["id"],
								"class":"checkbox_cont"
							}).text(TraceOpt.Config.SettingName[i] || i).append(
								$("<input/>",opts).on("click enter",function(){
									TraceOpt.Config.SaveConf(this);
								}),
								$("<span/>",{"class":"ccheck"})
							)
						)
					);
				}
			}

			el.append(
				$("<span/>",{"class":"regular"}).text("Changes to these settings should take place immediately")
			);

			return el;
		},
		s:{
			AudioSettings:function(){
				var cont = TraceOpt.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text("Audio Fingerprint Protection"),
					cont,
					$("<button/>",{"class":"float_r"}).text("Close").click(TraceOpt.CloseOverlay),
					$("<br/>"),$("<br/>")
				);
				TraceOpt.AssignCloseOverlay();
			},
			ChromeHeaderSettings:function(){
				var cont = TraceOpt.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text("Google Header Protection"),
					cont,
					$("<button/>",{"class":"float_r"}).text("Close").click(TraceOpt.CloseOverlay),
					$("<br/>"),$("<br/>")
				);
				TraceOpt.AssignCloseOverlay();
			},
			PingBlockSettings:function(){
				var cont = TraceOpt.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text("Browser Ping Protection"),
					cont,
					$("<br/>"),
					$("<span/>").text("If you're looking for Hyperlink Auditing protection then you can find it under 'Browser Settings'"),
					$("<button/>",{"class":"float_r"}).text("Close").click(TraceOpt.CloseOverlay),
					$("<br/>"),$("<br/>")
				);
				TraceOpt.AssignCloseOverlay();
			},
			WebRTCSettings:function(){
				var cont = TraceOpt.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text("WebRTC Protection"),
					cont,
					$("<br/>"),
					$("<span/>").text("WebRTC is used for applications such as video calling. Disabling javascript objects will most likely break lots of websites that rely on WebRTC."),$("<br/>"),
					$("<button/>",{"class":"float_r"}).text("Close").click(TraceOpt.CloseOverlay),
					$("<br/>"),$("<br/>")
				);
				TraceOpt.AssignCloseOverlay();
			}
		}
	},
	PIPSpoof:{
		IPSaveTimeout:null,
		ViaSaveTimeout:null,
		StringNames:{
			"useClientIP":"Use Client IP Header",
			"useForwardedFor":"Use X-Forwarded-For Header",
			"traceVia":"Use Regular Via Header",
			"traceIP":"Use a random IP (Will change every minute)"
		},
		ValidIP:function(ip){
			return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
		},
		UpdateIPText:function(){
			$("#pipspoof_currentip").html("<strong>Current IP:</strong> " + chrome.extension.getBackgroundPage().Trace.i.CurrentFakeIP || "No IP Set");
		},
		UserCustomIP:function(){
			var elID = this.id;
			var potential = $(this).val();

			var valid = TraceOpt.PIPSpoof.ValidIP(potential);
			if (potential.length < 7 || !valid){
				$(this).css({
					"background":"#ffa3a3",
					"color":"#fff"
				});
				return;
			} else {
				$(this).css({
					"background":"#ffc774",
					"color":"#fff"
				});
				if (TraceOpt.PIPSpoof.IPSaveTimeout) clearTimeout(TraceOpt.PIPSpoof.IPSaveTimeout);

				TraceOpt.PIPSpoof.IPSaveTimeout = setTimeout(function(){
					chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_IPSpoof.traceIP.user_set",potential);
					$("#" + elID).css({
						"background":"#70ff71",
						"color":"#fff"
					});
					TraceOpt.PIPSpoof.UpdateIPText();
				},900);
			}
		},
		UserCustomVia:function(){
			var elID = this.id;
			var potential = $(this).val();
			if (potential.length < 2 || potential.length > 100){
				$(this).css({
					"background":"#ffa3a3",
					"color":"#fff"
				});
				return;
			} else {
				$(this).css({
					"background":"#ffc774",
					"color":"#fff"
				});
				if (TraceOpt.PIPSpoof.ViaSaveTimeout) clearTimeout(TraceOpt.PIPSpoof.ViaSaveTimeout);

				TraceOpt.PIPSpoof.ViaSaveTimeout = setTimeout(function(){
					chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_IPSpoof.traceVia.value",potential);
					$("#" + elID).css({
						"background":"#70ff71",
						"color":"#fff"
					});
				},900);
			}
		},
		OpenDialog:function(){
			var el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":TraceOpt.Config.SelectedOption
			});

			el.append(
				$("<span/>",{
					"id":"pipspoof_currentip"
				}).text("Retrieving IP..."),$("<br/>")
			);

			var configOpts = ["useClientIP","useForwardedFor","traceVia","traceIP"];
			for (var i = 0, l = configOpts.length;i<l;i++){
				opts = {
					"type":"checkbox",
					"id":"c_opt_"+TraceOpt.makeRandomID(16),
					"data-conf":TraceOpt.Config.SelectedOption + "." + configOpts[i] + ".enabled",
					"data-special":configOpts[i]
				};
				if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][configOpts[i]].enabled === true){
					opts["checked"] = "checked";
				}

				el.append(
					$("<div/>",{
						"class":"setting_conf_opt"
					}).append(
						$("<label/>",{
							"for":opts["id"],
							"class":"checkbox_cont"
						}).text(TraceOpt.PIPSpoof.StringNames[configOpts[i]] || configOpts[i]).append(
							$("<input/>",opts).on("click enter",function(){
								TraceOpt.Config.SaveConf(this);

								var s = $(this).data("special");
								if (s === "traceVia"){
									if ($(this).is(":checked")){
										$("#pip_custvia").hide();
									} else {
										$("#pip_custvia").show();
									}
								} else if (s === "traceIP"){
									if ($(this).is(":checked")){
										$("#pip_custip").hide();
									} else {
										$("#pip_custip").show();
									}
									TraceOpt.PIPSpoof.UpdateIPText();
								}
							}),
							$("<span/>",{"class":"ccheck"})
						)
					)
				);
			}

			el.append(
				$("<input/>",{
					"type":"text",
					"id":"pip_custip",
					"placeholder":"Custom IP address",
					"style":(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]["traceIP"].enabled ? "display:none" : ""),
					"value":(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]["traceIP"].user_set)
				}).on("keyup enter",TraceOpt.PIPSpoof.UserCustomIP),
				$("<input/>",{
					"type":"text",
					"id":"pip_custvia",
					"placeholder":"Custom Via Header",
					"style":(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]["traceVia"].enabled ? "display:none" : ""),
					"value":(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]["traceVia"].value)
				}).on("keyup enter",TraceOpt.PIPSpoof.UserCustomVia)
			);

			el.append(
				$("<br/>"),
				$("<a/>",{
					"href":"https://www.whatismyip.com/",
					"title":"Check IP here"
				}).text("This will trick some websites, like this one")
			);

			$("#drop_message").empty().append($("<h1/>").text("Configure Proxy IP Header Spoofing"),el);
			TraceOpt.PIPSpoof.UpdateIPText();
			TraceOpt.IPTextRefresh = setInterval(TraceOpt.PIPSpoof.UpdateIPText,2500);

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);
			$("#overlay_close").unbind("click").click(function(){
				clearInterval(TraceOpt.IPTextRefresh);
				TraceOpt.CloseOverlay();
			});
			$(window).unbind("click").click(function(e){
				if ($(e.target)[0].id === "overlay_message"){
					clearInterval(TraceOpt.IPTextRefresh);
					TraceOpt.CloseOverlay();
				}
			});
		}
	},
	Stats:{
		GraphData:undefined,
		GraphElm:undefined,
		GraphObj:undefined,
		AssignGraphOptions:function(){
			$("#stats_download").click(function(){
				TraceOpt.Stats.ShowDownloadOptions();
			});
			$("#stats_wipe").click(function(){
				TraceOpt.Stats.DeleteStats();
			});
			$("#graph_datacontrol, #graph_contbreakdown").change(function(){
				TraceOpt.Stats.MakeData(TraceOpt.Stats.GraphData,TraceOpt.Stats.MakeGraph)
			});
		},
		GetStatsData:function(cb){
			chrome.extension.getBackgroundPage().Trace.s.Data(function(d){
				TraceOpt.Stats.GraphData = d;
				if (cb){
					cb(d);
				}
			});
		},
		GraphColors:function(req){
			var list = [
				'rgba(255,99,132,',
				'rgba(54,162,235,',
				'rgba(255,206,86,',
				'rgba(75,192,192,',
				'rgba(153,102,255,',
				'rgba(153,102,104,',
				'rgba(255,159,64,'
			];
			if (req !== "rand"){
				var bar = [], border = [];
				for (var i = 0;i<req;i++){
					bar[i] = list[i] + "0.4)";
					border[i] = list[i] + "1)";
				}
				return [bar,border];
			} else {
				var chose = list[Math.floor(Math.random() * list.length)];
				var bar = chose + "0.4)", border = chose + "1)";
				return [bar,border];
			}
		},
		MakeData:function(dataset,cb){
			var dControl = parseInt($("#graph_datacontrol").val());
			var cBreakDown = $("#graph_contbreakdown").val();

			var rData = {};
			var dLen = Object.keys(dataset).length;

			if (dLen === 0){
				$("#graph_controls").hide();
				if (chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.ProtectionStats.enabled === true){
					$("#graph_container").html("Statistics are enabled, but there is no data available yet.<br /><br />Try browsing the web a bit and then check back here!<br />").css("height","auto");
				} else {
					TraceOpt.Stats.ShowDisabled(dLen);
				}
				return;
			} else {
				if (chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.ProtectionStats.enabled === false){
					$("#graph_controls").hide();
					TraceOpt.Stats.ShowDisabled(dLen);
				}
			}

			if (dControl === 1){
				var today = dataset[Object.keys(dataset)[Object.keys(dataset).length-1]];
				if (cBreakDown === "type"){
					var colors = TraceOpt.Stats.GraphColors(4);
					rData["title"] = "Today's statistics by type";
					rData["labels"] = ["Content","Media","Code","Other"];
					rData["data"] = [{
						data:[today.webpage,today.media,today.code,today.other],
						backgroundColor:colors[0],
						borderColor:colors[1],
						borderWidth:1
					}];
				} else {
					var colors = TraceOpt.Stats.GraphColors("rand");
					rData["title"] = "Today's total statistics";
					rData["labels"] = ["Total requests blocked"];
					rData["data"] = [{
						data:[today.webpage+today.media+today.code+today.other],
						backgroundColor:[colors[0]],
						borderColor:[colors[1]],
						borderWidth:1
					}];
				}
			} else {
				if (Object.keys(dataset).length < parseInt(dControl)){
					dControl = Object.keys(dataset).length;
				}
				var keys = Object.keys(dataset).slice(Math.max(Object.keys(dataset).length-dControl));
				var vals = Object.values(dataset).slice(Math.max(Object.values(dataset).length-dControl));

				if (cBreakDown === "type"){
					rData["title"] = "Request types blocked in the past " + dControl + " days";
					rData["labels"] = ["Content","Media","Code","Other"];
					rData["data"] = [];

					var colors = TraceOpt.Stats.GraphColors(4);
					for(var i = 0;i < dControl;i++){
						rData["data"].push({
							label:keys[i],
							data:[vals[i].webpage,vals[i].media,vals[i].code,vals[i].other],
							backgroundColor:colors[0],
							borderColor:colors[1],
							borderWidth:1
						});
					}
				} else {
					var colors = TraceOpt.Stats.GraphColors(dControl);
					rData["title"] = "Total requests blocked in the past " + dControl + " days";
					rData["labels"] = [];
					rData["data"] = [{
						backgroundColor:colors[0],
						borderColor:colors[1],
						borderWidth:1,
						data:[]
					}];

					if (dControl >= 5){
						TraceOpt.Stats.GraphObj.options.barValueSpacing = 20;
					}

					for(var i = 0;i < dControl;i++){
						rData["labels"].push(keys[i]);
						rData["data"][0].data.push(vals[i].webpage+vals[i].media+vals[i].code+vals[i].other);
					}
				}

			}

			cb(rData);
		},
		MakeGraph:function(d){
			if (d !== undefined){
				TraceOpt.Stats.GraphObj.data.datasets = d["data"];
				TraceOpt.Stats.GraphObj.data.labels = d["labels"];
				TraceOpt.Stats.GraphObj.options.title.text = d["title"];
				TraceOpt.Stats.GraphObj.update(0);
			}
		},
		StructureGraph:function(){
			if (typeof TraceOpt.Stats.GraphElm === "undefined"){
				TraceOpt.Stats.GraphElm = document.getElementById("graph").getContext("2d");
			}
			Chart.defaults.global.defaultFontColor = "#fff";
			TraceOpt.Stats.GraphObj = new Chart(TraceOpt.Stats.GraphElm, {
				type:'bar',
				data:{
					labels:[],
					datasets:{}
				},
				options:{
					barValueSpacing:10,
					title:{
						display:true,
						fontSize:28,
						text:"Loading..."
					},
					legend: {
						display: false
					},
					scales:{
						yAxes:[{
							ticks:{
								beginAtZero:true,
								fontSize:20
							},
							gridLines: {
								display:true,
								color:"#969696"
							}
						}],
						xAxes:[{
							ticks:{
								beginAtZero:true,
								fontSize:20
							},
							gridLines: {
								display:false,
								color:"#FFFFFF"
							}
						}]
					}
				}
			});
		},
		ShowDisabled:function(l){
			$("#graph_container").html("Enable Protection Statistics to use this feature.<br /><br />").append(
				$("<button/>").text("Enable").click(function(){
					$("#setting_protstats").click();
					$(this).text("Please wait...");

					if (l !== 0){
						window.location.reload();
					}

					setTimeout(function(){
						TraceOpt.Stats.GetStatsData(function(d){
							TraceOpt.Stats.MakeData(d,TraceOpt.Stats.MakeGraph);
						});
					},1500);
				})
			).css("height","auto");
		},
		ShowDownloadOptions:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Download Statistics"),
				$("<h3/>",{"class":"bold"}).text("Choose a file format to download the statistics."),
				$("<button/>",{
					"title":"Download Statistics in CSV format"
				}).text("CSV").click(function(){TraceOpt.Stats.DownloadStats("csv");}),
				$("<span/>").text(" "),
				$("<button/>",{
					"title":"Download Statistics in XML format"
				}).text("XML").click(function(){TraceOpt.Stats.DownloadStats("xml");}),
				$("<span/>").text(" "),
				$("<button/>",{
					"title":"Download Statistics in JSON format"
				}).text("JSON").click(function(){TraceOpt.Stats.DownloadStats("json");}),
				$("<br/>"),$("<br/>"),
				$("<button/>",{
					"title":"Close"
				}).text("Close").click(TraceOpt.CloseOverlay)
			);
			TraceOpt.AssignCloseOverlay();
		},
		DownloadStats:function(file){
			if (typeof file !== "string"){
				var file = "csv";
			}
			var date;

			chrome.extension.getBackgroundPage().Trace.s.Data(function(d){
				if (file === "csv"){

					var returnd = 'Date,Web,Media,Code,Other,Total';

					for (var i = 0, l = Object.keys(d).length;i<l;i++){
						currentd = Object.keys(d)[i];
						obj = d[currentd];
						returnd += "\n" + currentd +
							',' + obj.webpage +
							',' + obj.media +
							',' + obj.code +
							',' + obj.other +
							',' + (obj.webpage + obj.media + obj.code + obj.other);
					}

					TraceOpt.Stats.CreateDownload(returnd,file);

				} else if (file === "xml"){

					date = TraceOpt.theDate();
					var returnd = '<?xml version="1.0" encoding="UTF-8"?>\n';
					returnd += "<tracestats downloaded='" + (date[0] + "-" + date[1] + "-" + date[2]).toString() + "'>";

					for (var i = 0, l = Object.keys(d).length;i<l;i++){
						currentd = Object.keys(d)[i];
						obj = d[currentd];
						returnd += "\n\t<stats date='" + currentd + "'>" +
							'\n\t\t<webpages>' + obj.webpage + '</webpages>' +
							'\n\t\t<media>' + obj.media + '</media>' +
							'\n\t\t<code>' + obj.code + '</code>' +
							'\n\t\t<other>' + obj.other + '</other>' +
							'\n\t\t<total>' + (obj.webpage + obj.media + obj.code + obj.other) + '</total>' +
							'\n\t</stats>';
					}

					returnd += '\n</tracestats>';

					TraceOpt.Stats.CreateDownload(returnd,file);

				} else if (file === "json") {

					date = TraceOpt.theDate();
					var stats = {
						"downloaded":(date[0] + "-" + date[1] + "-" + date[2]).toString(),
						"stats":d
					};

					TraceOpt.Stats.CreateDownload(JSON.stringify(stats),file);

				} else {
					console.info("Cannot export this file format");
				}
			});
		},
		CreateDownload:function(data,filetype){
			// File information
			var a = document.createElement("a"),
				file = new Blob([data], {type: "text/" + filetype});
			var url = URL.createObjectURL(file);

			// Generate file date
			var d = TraceOpt.theDate();
			var filedate = (d[0] + "_" + d[1] + "_" + d[2]).toString();

			// Download file
			a.href = url;
			a.download = "Trace-Statistics-" + filedate + "." + filetype;
			document.body.appendChild(a);
			a.click();

			// Remove link
			setTimeout(function() {
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			},0);
		},
		DeleteStats:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Delete statistics"),
				$("<h3/>",{"class":"bold"}).text("This will delete all saved statistics, but will not delete the information on the main page."),
				$("<select/>",{id:"stats_del_amount"}).append(
					$("<option/>",{value:0}).text("Keep today's statistics"),
					$("<option/>",{value:1}).text("Keep statistics for the past 2 days"),
					$("<option/>",{value:2}).text("Keep statistics for the past 3 days"),
					$("<option/>",{value:3}).text("Keep statistics for the past 4 days"),
					$("<option/>",{value:4}).text("Keep statistics for the past 5 days"),
					$("<option/>",{value:5}).text("Keep statistics for the past 6 days"),
					$("<option/>",{value:6}).text("Keep statistics for the past week"),
					$("<option/>",{value:7}).text("Delete all statistics")
				),
				$("<br/>"),$("<br/>"),
				$("<button/>",{
					"title":"Confirm deletion"
				}).text("Confirm").click(TraceOpt.Stats.ConfirmDeleteStats),
				$("<button/>",{
					"title":"Close"
				}).text("Cancel").click(TraceOpt.CloseOverlay)
			);
			TraceOpt.AssignCloseOverlay();
		},
		ConfirmDeleteStats:function(x){
			var a = $("#stats_del_amount").val();

			var cb = function(){
				$("#overlay_message").slideUp(250);
				TraceOpt.Stats.GetStatsData(function(d){
					TraceOpt.Stats.MakeData(d,TraceOpt.Stats.MakeGraph);
					$("#ux").removeClass("blurred");
				});
			};

			if (a === "7"){
				chrome.extension.getBackgroundPage().Trace.s.DeleteAll(cb);
			} else {
				if (a === "0") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(1,cb);
				if (a === "1") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(2,cb);
				if (a === "2") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(3,cb);
				if (a === "3") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(4,cb);
				if (a === "4") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(5,cb);
				if (a === "5") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(6,cb);
				if (a === "6") chrome.extension.getBackgroundPage().Trace.s.DeleteAmount(7,cb);
			}
		}
	},
	UserAgent:{
		StringNames:{
			uaOSConfig:"Operating Systems",
			uaWBConfig:"Web Browsers",
			AllowLinux:"Linux",
			AllowMac:"MacOS",
			AllowWindows:"Windows",
			AllowChrome:"Chrome",
			AllowEdge:"Edge",
			AllowFirefox:"Firefox",
			AllowOpera:"Opera",
			AllowSafari:"Safari",
			AllowVivaldi:"Vivaldi",
			AllowInternetExplorer:"You shouldn't see this option"
		},
		OpenDialog:function(){
			var el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":TraceOpt.Config.SelectedOption
			});

			for (var i in TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]){
				if (i !== "enabled" && i !== "uaCust" && TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i] !== undefined){
					if (Object.keys(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i]).length > 1){
						el.append(
							$("<span/>",{
								"class":"setting_cont_opt"
							}).text(TraceOpt.UserAgent.StringNames[i] || i)
						);
						for (var j in TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i]){
							if (j !== "enabled" && typeof TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i][j] !== undefined){
								opts = {
									"type":"checkbox",
									"id":"c_opt_"+TraceOpt.makeRandomID(16),
									"data-conf":TraceOpt.Config.SelectedOption + "." + i + "." + j + ".enabled"
								};
								if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption][i][j].enabled === true){
									opts["checked"] = "checked";
								}

								el.append(
									$("<div/>",{
										"class":"setting_conf_opt"
									}).append(
										$("<label/>",{
											"for":opts["id"],
											"class":"checkbox_cont"
										}).text(TraceOpt.UserAgent.StringNames[j] || j).append(
											$("<input/>",opts).on("click enter",function(){
												TraceOpt.Config.SaveConf(this);
											}),
											$("<span/>",{"class":"ccheck"})
										)
									)
								);
							}
						}
					}
				}
			}

			el.append(
				$("<span/>",{"class":"regular"}).text("Changes to these settings should take place immediately")
			);

			$("#drop_message").empty().append(
				$("<h1/>").text("User Agent Customiser"),
				$("<div/>",{"id":"ua_specialconfig"}).append(el)
			);
			TraceOpt.AssignCloseOverlay();
		}
	},
	ScreenRes:{
		OpenDialog:function(){
			var el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":TraceOpt.Config.SelectedOption
			});

			console.log(TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]);

			el.append(
				$("<button/>",{"id":"sr_togglemode","class":"small"}).text("Click to toggle protection method").on("click enter",TraceOpt.ScreenRes.ToggleModeUI),$("<br/>"),$("<br/>"),
				$("<div/>",{"id":"sr_resolutions"}).append(
					$("<div/>",{"id":"sr_addtoresolutions"}).append(
						$("<input/>",{"type":"text","id":"sr_addtoresinput"}),
						$("<button/>",{"id":"sr_addtoressubmit","class":"small"}).text("Add Resolution").on("click enter",TraceOpt.ScreenRes.AddNewResolution)
					),
					$("<div/>",{"id":"sr_currentresolutions"})
				),
				$("<div/>",{"id":"sr_randoffset"}).append(
					$("<span/>").text("A random number between these two values is created and added to the width and height of the screen resolution at each page refresh, making it harder to know your real screen resolution."),
					$("<br/>"),$("<br/>"),
					$("<span/>").text("Minimum Offset (Default is -10)"),
					$("<input/>",{"type":"text","id":"sr_offsetminval","placeholder":"Minimum Value","value":TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].randomOpts.values[1]}),
					$("<br/>"),$("<br/>"),
					$("<span/>").text("Maximum Offset (Default is 10)"),
					$("<input/>",{"type":"text","id":"sr_offsetmaxval","placeholder":"Maximum Value","value":TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].randomOpts.values[1]}),
					$("<br/>"),$("<br/>"),
					$("<button/>",{"id":"sr_updateoffsets","class":"small"}).text("Save Offsets").on("click enter",TraceOpt.ScreenRes.UpdateOffset)
				)
			);

			$("#drop_message").empty().append(
				$("<h1/>").text("Configure Screen Resolution Protection"),
				$("<div/>",{"id":"sr_specialconfig"}).append(el)
			);

			if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].randomOpts.enabled === true){
				$("#sr_resolutions").hide();
			}
			if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].commonResolutions.enabled === true){
				$("#sr_randoffset").hide();
			}

			TraceOpt.AssignCloseOverlay();
		},
		ToggleModeUI:function(){
			if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption].randomOpts.enabled === true){
				chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_ScreenRes.randomOpts.enabled",false);
				chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_ScreenRes.commonResolutions.enabled",true);
			} else {
				chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_ScreenRes.randomOpts.enabled",true);
				chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_ScreenRes.commonResolutions.enabled",false);
			}
			TraceOpt.ScreenRes.OpenDialog();
		},
		AddNewResolution:function(){
			console.log($("#sr_addtoresinput").val());
		},
		UpdateOffset:function(){
			console.log($("#sr_offsetminval").val());
			console.log($("#sr_offsetmaxval").val());
		}
	},
	Blocklist:{
		ListConfig:{},
		isPremium:(chrome.extension.getBackgroundPage !== null && typeof chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.PremiumCode !== "undefined" ?
			(chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.PremiumCode.length === 0 ? false : true) : false),
		updatedList:false,
		OpenDialog:function(){
			TraceOpt.Blocklist.isPremium = (typeof chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.PremiumCode !== "undefined" ?
				(chrome.extension.getBackgroundPage().Trace.p.Current.Main_Trace.PremiumCode.length === 0 ? false : true) : false);

			$("#overlay_cont").addClass("blc_parent");

			$("#drop_message").empty().append(
				$("<h1/>",{
					"class":"hasloader"
				}).text("Trace Blocklist Customiser").append(
					$("<img/>",{
						"src":"../icons/loader.gif",
						"alt":"Please wait whilst we load the lists available for use",
						"class":"loader_img"
					}).show()
				),
				$("<span/>",{"id":"blc_updAlert","style":"display:none"}).text("The blocklist will update with new the settings when you exit this popup."),
				$("<div/>",{
					"id":"blc_lists"
				}).append(
					$("<span/>",{"id":"blc_loadStatus"}).text("Loading lists. Please Wait...")
				)
			);

			TraceOpt.Blocklist.LoadList();

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);

			$("#overlay_close").unbind("click").click(function(){
				if (TraceOpt.Blocklist.updatedList) chrome.extension.getBackgroundPage().Trace.b.BlocklistLoader(true);

				$("#blc_cServerList").empty();
				$("#overlay_cont").removeClass("blc_parent");
				TraceOpt.CloseOverlay();
			});
			$(window).unbind("click").click(function(e){
				if ($(e.target)[0].id === "overlay_message"){
					if (TraceOpt.Blocklist.updatedList) chrome.extension.getBackgroundPage().Trace.b.BlocklistLoader(true);

					$("#blc_cServerList").empty();
					$("#overlay_cont").removeClass("blc_parent");
					TraceOpt.CloseOverlay();
				}
			});
		},
		LoadList:function(){
			if (!navigator.onLine){
				$(".loader_img").hide();
				$("#blc_loadStatus").text("You don't seem to be online...");
				return;
			}

			var writeListToBody = function(){
				var body = $("<div/>",{
					"id":"blc_cServerList",
					"class":"settings_config_container"
				});

				if (TraceOpt.Blocklist.ListConfig.lists.length === 0){
					body.append(
						$("<h2/>").text("There are no lists available for use.")
					);
				} else {
					for (var i = 0,l = TraceOpt.Blocklist.ListConfig.lists.length;i<l;i++){
						currentItem = TraceOpt.Blocklist.ListConfig.lists[i];
						currentItemId = TraceOpt.makeRandomID(7);

						var control = $("<div/>",{
							"class":"setting_conf_opt"
						}).append(
							$("<label/>",{
								"for":"opt_" + currentItemId,
								"class":"checkbox_cont"
							}).text("Use this list").append(
								$("<input/>",{
									"id":"opt_" + currentItemId,
									"type":"checkbox",
									"class":"blc_installListCheck",
									"data-listid":i,
									"data-install":currentItem.install,
									"data-warnPremium":currentItem.premium,
								}).on("click enter",function(e){
									if (TraceOpt.Blocklist.isPremium !== true && $(this).is(":checked") === true && $(this).data("warnpremium")){
										e.preventDefault();
										alert("This list requires premium.");
									} else {
										TraceOpt.Blocklist.InstallList($(this).data("install"),$(this).is(":checked"));
									}
								}),
								$("<span/>",{"class":"ccheck"})
							)
						);

						// List labels
						if (currentItem.premium === true){
							var label = $("<span/>",{"class":"blc_premreq blc_req"}).text(TraceOpt.Blocklist.isPremium===true ? "Premium List" : "This list requires Premium");
						} else if (currentItem.default === true){
							var label = $("<span/>",{"class":"blc_defreq blc_req"}).text("Default List");
						} else {
							var label = $("<span/>",{"class":"blc_optreq blc_req"}).text("Optional List");
						}

						body.append(
							$("<div/>",{
								"id":"blc_TraceList_" + i + currentItemId,
								"class":"blcTraceList",
								"data-listid":i
							}).append(
								$("<h2/>").text(currentItem.name + " "),
								label,
								$("<br/>"),
								$("<span/>").text(currentItem.description),
								control
							)
						);
					}
				}

				$("#blc_lists").empty().append(body);
			};

			var checkEnabledItems = function(){
				$(".blc_installListCheck").each(function(){
					var installCode = $(this).data("install");
					var isInstalled = chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.installCodes[installCode];
					if (isInstalled){
						$(this).attr("checked","checked");
					}
				});
			};

			$.ajax({
				url:"https://absolutedouble.co.uk/trace/app/weblist.php?v=180&a=list",
				dataType:"text",
				cache:false,
				method:"GET",
				timeout:30000,
				beforeSend:function(){
					$("#blc_loadStatus").text("Contacting Server...");
				},
				success:function(data){
					$("#blc_loadStatus").text("Compiling List...");
					TraceOpt.Blocklist.ListConfig = JSON.parse(data);
					writeListToBody();
					checkEnabledItems();
					$(".loader_img").hide();
				},
				error:function(e){
					if (e.status === 403){
						$("#blc_loadStatus").text("Error getting list from server. Access Denied. This could mean you're using an outdated version of Trace");
					} else if (e.status === 0){
						$("#blc_loadStatus").empty().append(
							$("<h2/>").text("Trace was unable to establish a connection to the server"),
							$("<span/>").text("This could be because of one of the following reasons:"),
							$("<ul/>").append(
								$("<li/>").text("You aren't connected to the internet"),
								$("<li/>").text("A firewall or proxy is blocking access to absolutedouble.co.uk"),
								$("<li/>").text("The server is down for maintenance"),
								$("<li/>").text("Trace is out of date")
							)
						);
					} else {
						$("#blc_loadStatus").text("Error getting list from server. Code: " + e.status);
					}
					$(".loader_img").hide();
				}
			});
		},
		InstallList:function(installCode,enabled){
			if (typeof installCode !== "string"){
				return;
			}

			var currentCodes = chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.installCodes;
			if (typeof currentCodes !== "object") {
				currentCodes = {
					"a00000002":true,
					"a00000005":true
				};
			}

			if (!enabled){
				if (currentCodes[installCode] !== false){
					currentCodes[installCode] = false;
				}
			} else {
				currentCodes[installCode] = true;
			}

			TraceOpt.Blocklist.updatedList = true;
			$("#blc_updAlert").show();

			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.installCodes",currentCodes);
		}
	},
	Whitelist:{
		init:function(){
			$("#whitelist_toggle").on("click enter", function(){
				TraceOpt.Whitelist.DoInit(true);
			}).on("keypress",function(e) {
				if(e.which === 13) {
					$(this).trigger('enter');
				}
			});
		},
		DoInit:function(animate){
			if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.Whitelist.enabled === true) {
				TraceOpt.Whitelist.AssignEvents();
				TraceOpt.Whitelist.ToggleView(animate,true);
				TraceOpt.WhitelistEdit.PopulateWhitelist();
			} else {
				TraceOpt.Whitelist.ToggleView(animate,false);
			}
		},
		AssignEvents:function(){
			$("#wlctrl_refresh").click(TraceOpt.WhitelistEdit.ReloadWhitelist);
			$("#wlctrl_update").click(TraceOpt.WhitelistEdit.SaveWhitelist);
			$("#wlctrl_adddom").click(TraceOpt.WhitelistEdit.AddDomain);
			$("#wlctrl_remdom").click(TraceOpt.WhitelistEdit.RemoveDomain);
			$("#wlctrl_editdom").click(TraceOpt.WhitelistEdit.EditDomain);
		},
		ToggleView:function(animate,show){
			var setting = {
				"height":(show === true ? "16.666vh" : "20vh"),
				"line-height":(show === true ? "16.666vh" : "20vh")
			};

			if (!show)
				$("[data-load='whitelist']").hide();
			else
				$("[data-load='whitelist']").show();

			if (animate){
				$(".side_el").animate(setting);
			} else {
				$(".side_el").css(setting);
			}
		}
	},
	WhitelistEdit:{
		CurrentList:[],
		CurrentSelect:null,
		Title:$("#whitelist .sect_header"),
		ClearWhitelist:function(){
			$("#wl_biglist").empty();
		},
		EmptyList:function(){
			$("#wl_biglist").html("<h2>&nbsp;Whitelist contains no domains.</h2>&nbsp;&nbsp;Add new ones here.<br />");
		},
		SaveWhitelist:function(){
			TraceOpt.WhitelistEdit.Title.html("Updating...");
			$("#wlctrl_update").html("Saving...");
			chrome.extension.getBackgroundPage().Trace.c.SaveWhitelist(function(){
				TraceOpt.WhitelistEdit.ReloadWhitelist();

				// Make it feel like the whitelist is saving (even though it's instant)
				setTimeout(function(){
					TraceOpt.WhitelistEdit.Title.html("Whitelist (Beta)");
					$("#wlctrl_update").html("Save Changes");
				},250);
			});
		},
		LoadWhitelist:function(callback){
			callback(chrome.extension.getBackgroundPage().Trace.c.whitelist);
		},
		AddDomain:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Add domain to whitelist"),
				$("<h3/>").html("Type a URL below, the hostname will appear below, that's what will be whitelisted.<br />Adding domains to this list will allow them to connect to sites in the blocklist, it will not unblock sites actually in the blocklist."),
				$("<input/>",{
					"type":"text",
					"placeholder":"Domain Name/URL",
					"class":"textbox",
					"id":"wle_domainadd",
					"autocomplete":"false"
				}).keyup(function(){
					var d = $(this).val();
						d = TraceOpt.WhitelistEdit.CleanDomain(d);
					var v = TraceOpt.WhitelistEdit.ValidateDomain(d);
					if (v){
						$("#wle_domainclear").html((d === false ? "Invalid Hostname/IP" : d));
					} else {
						$("#wle_domainclear").html("Invalid Hostname/IP");
					}
				}),
				$("<br/>"),
				$("<h1/>",{"id":"wle_domainclear", "class":"slimtext"}).text("Enter a domain..."),
				$("<button/>",{"class":"float_r"}).text("Cancel").click(TraceOpt.CloseOverlay),
				$("<button/>",{"class":"float_r","title":"Add domain to whitelist"}).text("Add Domain").click(function(){
					var d = $("#wle_domainadd").val();
					TraceOpt.WhitelistEdit.AddValidation(d,this);
				}),
				$("<br/>"),$("<br/>")
			);
			TraceOpt.AssignCloseOverlay();
		},
		// Thanks https://stackoverflow.com/a/9209720
		ValidateDomain:function(clean){
			return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(clean);
		},
		CleanDomain:function(url){
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
		AddValidation:function(domain,e){
			$(e).text("Updating...");
			console.log(domain);

			chrome.extension.getBackgroundPage().Trace.c.AddItem(domain,function(){
				TraceOpt.WhitelistEdit.ReloadWhitelist();
				TraceOpt.CloseOverlay();
			});
		},
		EditDomain:function(){
			if(TraceOpt.WhitelistEdit.CurrentSelect === null){
				return false;
			}

			$("#drop_message").empty().append(
				$("<h1/>").text("Edit whitelist domain"),
				$("<h3/>").html("Edit the URL below, the hostname will appear below, that's what will be whitelisted."),
				$("<input/>",{
					"type":"text",
					"placeholder":"Domain Name/URL",
					"class":"textbox",
					"id":"wle_domainadd",
					"autocomplete":"false",
					"value":TraceOpt.WhitelistEdit.CurrentSelect.data("itmkey")
				}).keyup(function(){
					var d = $(this).val();
						d = TraceOpt.WhitelistEdit.CleanDomain(d);
					var v = TraceOpt.WhitelistEdit.ValidateDomain(d);
					if (v){
						$("#wle_domainclear").html((d === false ? "Invalid Hostname/IP" : d));
					} else {
						$("#wle_domainclear").html("Invalid Hostname/IP");
					}
				}),
				$("<br/>"),
				$("<h1/>",{"id":"wle_domainclear", "class":"slimtext"}).text("Edit domain..."),
				$("<button/>",{"class":"float_r"}).text("Cancel").click(TraceOpt.CloseOverlay),
				$("<button/>",{"class":"float_r"}).text("Modify").click(TraceOpt.WhitelistEdit.DoEditDomain),
				$("<br/>"),$("<br/>")
			);
			TraceOpt.AssignCloseOverlay();
		},
		DoEditDomain:function(){
			if(TraceOpt.WhitelistEdit.CurrentSelect === null){
				return false;
			}
			TraceOpt.CloseOverlay();
			var removeItem = TraceOpt.WhitelistEdit.CurrentSelect.data("itmkey");
			var addItem = $("#wle_domainadd").val();
			chrome.extension.getBackgroundPage().Trace.c.EditItem(removeItem,addItem,function(){
				TraceOpt.WhitelistEdit.ReloadWhitelist();
			});
		},
		RemoveDomain:function(){
			if(TraceOpt.WhitelistEdit.CurrentSelect === null){
				return false;
			}
			var item = TraceOpt.WhitelistEdit.CurrentSelect.data("itmkey");
			chrome.extension.getBackgroundPage().Trace.c.RemoveItem(item,function(){
				TraceOpt.WhitelistEdit.ReloadWhitelist();
			});
		},
		UnselectDomain:function(deleted){
			if (!deleted) $("#" + $(TraceOpt.WhitelistEdit.CurrentSelect)[0].id).removeClass("wl_selected");

			TraceOpt.WhitelistEdit.CurrentSelect = null;

			$("#wl_scontrols").addClass("faded");
			$("#wlctrl_remdom").prop("disabled",true);
			$("#wlctrl_editdom").prop("disabled",true);
		},
		SelectDomain:function(){
			if (TraceOpt.WhitelistEdit.CurrentSelect !== null){
				if ($(this)[0].id === $(TraceOpt.WhitelistEdit.CurrentSelect)[0].id){
					TraceOpt.WhitelistEdit.UnselectDomain(false);
					return;
				}
				TraceOpt.WhitelistEdit.UnselectDomain(false);
			}
			TraceOpt.WhitelistEdit.CurrentSelect = $(this);
			$(this).addClass("wl_selected");

			$("#wl_scontrols").removeClass("faded");
			$("#wlctrl_remdom").prop("disabled",false);
			$("#wlctrl_editdom").prop("disabled",false);
		},
		ReloadWhitelist:function(){
			$("#wl_biglist").addClass("faded");
			TraceOpt.WhitelistEdit.PopulateWhitelist();
			setTimeout(function(){
				$("#wl_biglist").removeClass("faded");
			},300);
		},
		AddToUI:function(array,cb){
			var len = Object.keys(array).length;
			var lst = $("#wl_biglist");
			for (var i = 0;i < len;i++){
				var pos = i;
				lst.append(
					$("<div/>",{
						"class":"wl_blist_domain",
						"data-itmkey":Object.keys(array)[pos],
						"id":"wle_id_" + TraceOpt.makeRandomID(7)
					}).text(Object.keys(array)[pos]).click(TraceOpt.WhitelistEdit.SelectDomain)
				);
			}

			if (cb) cb();
		},
		PopulateWhitelist:function(){
			TraceOpt.WhitelistEdit.ClearWhitelist();
			TraceOpt.WhitelistEdit.LoadWhitelist(function(list){
				if (Object.keys(list).length === 0){
					TraceOpt.WhitelistEdit.EmptyList();
				} else {
					TraceOpt.WhitelistEdit.AddToUI(list);
				}
			});
		}
	},
	BadTopLevelBlock:{
		AssignEvents:function(){
			$("#adv_settingstld").click(TraceOpt.BadTopLevelBlock.SelectProtectionUI);
		},
		CurrentName:function(){
			var s = chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.tld.level;
			if (s === 0) return [s,"Basic"];
			if (s === 1) return [s,"Regular"];
			if (s === 2) return [s,"Extended"];
			if (s === 3) return [s,"All"];

			return [s,"Unknown"];
		},
		SelectProtectionUI:function(){
			if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.tld.enabled !== true){
				alert("Enable TLD Protection to modify the settings for it.");
				return;
			}

			var csetting = TraceOpt.BadTopLevelBlock.CurrentName();

			$("#drop_message").empty().append(
				$("<h1/>").text("Bad TLD Protection Level"),
				$("<h3/>").html("AbsoluteDouble recommends using at least 'Regular Domains', your current setting is <em>" + csetting[1] + "</em>."),
				$("<select/>",{id:"atld_protlevel"}).append(
					$("<option/>",{value:0}).text("Basic Domains"),
					$("<option/>",{value:1}).text("Regular Domains"),
					$("<option/>",{value:2}).text("Extended Domains"),
					$("<option/>",{value:3}).text("All Domains")
				),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("List Of Blocked TLDs").click(TraceOpt.BadTopLevelBlock.SeeBlocked),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("Save").click(TraceOpt.BadTopLevelBlock.SaveSelection),
				$("<button/>").text("Cancel").click(TraceOpt.CloseOverlay)
			);
			TraceOpt.AssignCloseOverlay();

			$("#atld_protlevel option[value='" + csetting[0] + "']").prop("selected", true);
		},
		SeeBlocked:function(){
			$("#overlay_message").fadeOut(250).delay(100).fadeIn(250);
			TraceOpt.BadTopLevelBlock.SaveSelection(false);

			var blockedSites = "";
			var blockList = chrome.extension.getBackgroundPage().Trace.g.BadTopLevelDomain.GetList().sort();
			if (blockList[0] === false){
				blockedSites = "<h2>You must enable Domain Blocking to use this</h2>"
			} else {
				for (x in blockList){
					blockedSites += "<div class='tld_blockdom'>" + blockList[x] + "</div>";
				}
			}

			setTimeout(function(){
				$("#drop_message").empty().append(
					$("<h1/>").text("List of currently blocked TLDs"),
					$("<div/>",{
						"id":"atld_blockedlist"
					}).html(blockedSites)
				);
			},250);
		},
		SaveSelection:function(c){
			if (typeof c !== "boolean") var c = true;

			var s = $("#atld_protlevel").val();
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.tld.level",s);
			if (c) TraceOpt.CloseOverlay();
		}
	},
	UserInterfaceCustomiser:{
		OptionsInterface:function(){
			var opts = {
				"type":"checkbox",
				"id":"c_opt_"+TraceOpt.makeRandomID(16),
				"data-conf":TraceOpt.Config.SelectedOption + "." + "theme" + ".timealterations"
			};
			if (TraceOpt.Config.CurrentSettings[TraceOpt.Config.SelectedOption]["Theme"]["timealterations"].enabled === true){
				opts["checked"] = "checked";
			}
			$("#drop_message").empty().append(
				$("<h1/>").text("Customise User Interface"),
				$("<h2/>").text("Choose overall theme"),
				$("<select/>").append(
					$("<option>",{"value":"default"}).text("Default Theme"),
					$("<option>",{"value":"tracelight"}).text("Trace Light"),
					$("<option>",{"value":"tracegrayscale"}).text("Trace Grayscale")
				),
				$("<h2/>",{"style":"display:none;"}).text("Navigation bar position"),
				$("<select/>",{"style":"display:none;"}).append(
					$("<option>",{"value":"top"}).text("Top"),
					$("<option>",{"value":"lside"}).text("Left"),
					$("<option>",{"value":"rside"}).text("Right")
				),
				$("<div/>",{
					"class":"setting_conf_opt",
					"style":"font-size:1.3em"
				}).append(
					$("<label/>",{
						"for":opts["id"],
						"class":"checkbox_cont"
					}).text("Enable time-based alterations").append(
						$("<input/>",opts).on("click enter",function(){alert(this);}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<button/>",{"class":"float_r"}).text("Close").click(TraceOpt.CloseOverlay),
				$("<br/>"),$("<br/>")
			);
			TraceOpt.AssignCloseOverlay();
		}
	},
	URLCleaner:{
		AssignEvents:function(){
			$("#adv_urlcleaner_settings").click(TraceOpt.URLCleaner.SelectProtectionUI);
			if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.urlCleaner.enabled !== true){
				$("#urlCleanBlock").hide();
				return;
			}
		},
		CurrentName:function(type){
			var s = chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].level;
			var m = chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.urlCleaner.queryString[type].method;
			if (s === "0") return [s,"Safe Cleaning",m];
			if (s === "1") return [s,"Regular Cleaning",m];
			if (s === "2") return [s,"Risky Cleaning",m];
			if (s === "3") return [s,"Exteme Cleaning",m];
			if (s === "4") return [s,"Remove All URL Parameters",m];

			return [s,"Unknown","Unknown"];
		},
		SelectProtectionUI:function(){
			if (chrome.extension.getBackgroundPage().Trace.p.Current.Pref_WebController.urlCleaner.enabled !== true){
				alert("Enable the URL Cleaner to modify the settings for it.");
				return;
			}

			var frameSetting = TraceOpt.URLCleaner.CurrentName("main_frame");
			var resourceSetting = TraceOpt.URLCleaner.CurrentName("resources");

			$("#drop_message").empty().append(
				$("<h1/>").text("URL Cleaning Settings"),
				$("<h3/>").html("Select aggression level, please note, the more aggressive the setting is, the more likely it is that a legitimate parameter will be blocked. Also, be aware that any URL cleaning, especially resource URL cleaning will break websites"),
				$("<span/>",{id:"aurlc_uwarning",style:"display:none"}).text("No message set.").append($("<br/>"),$("<br/>")),
				$("<h2/>").text("Frame URL Cleaning Settings"),
				$("<select/>",{id:"afr_urlc_plevel"}).append(
					$("<option/>",{value:-1}).text("No Cleaning"),
					$("<option/>",{value:0}).text("Safe Cleaning"),
					$("<option/>",{value:1}).text("Regular Cleaning"),
					$("<option/>",{value:2}).text("Risky Cleaning"),
					$("<option/>",{value:3}).text("Extreme Cleaning"),
					$("<option/>",{value:4}).text("Remove All URL Parameters")
				).on("change",function(){
					if ($(this).val() === "4"){
						$("#aurlc_uwarning").text("Are you sure you want to remove all URL parameters? This will break almost every single website you use on the web.").append($("<br/>"),$("<br/>")).show();
					} else if ($(this).val() === "3"){
						$("#aurlc_uwarning").text("This setting is very extreme and may break a lot of websites, if you don't want websites to be broken as easily please use regular cleaning instead.").append($("<br/>"),$("<br/>")).show();
					} else {
						$("#aurlc_uwarning").hide();
					}
				}),
				$("<span/>").text(" "),
				$("<select/>",{id:"afr_urlc_pmethod"}).append(
					$("<option/>",{value:"remove"}).text("Remove Parameters"),
					$("<option/>",{value:"randomise"}).text("Randomise Parameters")
				),
				$("<h2/>").text("Resource URL Cleaning Settings"),
				$("<select/>",{id:"ars_urlc_plevel"}).append(
					$("<option/>",{value:-1}).text("No Cleaning"),
					$("<option/>",{value:0}).text("Safe Cleaning"),
					$("<option/>",{value:1}).text("Regular Cleaning"),
					$("<option/>",{value:2}).text("Risky Cleaning"),
					$("<option/>",{value:3}).text("Extreme Cleaning"),
					$("<option/>",{value:4}).text("Remove All URL Parameters")
				).on("change",function(){
					if ($(this).val() === "4"){
						$("#aurlc_uwarning").text("Are you sure you want to remove all URL parameters? This will break almost every single website you use on the web.").append($("<br/>"),$("<br/>")).show();
					} else if ($(this).val() === "3"){
						$("#aurlc_uwarning").text("This setting is very extreme and may break a lot of websites, if you don't want websites to be broken as easily please use regular cleaning instead.").append($("<br/>"),$("<br/>")).show();
					} else {
						$("#aurlc_uwarning").hide();
					}
				}),
				$("<span/>").text(" "),
				$("<select/>",{id:"ars_urlc_pmethod"}).append(
					$("<option/>",{value:"remove"}).text("Remove Parameters"),
					$("<option/>",{value:"randomise"}).text("Randomise Parameters")
				),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("List Of Affected URL Parameters").click(TraceOpt.URLCleaner.SeeAffected),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("Save").click(TraceOpt.URLCleaner.SaveSelection),
				$("<button/>").text("Cancel").click(TraceOpt.CloseOverlay)
			);
			TraceOpt.AssignCloseOverlay();

			$("#afr_urlc_plevel option[value='" + frameSetting[0] + "']").prop("selected", true);
			$("#ars_urlc_plevel option[value='" + resourceSetting[0] + "']").prop("selected", true);
			$("#afr_urlc_pmethod option[value='" + frameSetting[2] + "']").prop("selected", true);
			$("#ars_urlc_pmethod option[value='" + resourceSetting[2] + "']").prop("selected", true);
		},
		SeeAffected:function(){
			$("#overlay_message").fadeOut(250).delay(100).fadeIn(250);
			TraceOpt.URLCleaner.SaveSelection(false);

			var affectedList = "";
			var blockList = chrome.extension.getBackgroundPage().Trace.g.URLCleaner.badParams;
			if (blockList[0] === false){
				affectedList = "<h2>You must enable WebRequest Controller to use this</h2>"
			} else {
				for (x in blockList.safe){
					affectedList += "<div class='tld_blockdom tld_colsafe'>" + blockList.safe[x] + "</div>";
				}
				for (x in blockList.regular){
					affectedList += "<div class='tld_blockdom tld_colreg'>" + blockList.regular[x] + "</div>";
				}
				for (x in blockList.risky){
					affectedList += "<div class='tld_blockdom tld_colrisk'>" + blockList.risky[x] + "</div>";
				}
				for (x in blockList.extreme){
					affectedList += "<div class='tld_blockdom tld_colextr'>" + blockList.extreme[x] + "</div>";
				}
			}

			setTimeout(function(){
				$("#drop_message").empty().append(
					$("<h1/>").text("List of affected parameters"),
					$("<div/>",{
						"id":"atld_blockedlist"
					}).html(affectedList)
				);
			},250);
		},
		SaveSelection:function(c){
			if (typeof c !== "boolean") var c = true;

			var frameSetting = $("#afr_urlc_plevel").val();
			var resSetting = $("#ars_urlc_plevel").val();
			var frameMethod = $("#afr_urlc_pmethod").val();
			var resMethod = $("#ars_urlc_pmethod").val();
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.urlCleaner.queryString.main_frame.level",frameSetting);
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.urlCleaner.queryString.resources.level",resSetting);
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.urlCleaner.queryString.main_frame.method",frameMethod);
			chrome.extension.getBackgroundPage().Trace.p.SetSetting("Pref_WebController.urlCleaner.queryString.resources.method",resMethod);
			if (c) TraceOpt.CloseOverlay();
		}
	}
};


$(document).ready(TraceOpt.WindowLoad);

// Check if is new install
if(window.location.hash && window.location.hash === "#newinstall") {
	$("#overlay_message").slideDown(300);
	$("#overlay_close").click(TraceOpt.FreshInstall);

	if (typeof Storage !== "undefined"){
		localStorage["showSettingsTutorial"] = true;
		localStorage["showAdvancedTutorial"] = true;
	}

	$(window).click(function(e){
		if ($(e.target)[0].id === "overlay_message"){
			TraceOpt.FreshInstall();
		}
	});
} else {
	setTimeout(function(){$("#ux").removeClass("blurred");},10);
}

// Polyfill: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes#Polyfill
if (!String.prototype.includes) {
	String.prototype.includes = function(search, start) {
		if (typeof start !== 'number') {
			start = 0;
		}

		if (start + search.length > this.length) {
			return false;
		} else {
			return this.indexOf(search, start) !== -1;
		}
	};
}