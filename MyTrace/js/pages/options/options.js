/*
 * 	Trace options page script
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

if (!chrome.hasOwnProperty("extension") || typeof chrome.extension.getBackgroundPage !== "function"){
	showErr("Extension failed to connect to background page. Please try reloading the page.");
}

let Opts = {
	homeRefresh:null,
	searchTimeout:null,
	currentSettingTab:"settings_stracefeature",
	debug:false,

	WindowLoad:function(){
		// Let's check the API...
		if (typeof chrome.extension !== "object"){
			$("#drop_message").empty().append(
				$("<h1/>").text("Browser API did not load"),
				$("<h2/>").text("Trace will reload the page in 3 seconds")
			);
			$("#overlay_message").slideDown(300);
			setTimeout(function(){
				window.location.reload();
			},3300);
			return;
		}

		// Assign click events to nav bar
		Opts.AssignNavEvents();
		Opts.Interface.Browsers();
		Opts.Interface.PresetWarn();

		// Start Auth Channel and check integrity
		Auth.Init(function(m) {
			if (m.data.action === "ByeByeTab") {
				clearInterval(Opts.homeRefresh);

				document.title = "Tab Disabled";

				$("#drop_message").empty().append(
					$("<h1/>").text("Tab disabled"),
					$("<span/>").text("Trace only allows one tab to be open at a time, you are now using Trace in a new tab and so this one will close in 10 seconds.")
				);
				$("#ux").addClass("blurred");
				$("#overlay_message").slideDown(300);
				$("#overlay_close").hide();

				setTimeout(function () {
					window.close();
				}, 10000);
			} else if (m.data.action === "ReloadList") {

				Opts.Scope.ReloadList();

			} else {
				console.log("Authenticator: No action taken");
			}
		});
		Auth.Integrity();

		// Assign storage event
		window.addEventListener("storage",function (a){
			console.log(a);
		},false);

		// Get main page text and start update intervals
		Opts.Premium.GetStatus();
		Opts.Interface.GetMainPage(false);
		Opts.homeRefresh = setInterval(function(){
			Opts.Interface.GetMainPage(true);
			Opts.Premium.GetStatus();
			Opts.Stats.GetStatsData(function(d){
				Opts.Stats.MakeData(d,Opts.Stats.MakeGraph);
			});
		},5000);

		// Get status of settings
		Opts.GetCurrentSettings();
		Opts.ExecutionOrder.ReloadInterface();

		// Assign click events to settings table
		Opts.AssignSettingClickEvents();

		// Assign click events to advanced settings
		Opts.Scope.Init();
		Opts.BadTLD.AssignEvents();
		Opts.URLCleaner.AssignEvents();

		Opts.Interface.GenerateHome();
		Opts.Interface.UpdateStrings();

		// Get statistics loaded and ready
		Opts.Stats.StructureGraph();
		Opts.Stats.GetStatsData(function (d) {
			Opts.Stats.MakeData(d, Opts.Stats.MakeGraph);
		});

		// Update storage counter
		if (ls.supported === true) {
			var count = 1, askedFeedback = true;
			if (ls.Read("userStatOptionsOpenCount") !== undefined && ls.Read("userStatOptionsOpenCount") !== null){
				count = parseInt(ls.Read("userStatOptionsOpenCount"));
			}
			if (ls.Read("hasAskedForFeedback") !== undefined && ls.Read("hasAskedForFeedback") !== null){
				askedFeedback = ls.Read("hasAskedForFeedback");
			} else {
				ls.Store("hasAskedForFeedback",false);
			}

			count++;
			ls.Store("userStatOptionsOpenCount",count);

			if (count > 10 && (count % 3 === 0) && askedFeedback === "false"){
				Opts.Interface.AskFeedback();
			}
		}

		// Assign click events to stats page
		Opts.Stats.AssignGraphOptions();

		TraceBg(function(bg){
			Opts.debug = (typeof bg.Prefs.Current.Main_Trace.DebugApp.enabled !== "undefined" ?
				(bg.Prefs.Current.Main_Trace.DebugApp.enabled) : false);
			Opts.Blocklist.isPremium = (typeof bg.Vars.Premium !== "undefined" ?
				(bg.Vars.Premium.length !== 0) : false);
		});
	},
	NewInstall:{
		ShowInterface:function(){
			var freshInstall = function(){
				$("#overlay_message").fadeOut(300);
				window.location.hash = '#';
				setTimeout(function(){$("#ux").removeClass("blurred");},10);
			};

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);
			$("#overlay_close").on("click enter",freshInstall);

			if (ls.supported === true){
				ls.Store("showSettingsTutorial",true);
				ls.Store("showRequestTutorial",true);
				ls.Store("showScopeTutorial",true);
				ls.Store("hasAskedForFeedback",false);
			}

			$(window).click(function(e){
				if ($(e.target)[0].id === "overlay_message"){
					freshInstall();
				}
			});
		}
	},
	Interface:{
		Browsers:function(){
			if (!/Chrome|Firefox|Edg/.test(navigator.userAgent) || /Iron/.test(navigator.userAgent)){
				$("#home .sect_cont").append(
					$("<div/>",{"class":"sect_adv"}).append(
						$("<div/>",{"class":"sect_adv_header"}).html("&nbsp;Developer Message"),
						$("<div/>",{"class":"sect_adv_cont"}).text("You are running Trace on an unsupported browser - if you have any bugs please report them to absolutedouble@gmail.com")
					)
				);
			}
			if (/Firefox/.test(navigator.userAgent)){
				$("body").css("font-size","0.8em");
			}
		},
		UpdateStrings:function(){
			$(".menutoggle").text(lang("advNavMenuToggle"));
		},
		GenerateHome:function(){
			let greetings = [
				lang("advHomeMsgWelcomeLong"),
				lang("advHomeMsgWelcomeShort")
			];
			$("#trace_main_title").text(greetings[Math.floor(Math.random()*greetings.length)]);
			$("#user_tip").html(traceTips[Math.floor(Math.random()*traceTips.length)]);

			// Trace Pause Button
			$("#trace_pause").empty().append(
				$("<h3/>").text(lang("advHomePauseTitle")),
				$("<div/>").text(lang("advHomePauseDesc")),
				$("<button/>",{"id":"pause_trace"}).text(lang("advHomePausePause")).on("click enter",Opts.Protections.UpdatePause)
			);
			Opts.Protections.UpdatePause(true);

			// Trace Browsing Session
			$("#trace_session").empty().append(
				$("<h3/>").text(lang("advHomeSessionTitle")),
				$("<div/>").text(lang("advHomeSessionDesc")),
				$("<button/>",{"id":"configure_session"}).text(lang("advHomeSessionConfig")).on("click enter",Opts.Protections.SessionView)
			);
		},
		GetMainPage:function(refresh){
			let plural = function(n){
				return (parseInt(n) !== 1) ? "s" : "";
			};
			let requestNames = {
				"total":"request",
				"webpage":"page load",
				"media":"media request",
				"code":"code request",
				"other":"miscellaneous request"
			};

			if (!refresh){
				$("#trace_info").empty().append(
					$("<br />"), "Trace has been protecting you since ",
					$("<span/>",{"id":"trace_info_protectdate"}).text("today."),

					$("<div/>",{"id":"trace_info_alltime_stats"}),
					$("<div/>",{"id":"trace_info_current_wrc"})
				);
			}

			TraceBg(function(bg){
				bg.Stats.MainText(function(protectDate, stats, wrcData){
					if (!refresh) $("#trace_info_protectdate").text(protectDate);

					if (neatNumber(stats["total"]) !== "0") {
						if (!refresh){
							$("#trace_info_alltime_stats").append(
								"Since then, there have been a total of ",
								$("<span/>",{"data-alltimestats":"total"}).text(neatNumber(stats["total"]) + " " + requestNames["total"] + plural(stats["total"])),
								" blocked. That includes, ",
								$("<span/>",{"data-alltimestats":"webpage"}).text(neatNumber(stats["webpage"]) + " " + requestNames["webpage"] + plural(stats["webpage"])),
								" and ",
								$("<span/>",{"data-alltimestats":"media"}).text(neatNumber(stats["media"]) + " " + requestNames["media"] + plural(stats["media"])),
								" (tracking pixels, page ads).",
								"Trace also blocked, ",
								$("<span/>",{"data-alltimestats":"code"}).text(neatNumber(stats["code"]) + " " + requestNames["code"] + plural(stats["code"])),
								" (3rd party scripts, ping requests) and ",
								$("<span/>",{"data-alltimestats":"other"}).text(neatNumber(stats["other"]) + " " + requestNames["other"] + plural(stats["other"])),
								" to tracking servers."
							);
						} else {
							$("[data-alltimestats]").each(function(){
								let cat = $(this).data("alltimestats");
								$(this).text(neatNumber(stats[cat]) + " " + requestNames[cat] + plural(stats[cat]));
							});
						}
					}

					if (!wrcData.listType) return;

					let text = "";
					if (neatNumber(wrcData.listVer) === "0"){
						if (neatNumber(wrcData.listData.total) !== "0"){
							text += "<br />Trace is currently blocking <span>" + neatNumber(wrcData.listData.total) + "</span> records.";
						}
					} else {
						if (neatNumber(wrcData.listData.total) !== "0"){
							text += "<br />Trace is currently blocking <span>" + neatNumber(wrcData.listData.total) + "</span> records from the " + (wrcData.listOnline === 3 ? "cached " : "uncached ") + wrcData.listType + " blocklist. <br />";

							try{
								text += "The list contains: ";
								text += (wrcData.listData.domain !== 0 ? neatNumber(wrcData.listData.domain) + " domains, " : "");
								text += (wrcData.listData.host !== 0 ? neatNumber(wrcData.listData.host) + " hostnames, " : "");
								text += (wrcData.listData.tld !== 0 ? neatNumber(wrcData.listData.tld) + " TLDs, " : "");
								text += (wrcData.listData.url !== 0 ? neatNumber(wrcData.listData.url) + " URLs and " : "");
								text += (wrcData.listData.file !== 0 ? neatNumber(wrcData.listData.file) + " tracking scripts." : "");
							} catch(e){}

							text += "<br />WebController List Version: " + wrcData.listVer + ".";
						} else {
							text += "<br />Domain blocking is enabled.";
						}
					}

					$("#trace_info_current_wrc").html(text);
				});
			});
		},
		PresetWarn:function(){
			TraceBg(function(bg){
				if (bg.Prefs.Current.Main_Simple.presets.enabled){
					$("#trace_preset_warn").show();
				} else {
					$("#trace_preset_warn").hide();
				}
			});
		},
		AskFeedback:function(){
			$("#user_tip_title").html("&nbsp;Trace Feedback");
			$("#user_tip").empty().append(
				$("<span/>").text("Hi there! Would you like to leave feedback on Trace? (if not, no big deal, I'll not bother you again). Reviews and user-feedback really motivate me to make Trace even better. Thanks!"),
				$("<br />"),$("<br />"),
				$("<button/>").text("Contact Developer").on("click enter",function(){
					let openUrl = "mailto:absolutedouble@gmail.com";
					window.open(openUrl,"_blank");
					ls.Store("hasAskedForFeedback",true);
				}),
				$("<span/>").text(" "),
				$("<button/>").text("Leave Feedback").on("click enter",function(){
					let openUrl = "https://addons.mozilla.org/en-GB/firefox/addon/absolutedouble-trace/reviews/";
					if (!/Firefox/.test(navigator.userAgent)) openUrl = "https://chrome.google.com/webstore/detail/trace-online-tracking-pro/njkmjblmcfiobddjgebnoeldkjcplfjb/reviews";
					window.open(openUrl,"_blank");
					ls.Store("hasAskedForFeedback",true);
				}),
				$("<span/>").text(" "),
				$("<button/>").text("Dismiss").on("click enter",function(){
					ls.Store("hasAskedForFeedback",true);
					$(this).text("Done!");
					_UserCrashReportService({"UserDismissedFeedback":true});
				})
			);
		},
		NavigateFromHash:function(){
			if (!window.location.hash) return;
			if (!window.location.hash.includes("=")) return;

			let spl = window.location.hash.split("=");
			if (spl[0] !== "#view") return;

			let allowed = ["home","statistics","settings","requests","whitelist","information"];
			if (allowed.indexOf(spl[1]) !== -1){
				Opts.LoadPage(spl[1]);
			} else {
				if (spl[1] !== "wrc") return;

				Opts.LoadPage("requests");
				Opts.Config.Options("Pref_WebController");
			}

			window.location.hash = "";
		}
	},

	Protections:{
		SessionView:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advSessionTitle")),
				$("<h1/>").text("Soon"),
				$("<br />"),$("<br />"),
				Overlay.CloseUI()
			);
			Overlay.AssignCloseEvent(true);
		},
		UpdatePause:function(uiOnly){
			uiOnly = uiOnly === true || false;
			TraceBg(function(bg){
				let state = bg.Vars.paused;
				let newState = state;

				if (!uiOnly){
					newState = !state;
					bg.Vars.paused = newState;
					bg.Vars.pauseEnd = 999999;
					console.log("Updated pause state to "+newState);
				} else {
					console.log("Pause state: "+newState);
				}

				$("#pause_trace").text(newState === true ? lang("advHomePauseUnpause") : lang("advHomePausePause"));
			});
		}
	},

	AssignNavEvents:function(){
		// This is for the mobile navigation bar
		window.addEventListener("resize",function(){
			if (!$(".menutoggle").is(":visible")){
				if ($(window).width() > 700 && !$("#nav").is(":visible")) {
					$("#nav").show();
				}
			}
		},false);

		$(".side_el").each(function(){
			$(this).on("click enter", Opts.LoadPage).on("keypress",EnterTriggerClick);
		});

		$(".menutoggle").on("click enter",function(){
			$("#nav").fadeIn(250);
		});
	},
	LoadPage:function(override){
		if ($(".menutoggle").is(":visible")){
			$("#nav").fadeOut(250);
		}

		let load = override;
		if (typeof override !== "string"){
			load = $(this).data("load");
		}

		if (load === "information"){
			openNewTab(chrome.runtime.getURL("html/about.html"));
			return;
		}

		$(".view").addClass("hidden");
		$("#" + load).removeClass("hidden");

		switch(load){
			case "home":
				Opts.Interface.GetMainPage(false);
				Opts.Premium.GetStatus();
				document.title = "Trace";
				break;
			case "statistics":
				Opts.Stats.GetStatsData(function(d){
					Opts.Stats.MakeData(d,Opts.Stats.MakeGraph);
				});
				document.title = "Trace | Statistics";
				break;
			case "settings":
				if (ls.supported === true){
					if (ls.Read("showSettingsTutorial") === "true"){
						Tutorial.ShowSettings();
					}
				}
				document.title = "Trace | Settings";
				break;
			case "requests":
				if (ls.supported === true){
					if (ls.Read("showRequestTutorial") === "true"){
						Tutorial.ShowRequest();
					}
				}
				document.title = "Trace | Web Request Settings";
				break;
			case "whitelist":
				if (ls.supported === true){
					if (ls.Read("showScopeTutorial") === "true"){
						Tutorial.ShowScope();
					}
				}
				document.title = "Trace | Whitelist";
				break;
			case "options":
				document.title = "Trace | Options";
				break;
			default:
				console.error("Unknown page.",load);
				break;
		}
	},
	ResetTraceSettings:function(){
		if (confirm("Reset Trace settings to default? It will also remove your premium code from Trace's storage.")){
			TraceBg(function(bg){
				bg.Prefs.SetDefaults(function(){
					window.location.reload();
				});
			});
		}
	},
	AssignSettingClickEvents:function(){
		// Settings category events
		$(".setting_title").each(function(){
			$(this).on("click enter", function(){
				let newTab = $(this).data("content");

				if (Opts.currentSettingTab !== ""){
					$("#" + Opts.currentSettingTab).hide().fadeOut(200);
				}
				if (Opts.currentSettingTab !== newTab){
					$("#" + newTab).show().fadeIn(200);
					Opts.currentSettingTab = newTab;
				} else {
					Opts.currentSettingTab = "";
				}

			}).on("keypress",EnterTriggerClick);
		});

		// Settings info events
		$(".setting_info").each(function(){
			$(this).on("click enter", function(){
				var isVis = $("#" + $(this).data("info")).is(":visible");
				$(".hiddensettinginfo").hide();
				if (isVis === false){
					$("#" + $(this).data("info")).show();
				}
			}).on("keypress",EnterTriggerClick);
		});

		// Settings toggle events
		$(".setting_toggle, .trace_toggle").each(function(){
			$(this).on("click enter", function(){
				var that = this;
				TraceBg(function(bg){
					bg.Prefs.ToggleSetting($(that).data("toggle"),Opts.GetCurrentSettings);
				});
			}).on("keypress",EnterTriggerClick);
		});

		// Settings configuration events
		$(".setting_config").each(function(){
			$(this).on("click enter", function(){
				Opts.Config.Options($(this).data("config"));
			}).on("keypress",EnterTriggerClick);
		});

		// Settings order events
		$(".setting_order").each(function(){
			$(this).on("click enter",Opts.ExecutionOrder.SwapProtection).on("keypress",EnterTriggerClick);
		});

		// Direct toggle events
		$(".direct_toggle").each(function(){
			$(this).on("click enter", function(){
				var name = $(this).data("toggle");
				Opts.DirectSetting(this,name,true);
			}).on("keypress",EnterTriggerClick);
		});

		$("#setting_backuprestore").on("click enter",Opts.Backup.Interface);
		$("#setting_reset").on("click enter",Opts.ResetTraceSettings);
	},
	GetCurrentSettings:function(){
		// Get current settings
		TraceBg(function(bg){
			var settingsList = bg.Prefs.Current;

			$(".setting_toggle").each(function(){
				let status = $(this).data("toggle"), obj;

				if (status.includes(".")){
					let a = status.split(".");
					obj = settingsList[a[0]][a[1]];
				} else {
					obj = settingsList[status];
				}

				if (typeof obj === "undefined") return;

				$(this).text((obj.enabled ? lang("advSettingsCtrlEnabled") : lang("advSettingsCtrlDisabled")));
			});
			$(".isetting_toggle").each(function(){
				let status = $(this).data("toggle"), enabled = false;
				if (status.includes(".")){
					let a = status.split(".");
					enabled = settingsList[a[0]][a[1]].enabled;
				} else {
					enabled = settingsList[status].enabled;
				}
				$(this).text((enabled === true ? lang("advSettingsCtrlEnabled") : lang("advSettingsCtrlDisabled")));
			});
			$(".direct_toggle").each(function(){
				let status = $(this).data("toggle");
				Opts.DirectSetting(this,status,false);
			});
			$(".trace_toggle").each(function(){
				let status = $(this).data("toggle"), enabled = false;
				if (status.includes(".")){
					let a = status.split(".");
					enabled = settingsList[a[0]][a[1]].enabled;
				} else {
					enabled = settingsList[status].enabled;
				}
				$(this).text((enabled === true ? lang("advSettingsCtrlEnabled") : lang("advSettingsCtrlDisabled")));
			});
		});
	},
	UpdateBlocklist:function(){
		TraceBg(function(bg){
			if (bg.Prefs.Current.Pref_WebController.enabled !== true){
				bg.Prefs.Current.Pref_WebController.enabled = true;
			}
			bg.Web.BlocklistLoader(true);
		});
		$(this).text("Working...");
	},
	Premium:{
		eMessages:[
			"Sorry, that premium code didn't work. If you are having issues, please don't hesitate to contact me.",
			"Sorry, your premium code isn't active yet. Please wait a few hours then try again.",
			"Sorry, your premium code has been revoked. If you believe this is an error, please contact me.",
			"ERROR:Code_Paused - Please send me an email"
		],
		GetStatus:function(){
			TraceBg(function(bg){
				var code = bg.Vars.Premium;

				if (typeof(code) !== "string" || code === ""){
					$("#trace_premstatus").show();
					$("#premium_status, #info_premium_status").empty().append(
						$("<span/>",{class:"premium_inner"}).text("Support Trace's development! Buy premium to gain access to the Premium blocklist"),
						$("<br/>"),$("<br/>"),
						$("<button/>").on("click enter",Opts.Premium.EnterCode).text("Enter Code"),
						" ",
						$("<button/>").on("click enter",function(){
							openNewTab("https://absolutedouble.co.uk/trace/premium");
						}).text(lang("advPremiumCtrlBuy")),
						" ",
						$("<button/>").on("click enter",function(){
							openNewTab("https://absolutedouble.co.uk/trace/");
						}).text(lang("advTraceCtrlWebsite"))
					);
					return;
				}

				$("#premium_status,#info_premium_status").empty().append(
					$("<span/>").text(lang("advPremiumMsgThanks")),
					$("<br/>"),$("<br/>"),
					$("<button/>").text(lang("advPremiumCtrlDisable")).click(Opts.Premium.RemoveCode),
					" ",
					$("<button/>").text(
						(bg.Prefs.Current.Pref_WebController.enabled === true ? "Force Blocklist Update" : "Enable Web Request Controller")
					).on("click enter",Opts.UpdateBlocklist),
					" ",
					$("<button/>").on("click enter",function(){
						openNewTab("https://absolutedouble.co.uk/trace/");
					}).text(lang("advTraceCtrlWebsite"))
				);
			});
		},
		RemoveCode:function(){
			TraceBg(function(bg){
				if (!confirm("Are you sure you wish to remove your premium code from Trace?\nThis will not delete your code from Trace's servers.\n\nYour code:\n" + bg.Vars.Premium)) return;

				// TODO: Move these functions to background page
				// Update settings
				bg.Prefs.Set("Main_Trace.PremiumCode","");
				Opts.Blocklist.InstallList("a00000001",false);
				Opts.Blocklist.InstallList("a00000003",false);

				bg.Web.ClearDomainCache();

				$(".premium_inner").empty().append(
					$("<h1/>").text(lang("miscMsgPleaseWait"))
				);

				Opts.Interface.GetMainPage(false);
				Opts.Premium.GetStatus();
				setTimeout(function(){
					Opts.Blocklist.isPremium = (typeof bg.Vars.Premium !== "undefined" ?
						(bg.Vars.Premium.length !== 0) : false);
				},1500);
			});
		},
		EnterCode:function(){
			var dto = new Date();
			var attn = 0, atme = 0;
			var ntme = Math.round(dto.getTime()/1000);

			if (ls.supported === true){
				if (typeof ls.Read("attn") === "string" && typeof ls.Read("atme") === "string"){
					attn = parseInt(ls.Read("attn"));
					atme = parseInt(ls.Read("atme"));

					attn++;
				}

				ls.Store("attn",attn);
				ls.Store("atme",ntme);
			} else {
				alert("There was an issue with your browser's localStorage!");
			}

			var uTimeOut = function(t){
				$("#drop_message").empty().append(
					$("<h1/>").text(lang("advPremiumMsgTitle")),
					$("<h2/>").text("Please wait " + t + " minutes to try again." + (t === "10" ? " Might want to make a cup of tea to pass the time." : "")),
					$("<span/>").text("The timer resets every time you re-enter this popup, wait " + t + " minutes before trying again."),$("<br />"),$("<br />"),
					$("<button/>",{"title":"I need help"}).text("Help").click(Opts.Premium.HelpDialog),
					Overlay.CloseUI()
				);
				Overlay.AssignCloseEvent();
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
				$("<h1/>").text(lang("advPremiumMsgTitle")),
				$("<h2/>").text(lang("advPremiumMsgThanks")),
				$("<input/>",{
					"placeholder":"Premium Code",
					"id":"premium_code_box",
					"class":"text_box boxmod_large"
				}).on("keypress",function(e){
					if (e.keyCode === 13) Opts.Premium.Go();
				}),
				$("<br />"),$("<br />"),
				$("<button/>",{"title":"Activate premium code"}).text("Activate").on("click enter",Opts.Premium.Go),
				$("<button/>",{"title":"I need help"}).text("Help").on("click enter",Opts.Premium.HelpDialog),
				Overlay.CloseUI()
			);
			Overlay.AssignCloseEvent(true);
		},
		HelpDialog:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advPremiumMsgHelp")),
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
				Overlay.CloseUI()
			);
			Overlay.AssignCloseEvent(true);
		},
		Go:function(){
			if ($("#premium_code_box") === null) return;

			Overlay.DoClose();

			var pt = $("#premium_inner");
			var eden = $("#premium_code_box").val();
			var lost = "M2ysyaSd58sqt4zVGicIfbMYac8dqhtrk5yyA8tiG31gZ";

			TraceBg(function(bg){
				bg._UserCrashReportService({"PremiumTrace":"TryCode","CodeAttempt":eden},true);
			});

			if (eden.length < 5){
				pt.text("Invalid code.");
				return;
			}

			let u = "https://trace-extension.absolutedouble.co.uk/app/weblist.php?p=";
			u += btoa(eden);
			u += "&s=" + btoa(lost);
			u += "&d=" + btoa((Math.round((new Date()).getTime()/1000))*2);
			u += "&j=M&a=premium_x";
			u += "&c=" + makeRandomID(5);

			function bgNotify(msg,sect){
				TraceBg(function(bg){
					bg.Trace.Notify(msg,sect);
				});
			}

			$.ajax({
				url:u,
				cache:false,
				method:"GET",
				timeout:27000,
				dataType:"text",
				beforeSend:function(){
					pt.text("Checking code...");
				},
				success:function(l){
					if (l !== lost) {
						bgNotify(Opts.Premium.eMessages[0], "optd");
						pt.text(Opts.Premium.eMessages[0]);
						return;
					}

					pt.text("Applying Code...");

					TraceBg(function(bg){
						bg.Prefs.Set("Main_Trace.PremiumCode", eden);
						bg._UserCrashReportService({
							"PremiumTrace": "AcceptedCode",
							"CodeUsed": eden
						}, true);
					});

					// Enable premium blocklists
					Opts.Blocklist.InstallList("a00000001",true);
					Opts.Blocklist.InstallList("a00000003",true);

					if (ls.supported === true){
						localStorage.removeItem("attn");
						localStorage.removeItem("atme");
					}

					pt.text(lang("miscMsgPleaseWait"));

					if (chrome.extension.getBackgroundPage().Prefs.Current.Pref_WebController.enabled === true){
						pt.text("Premium blocklist will be used when domain blocking is enabled in setttings.");
						return;
					}

					TraceBg(function(bg){
						bg.Web.BlocklistLoader(true);

						setTimeout(function(){
							Opts.Blocklist.isPremium = (typeof bg.Vars.Premium !== "undefined" ?
								(bg.Vars.Premium.length !== 0) : false);
						},1500);

						Opts.Interface.GetMainPage(false);
						Opts.Premium.GetStatus();
					});
				},
				error:function(e){
					if (e.status === 403 || e.status === 402){
						// Choose a status message to show
						let a = Opts.Premium.eMessages[0];
						if (e.responseText === "CodeRevokedError") a = Opts.Premium.eMessages[2];
						if (e.responseText === "CodeInactiveError") a = Opts.Premium.eMessages[1];
						if (e.responseText === "CodePauseError") a = Opts.Premium.eMessages[3];

						bgNotify(a,"optd");
						pt.text(a);
						return;
					}
					bgNotify("Server communication error!","optd");
					pt.text("Error contacting server: " + e.status);
				}
			});
		}
	},

	DirectSetting:function(obj,name,change){
		// This very large function handles the privacy settings directly in the browser (Privacy API)
		if (!chrome.privacy) {
			$("#trace_sbrowser").hide();
			return;
		}

		switch (name){
			case "pref_netpredict":
				if (!chrome.privacy.hasOwnProperty("network") || typeof chrome.privacy.network.networkPredictionEnabled === "undefined") {
					$("#row_netpredict").hide();
					return;
				}

				chrome.privacy.network.networkPredictionEnabled.get({},function(details){
					var v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.network.networkPredictionEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert(lang("miscMsgSettingError"));
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
				if (!chrome.privacy.hasOwnProperty("services") || typeof chrome.privacy.services.alternateErrorPagesEnabled === "undefined" || !chrome.privacy.services.alternateErrorPagesEnabled) {
					$("#row_alterrpage").hide();
					return;
				}

				chrome.privacy.services.alternateErrorPagesEnabled.get({},function(details){
					let v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.alternateErrorPagesEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert(lang("miscMsgSettingError"));
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
				if (!chrome.privacy.hasOwnProperty("services") || typeof chrome.privacy.services.autofillEnabled === "undefined" || !chrome.privacy.services.autofillEnabled) {
					$("#row_autofill").hide();
					return;
				}

				chrome.privacy.services.autofillEnabled.get({},function(details){
					let v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.autofillEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert(lang("miscMsgSettingError"));
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
				if (!chrome.privacy.hasOwnProperty("services") || typeof chrome.privacy.services.safeBrowsingExtendedReportingEnabled === "undefined") {
					$("#row_sbextendedrep").hide();
					return;
				}

				chrome.privacy.services.safeBrowsingExtendedReportingEnabled.get({},function(details){
					let v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.services.safeBrowsingExtendedReportingEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert(lang("miscMsgSettingError"));
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
				if (!chrome.privacy.hasOwnProperty("websites") || typeof chrome.privacy.websites.hyperlinkAuditingEnabled === "undefined") {
					$("#row_hyperlinkaudit").hide();
					return;
				}

				chrome.privacy.websites.hyperlinkAuditingEnabled.get({},function(details){
					let v = details.value;
					if (change){
						if (details.levelOfControl === 'controllable_by_this_extension' || details.levelOfControl === 'controlled_by_this_extension') {
							chrome.privacy.websites.hyperlinkAuditingEnabled.set({"value":!v,"scope":"regular"},function (){
								$(obj).text((!v === true ? "Unprotected" : "Protected"));
								if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) alert(lang("miscMsgSettingError"));
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
			default:
				alert("Unknown setting.."+name);
				break;
		}
	},

	Backup:{
		Data:{},
		Interface:function(){
			$("#drop_message").empty().append(
				$("<h1/>",{"id":"backuprestore_title"}).text(lang("advBackupMsgTitle")),
				$("<section/>",{"id":"backuprestore_section"}).append(
					$("<span/>").text("The backup will save all of your settings, whitelist entries and statistics, you can choose what to restore. The file will be in JSON format and is editable."),
					$("<br/>"),$("<br/>"),
					$("<button/>",{"style":"font-size:1em"}).text(lang("advBackupCtrlCreate")).on("click",Opts.Backup.Create),
					$("<h2/>").text(lang("advRestoreMsgTitle"))
				),
				$("<input/>",{
					"type":"file",
					"accept":".json",
					"style":"font-size:1.1em"
				}).on("change",Opts.Backup.Restore),
				$("<p/>",{"id":"restore_info"})
			);
			Overlay.AssignCloseEvent(true);
		},
		Create:function(){
			TraceBg(function(bg){
				bg.Prefs.CreateBackup(function(raw){
					MakeDownload("TraceSettings",JSON.stringify(raw,null,4));
				});
			});
		},
		Restore:function(evt){
			if (!this.files.length) return;

			var reader = new FileReader();
			reader.onload = function(){
				try{
					Opts.Backup.Data = JSON.parse(reader.result);
				} catch(e){
					Opts.Backup.Data = {};
				}
				Opts.Backup.RestoreConfirmation();
			};
			reader.readAsText(this.files[0]);
		},
		RestoreConfirmation:function(){
			// Check backup file..
			let keys = Object.keys(Opts.Backup.Data);
			let redFlags = 0;
			if (Opts.Backup.Data["backupTime"] === undefined) redFlags++;
			if (Opts.Backup.Data["version"] === undefined) redFlags++;
			if (Opts.Backup.Data["data"] === undefined) redFlags++;
			if (keys.length > 10) redFlags++;

			if (redFlags >= 3){
				$("#restore_info").empty().append(
					$("<h2/>").text(lang("advRestoreMsgInvalid"))
				);
				return;
			}

			var backupIdentifier = "";

			var versionInfo = $("<span/>").text("This backup is the same version as your current version of Trace.");
			if (Opts.Backup.Data.version !== chrome.runtime.getManifest().version){
				versionInfo = $(
					$("<p/>").append(
						$("<strong/>").text("Trace Backup Version: "),
						$("<span/>").text(Opts.Backup.Data.version || "Unknown.")
					),
					$("<p/>").append(
						$("<strong/>").text("Trace Current Version: "),
						$("<span/>").text(chrome.runtime.getManifest().version || "Unknown.")
					)
				);
			}

			try{
				var computed = chrome.extension.getBackgroundPage().MD5(JSON.stringify(Opts.Backup.Data["data"],null,2));
				if (computed !== Opts.Backup.Data.computed.verified){
					if (Opts.Backup.Data.computed.verified !== null){
						alert("Backup invalid!");
						return;
					}
				}
			} catch(e){
				_UserCrashReportService(e)
			}

			$("#backuprestore_section").hide();
			$("#backuprestore_title").text(lang("advRestoreMsgTitle"));

			$("#restore_info").empty().append(
				$("<h2/>").text(lang("advRestoreMsgSubhead")),
				$("<p/>").append(
					$("<strong/>").text("Date: "),
					$("<span/>").text(Opts.Backup.Data.backupTime || "Unknown.")
				),
				versionInfo,
				$("<p/>").text(backupIdentifier),
				$("<button/>",{"title":"Keep storage and write restore over current settings","class":"small"}).text("Restore backup").on("click enter",Opts.Backup.NormalRestore),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"title":"Wipe storage and restore","class":"small"}).text("Clear storage & Restore backup").on("click enter",Opts.Backup.ClearRestore)
			);
		},
		NormalRestore:function(){
			var data = {};
			data = Opts.Backup.Data.data;

			TraceBg(function(bg){
				bg.Prefs.s.set(data,function(){
					bg.window.location.reload();
					window.location.href = "#backupRestored";
					window.location.reload(true);
				});
			});
		},
		ClearRestore:function(){
			TraceBg(function(bg){
				bg.Prefs.ClearStorage();
				Opts.Backup.NormalRestore();
			});
		}
	},
	ExecutionOrder:{
		ReloadInterface:function(){
			TraceBg(function(bg){
				bg.Prefs.ReturnExecOrder(Opts.ExecutionOrder.CreateInterface);
			});
		},
		CreateInterface:function(p){
			$("[data-order]").each(function(){
				let item = $(this).data("order");
				$(this).text(p.AllPage.indexOf(item) !== -1 ? lang("advSettingsRunsAllPages") : lang("advSettingsRunsPerPage"));
			});
		},
		SwapProtection:function(){
			var that = $(this).data("order");
			TraceBg(function(bg){
				bg.Prefs.ChangeExecOrder(that,Opts.ExecutionOrder.ReloadInterface);
			});
		}
	},
	Config:{
		SelectedOption:"",
		CurrentSettings:{},
		SettingName:{
			audioBuffer:"Modify Audio Channel Functions (e.g. copyFromChannel)",
			audioData:"Modify Audio Data Functions (e.g. getFloatFrequencyData)",
			audioOfflineMain:"Modify Offline AudioContext Object (More commonly used for Tracking)",
			audioMain:"Modify Main AudioContext Object (Breaks lots of websites)",

			rmChromeConnected:"Remove X-Chrome-Connected headers from web requests",
			rmChromeUMA:"Remove X-Chrome-UMA-Enabled headers from web requests",
			rmChromeVariations:"Remove X-Chrome-Variations headers from web requests",
			rmClientData:"Remove X-Client-Data headers from web requests (Will break most Google websites)",

			element:"Element:",
			range:"Range:",
			getclientrects:"getClientRects function",
			getboundingclientrects:"getBoundingClientRects function",

			pingRequest:"Block 'ping' requests in the browser (Recommended)",
			sendBeacon:"Disable the javascript navigator.sendBeacon function on webpages",
			removePingAttr:"Remove ping tracking from web links",

			countly:"Countly",
			fbevents:"Facebook Events",
			google:"Google Tracking",
			piwik:"Matomo (Piwik)",
			segment:"Segment",

			deviceEnumeration:"Device Enumeration protection",
			wrtcInternal:"Stop WebRTC exposing your local IPv4 address",
			wrtcPeerConnection:"Disable the RTCPeerConnection javascript object (*)",
			wrtcDataChannel:"Disable the RTCDataChannel javascript object (*)",
			wrtcRtpReceiver:"Disable the RTCRtpReceiver javascript object (*)"
		},
		Options:function(setting){
			Opts.Config.SelectedOption = setting;

			TraceBg(function(bg){
				//Trace.Config.CurrentSettings = bg.Prefs.GetSetting();
				Opts.Config.CurrentSel = bg.Prefs.GetSetting(Opts.Config.SelectedOption);

				let enabled = false;
				if (Opts.Config.SelectedOption.includes(".")){
					enabled = bg.Prefs.GetSetting(Opts.Config.SelectedOption).enabled;
				} else {
					enabled = Opts.Config.CurrentSel.enabled;
				}

				Opts.Config.OptionsView(setting,enabled);
			});
		},
		OptionsView:function(setting,enabled){
			switch(setting){
				case "Pref_AudioFingerprint":
					Opts.Config.s.AudioSettings();
					break;
				case "Pref_GoogleHeader":
					Opts.Config.s.ChromeHeaderSettings();
					break;
				case "Pref_ClientRects":
					Opts.Config.s.ClientRectsSettings();
					break;
				case "Pref_CommonTracking":
					Opts.Config.s.CommonTrackingSettings();
					break;
				case "Pref_FontFingerprint":
					Opts.Config.s.FontFingerprintingSettings();
					break;
				case "Pref_WebRTC":
					Opts.Config.s.WebRTCSettings();
					break;
				case "Pref_PingBlock":
					Opts.Config.s.PingBlockSettings();
					break;
				case "Pref_BatteryApi":
					Opts.Config.s.BatteryAPISettings();
					break;
				case "Pref_NetworkInformation":
					Opts.Config.s.NetworkAPISettings();
					break;
				case "Pref_HardwareSpoof":
					Opts.HardwareSpoof.OpenDialog();
					break;
				case "Pref_WebGLFingerprint":
					Opts.WebGL.OpenDialog();
					break;
				case "Pref_CanvasFingerprint":
					Opts.CanvasRGBA.OpenDialog();
					break;
				case "Pref_ScreenRes":
					Opts.ScreenRes.OpenDialog();
					break;
				case "Pref_UserAgent":
					Opts.UserAgent.OpenDialog();
					break;
				case "Pref_IPSpoof":
					Opts.PIPSpoof.OpenDialog();
					break;
				case "Pref_WebController":
					Opts.Blocklist.OpenDialog();
					break;
				case "Pref_CookieEater":
					Opts.CookieEaterUI.OpenDialog();
					break;
				case "Pref_ReferHeader":
					Opts.RefererHeader.OpenDialog();
					break;
				case "Main_Interface":
					Opts.UICustomiser.OptionsInterface();
					break;
				default:
					console.error("Method not supported yet.");
					break;
			}

			if (enabled !== true){
				$("#drop_message").prepend(
					$("<h1/>",{"class":"setting_disabled"}).text(lang("advSettingsMsgDisabled"))
				);
			}
		},
		SaveConf:function(a){
			if (!a) a = this;

			var s = $(a).data("conf"), v = false;
			if ($(a).is(":checked")){
				v = true;
			}
			TraceBg(function(bg){
				bg.Prefs.Set(s,v);
			});
		},
		GetConf:function(){
			var el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":Opts.Config.SelectedOption
			}).append(
				$("<span/>").text(lang("advSettingsMsgSwitch"))
			);

			function makeCheckbox(opts,name){
				return $("<div/>",{
					"class":"setting_conf_opt"
				}).append(
					$("<label/>",{
						"for":opts["id"],
						"class":"checkbox_cont"
					}).text(name).append(
						$("<input/>",opts).on("click enter",function(){
							Opts.Config.SaveConf(this);
						}),
						$("<span/>",{"class":"ccheck"})
					)
				);
			}

			for (let i in Opts.Config.CurrentSel){
				if (typeof Opts.Config.CurrentSel[i] !== "object") continue;

				if (!Opts.Config.CurrentSel[i].hasOwnProperty("enabled")){
					// Create option name
					if (!!Opts.Config.SettingName[i]){
						el.append(
							$("<h2/>").text(Opts.Config.SettingName[i] || i)
						);
					}

					for (let j in Opts.Config.CurrentSel[i]){
						if (j === "enabled" || Opts.Config.CurrentSel[i][j] === undefined) continue;
						if (Object.keys(Opts.Config.CurrentSel[i][j]).length > 1) continue;

						let opts = {
							"type":"checkbox",
							"id":"c_opt_"+makeRandomID(16),
							"data-conf":Opts.Config.SelectedOption + "." + i + "." + j + ".enabled"
						};

						if (Opts.Config.CurrentSel[i][j].enabled === true) opts["checked"] = "checked";

						el.append(makeCheckbox(opts,Opts.Config.SettingName[j] || j));
					}

					continue;
				}

				let opts = {
					"type":"checkbox",
					"id":"c_opt_"+makeRandomID(16),
					"data-conf":Opts.Config.SelectedOption + "." + i + ".enabled"
				};

				if (Opts.Config.CurrentSel[i].enabled === true) opts["checked"] = "checked";

				el.append(makeCheckbox(opts,Opts.Config.SettingName[i] || i));
			}

			el.append(
				$("<span/>",{"class":"regular"}).text(lang("advSettingsMsgImmediate"))
			);

			return el;
		},
		s:{
			AudioSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_AudioFingerprint"]),
					cont,
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			BatteryAPISettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_BatteryApi"]),
					cont,
					$("<br/>"),
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			ChromeHeaderSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_GoogleHeader"]),
					cont,
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			ClientRectsSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_ClientRects"]),
					cont,
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			CommonTrackingSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_CommonTracking"]),
					cont,
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			FontFingerprintingSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_FontFingerprint"]),
					cont,
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			NetworkAPISettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_NetworkInformation"]),
					cont,
					$("<br/>"),
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			PingBlockSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_PingBlock"]),
					cont,
					$("<br/>"),
					$("<span/>").text("If you're looking for Hyperlink Auditing protection then you can find it under 'Browser Settings'"),
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
			},
			WebRTCSettings:function(){
				let cont = Opts.Config.GetConf();
				$("#drop_message").empty().append(
					$("<h1/>").text(SettingNames["Pref_WebRTC"]),
					cont,
					$("<br/>"),
					$("<span/>").text("WebRTC is used for applications such as video calling. Disabling javascript objects will most likely break lots of websites that rely on WebRTC."),$("<br/>"),
					$("<span/>").text("* Options with an asterisk are optional settings and should only be used if you know what you're doing"),$("<br/>"),
					Overlay.CloseUI(),
					$("<br/>"),$("<br/>")
				);
				Overlay.AssignCloseEvent(true);
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
			TraceBg(function(bg){
				$("#pipspoof_currentip").html("<strong>Current IP:</strong> " + bg.Trace.i.CurrentFakeIP || "No IP Set");
			});
		},
		UserCustomIP:function(){
			var elID = this.id;
			var potential = $(this).val();

			var valid = Opts.PIPSpoof.ValidIP(potential);
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
				if (Opts.PIPSpoof.IPSaveTimeout) clearTimeout(Opts.PIPSpoof.IPSaveTimeout);

				Opts.PIPSpoof.IPSaveTimeout = setTimeout(function(){
					TraceBg(function(bg){
						bg.Prefs.Set("Pref_IPSpoof.traceIP.user_set",potential);
					});
					$("#" + elID).css({
						"background":"#70ff71",
						"color":"#fff"
					});
					Opts.PIPSpoof.UpdateIPText();
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
				if (Opts.PIPSpoof.ViaSaveTimeout) clearTimeout(Opts.PIPSpoof.ViaSaveTimeout);

				Opts.PIPSpoof.ViaSaveTimeout = setTimeout(function(){
					TraceBg(function(bg){
						bg.Prefs.Set("Pref_IPSpoof.traceVia.value",potential);
					});
					$("#" + elID).css({
						"background":"#70ff71",
						"color":"#fff"
					});
				},900);
			}
		},
		OpenDialog:function(){
			let el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":Opts.Config.SelectedOption
			});

			el.append(
				$("<span/>",{
					"id":"pipspoof_currentip"
				}).text("Retrieving IP..."),$("<br/>")
			);

			let configOpts = ["useClientIP","useForwardedFor","traceVia","traceIP"];
			for (let i = 0, l = configOpts.length;i<l;i++){
				let opts = {
					"type":"checkbox",
					"id":"c_opt_"+makeRandomID(16),
					"data-conf":Opts.Config.SelectedOption + "." + configOpts[i] + ".enabled",
					"data-special":configOpts[i]
				};
				if (Opts.Config.CurrentSel[configOpts[i]].enabled === true){
					opts["checked"] = "checked";
				}

				el.append(
					$("<div/>",{
						"class":"setting_conf_opt"
					}).append(
						$("<label/>",{
							"for":opts["id"],
							"class":"checkbox_cont"
						}).text(Opts.PIPSpoof.StringNames[configOpts[i]] || configOpts[i]).append(
							$("<input/>",opts).on("click enter",function(){
								Opts.Config.SaveConf(this);

								let s = $(this).data("special");
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
									Opts.PIPSpoof.UpdateIPText();
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
					"style":(Opts.Config.CurrentSel["traceIP"].enabled ? "display:none" : ""),
					"value":(Opts.Config.CurrentSel["traceIP"].user_set)
				}).on("keyup enter",Opts.PIPSpoof.UserCustomIP),
				$("<input/>",{
					"type":"text",
					"id":"pip_custvia",
					"placeholder":"Custom Via Header",
					"style":(Opts.Config.CurrentSel["traceVia"].enabled ? "display:none" : ""),
					"value":(Opts.Config.CurrentSel["traceVia"].value)
				}).on("keyup enter",Opts.PIPSpoof.UserCustomVia)
			);

			el.append(
				$("<br/>"),
				$("<a/>",{
					"href":"https://www.whatismyip.com/",
					"title":"Check IP here"
				}).text("This will trick some websites, like this one")
			);

			$("#drop_message").empty().append($("<h1/>").text("Configure Proxy IP Header Spoofing"),el);
			Opts.PIPSpoof.UpdateIPText();
			Opts.IPTextRefresh = setInterval(Opts.PIPSpoof.UpdateIPText,2500);

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);
			$("#overlay_close").unbind("click").click(function(){
				clearInterval(Opts.IPTextRefresh);
				Overlay.DoClose();
			});
			$(window).unbind("click").click(function(e){
				if ($(e.target)[0].id === "overlay_message"){
					clearInterval(Opts.IPTextRefresh);
					Overlay.DoClose();
				}
			});
		}
	},
	Stats:{
		GraphOptions:{
			barValueSpacing:10,
			title:{
				display:true,
				fontSize:28,
				text:lang("miscMsgLoading")
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
		},
		GraphData:undefined,
		GraphElm:undefined,
		GraphObj:undefined,

		AssignGraphOptions:function(){
			$("#stats_download").on("click enter",function(){
				Opts.Stats.ShowDownloadOptions();
			});
			$("#stats_wipe").on("click enter",function(){
				Opts.Stats.DeleteStats();
			});
			$("#graph_datacontrol, #graph_contbreakdown").change(function(){
				Opts.Stats.MakeData(Opts.Stats.GraphData,Opts.Stats.MakeGraph)
			});
		},
		GetStatsData:function(cb){
			TraceBg(function(bg){
				bg.Stats.Data(function(d){
					Opts.Stats.GraphData = d;
					if (cb) cb(d);
				});
			});
		},
		GraphColors:function(req){
			let list = [
				'rgba(255,99,132,',
				'rgba(54,162,235,',
				'rgba(255,206,86,',
				'rgba(75,192,192,',
				'rgba(153,102,255,',
				'rgba(153,102,104,',
				'rgba(255,159,64,'
			];
			let bar = [], border = [];
			if (req !== "rand"){
				for (let i = 0;i<req;i++){
					bar[i] = list[i] + "0.4)";
					border[i] = list[i] + "1)";
				}
				return [bar,border];
			} else {
				let chose = list[Math.floor(Math.random() * list.length)];
				bar = chose + "0.4)";
				border = chose + "1)";
				return [bar,border];
			}
		},
		MakeData:function(dataset,cb){
			var dControl = parseInt($("#graph_datacontrol").val());
			var cBreakDown = $("#graph_contbreakdown").val();

			var rData = {};
			let dLen = Object.keys(dataset).length;

			if (dLen === 0){
				$("#graph_controls").hide();
				if (typeof chrome.extension.getBackgroundPage().Prefs.Current.Main_Trace === "undefined"){
					$("#graph_container").html("Error.<br /><br />Please try restarting your browser.<br />").css("height","auto");
					return;
				}
				if (chrome.extension.getBackgroundPage().Prefs.Current.Main_Trace.ProtectionStats.enabled === true){
					$("#graph_container").html("Statistics are enabled, but there is no data available yet.<br /><br />Try browsing the web a bit and then check back here!<br />").css("height","auto");
				} else {
					Opts.Stats.ShowDisabled(dLen);
				}
				return;
			}

			if (chrome.extension.getBackgroundPage().Prefs.Current.Main_Trace.ProtectionStats.enabled === false){
				$("#graph_controls").hide();
				Opts.Stats.ShowDisabled(dLen);
			}

			if (dControl === 1){
				var today = dataset[Object.keys(dataset)[Object.keys(dataset).length-1]];
				if (cBreakDown === "type"){
					var colors = Opts.Stats.GraphColors(4);
					rData["title"] = lang("advStatsGraphTodayType");
					rData["labels"] = ["Content","Media","Code","Other"];
					rData["data"] = [{
						data:[today.webpage,today.media,today.code,today.other],
						backgroundColor:colors[0],
						borderColor:colors[1],
						borderWidth:1
					}];
				} else {
					var colors = Opts.Stats.GraphColors("rand");
					rData["title"] = lang("advStatsGraphTodayTotal");
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

					var colors = Opts.Stats.GraphColors(4);
					for (let i = 0;i < dControl;i++){
						rData["data"].push({
							label:keys[i],
							data:[vals[i].webpage,vals[i].media,vals[i].code,vals[i].other],
							backgroundColor:colors[0],
							borderColor:colors[1],
							borderWidth:1
						});
					}
				} else {
					var colors = Opts.Stats.GraphColors(dControl);
					rData["title"] = "Total requests blocked in the past " + dControl + " days";
					rData["labels"] = [];
					rData["data"] = [{
						backgroundColor:colors[0],
						borderColor:colors[1],
						borderWidth:1,
						data:[]
					}];

					if (dControl >= 5){
						Opts.Stats.GraphObj.options.barValueSpacing = 20;
					}

					for (let i = 0;i < dControl;i++){
						rData["labels"].push(keys[i]);
						rData["data"][0].data.push(vals[i].webpage+vals[i].media+vals[i].code+vals[i].other);
					}
				}

			}

			cb(rData);
		},
		MakeGraph:function(d){
			if (!d) return;
			Opts.Stats.GraphObj.data.datasets = d["data"];
			Opts.Stats.GraphObj.data.labels = d["labels"];
			Opts.Stats.GraphObj.options.title.text = d["title"];
			Opts.Stats.GraphObj.update(0);
		},
		StructureGraph:function(){
			if (typeof Opts.Stats.GraphElm === "undefined"){
				try {
					Opts.Stats.GraphElm = document.getElementById("graph").getContext("2d");
				} catch(e) {
					console.error(e);
				}
			}

			Chart.defaults.global.defaultFontColor = "#fff";
			Opts.Stats.GraphObj = new Chart(Opts.Stats.GraphElm, {
				type:'bar',
				data:{
					labels:[],
					datasets:{}
				},
				options:Opts.Stats.GraphOptions
			});
		},
		ShowDisabled:function(l){
			$("#graph_container").html("Enable Protection Statistics to use this feature.<br /><br />").append(
				$("<button/>").text("Enable").click(function(){
					$("#setting_protstats").click();
					$(this).text(lang("miscMsgPleaseWait"));

					if (l !== 0){
						window.location.reload();
					}

					setTimeout(function(){
						Opts.Stats.GetStatsData(function(d){
							Opts.Stats.MakeData(d,Opts.Stats.MakeGraph);
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
				}).text("CSV").click(function(){Opts.Stats.DownloadStats("csv");}),
				$("<span/>").text(" "),
				$("<button/>",{
					"title":"Download Statistics in TSV format"
				}).text("TSV").click(function(){Opts.Stats.DownloadStats("tsv");}),
				$("<span/>").text(" "),
				$("<button/>",{
					"title":"Download Statistics in XML format"
				}).text("XML").click(function(){Opts.Stats.DownloadStats("xml");}),
				$("<span/>").text(" "),
				$("<button/>",{
					"title":"Download Statistics in JSON format"
				}).text("JSON").click(function(){Opts.Stats.DownloadStats("json");}),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"title":lang("miscCtrlClose")}).text(lang("miscCtrlClose")).on("click enter",Overlay.DoClose)
			);
			Overlay.AssignCloseEvent(true);
		},
		DownloadStats:function(file = "csv"){
			var date, returnd;

			TraceBg(function(bg){
				bg.Stats.Data(function(d) {
					if (file === "csv" || file === "tsv") {
						let s = ",";
						if (file === "tsv") s = "\t";

						returnd = 'Date' + s + 'Web' + s + 'Media' + s + 'Code' + s + 'Other' + s + 'Total';

						for (let i = 0, l = Object.keys(d).length; i < l; i++) {
							let currentd = Object.keys(d)[i];
							let obj = d[currentd];
							returnd += "\n" + currentd +
								s + obj.webpage +
								s + obj.media +
								s + obj.code +
								s + obj.other +
								s + (obj.webpage + obj.media + obj.code + obj.other);
						}

						Opts.Stats.CreateDownload(returnd, file);

					} else if (file === "xml") {

						date = getDateStrings();
						returnd = '<?xml version="1.0" encoding="UTF-8"?>\n';
						returnd += "<tracestats downloaded='" + (date[0] + "-" + date[1] + "-" + date[2]).toString() + "'>";

						for (let i = 0, l = Object.keys(d).length; i < l; i++) {
							let currentd = Object.keys(d)[i];
							let obj = d[currentd];
							returnd += "\n\t<stats date='" + currentd + "'>" +
								'\n\t\t<webpages>' + obj.webpage + '</webpages>' +
								'\n\t\t<media>' + obj.media + '</media>' +
								'\n\t\t<code>' + obj.code + '</code>' +
								'\n\t\t<other>' + obj.other + '</other>' +
								'\n\t\t<total>' + (obj.webpage + obj.media + obj.code + obj.other) + '</total>' +
								'\n\t</stats>';
						}

						returnd += '\n</tracestats>';

						Opts.Stats.CreateDownload(returnd, file);

					} else if (file === "json") {

						date = getDateStrings();
						let stats = {
							"downloaded": (date[0] + "-" + date[1] + "-" + date[2]).toString(),
							"stats": d
						};

						Opts.Stats.CreateDownload(JSON.stringify(stats, null, 4), file);

					} else {
						console.info("Cannot export this file format");
					}
				});
			});
		},
		CreateDownload:function(data,filetype){
			// File information
			let a = document.createElement("a"),
				file = new Blob([data], {type: "text/" + filetype});
			let url = URL.createObjectURL(file);

			// Generate file date
			let d = getDateStrings();
			let filedate = (d[0] + "_" + d[1] + "_" + d[2]).toString();

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
				$("<button/>",{"title":"Confirm deletion"}).text("Confirm").click(Opts.Stats.ConfirmDeleteStats),
				$("<button/>",{"title":lang("miscCtrlClose")}).text(lang("miscCtrlCancel")).on("click enter",Overlay.DoClose)
			);
			Overlay.AssignCloseEvent(true);
		},
		ConfirmDeleteStats:function(x){
			var a = $("#stats_del_amount").val();

			var cb = function(){
				Overlay.DoClose();
				Opts.Stats.GetStatsData(function(d){
					Opts.Stats.MakeData(d,Opts.Stats.MakeGraph);
				});
			};

			TraceBg(function(bg){
				if (a === "7"){
					bg.Stats.DeleteAmount("all",cb);
				} else {
					bg.Stats.DeleteAmount(parseInt(a)+1,cb);
				}
			});
		}
	},
	HardwareSpoof:{
		OpenDialog:function(){
			let optsCpu = {"type":"checkbox", "id":"hwspoof_use_fakecpu"}, cpuVal = Opts.Config.CurrentSel["hardware"]["hardwareConcurrency"].value;
			let optsRam = {"type":"checkbox", "id":"hwspoof_use_fakeram"}, ramVal = Opts.Config.CurrentSel["hardware"]["deviceMemory"].value;
			let optsVr = {"type":"checkbox", "id":"hwspoof_use_blockvr"};
			let optsGamepad = {"type":"checkbox", "id":"hwspoof_use_blockgp"};

			if (Opts.Config.CurrentSel["hardware"]["hardwareConcurrency"].enabled === true) optsCpu["checked"] = "checked";
			if (Opts.Config.CurrentSel["hardware"]["deviceMemory"].enabled === true) optsRam["checked"] = "checked";
			if (Opts.Config.CurrentSel["hardware"]["hwVrDisplays"].enabled === true) optsVr["checked"] = "checked";
			if (Opts.Config.CurrentSel["hardware"]["hwGamepads"].enabled === true) optsGamepad["checked"] = "checked";

			$("#drop_message").empty().append(
				$("<h1/>").text(SettingNames["Pref_HardwareSpoof"]),
				$("<div/>").append(
					$("<div/>",{"class":"setting_conf_opt xregular"}).append(
						$("<label/>",{
							"for":optsVr["id"],
							"class":"checkbox_cont"
						}).text(lang("advSettHardwareBlockVr")).append(
							$("<input/>",optsVr),
							$("<span/>",{"class":"ccheck"})
						)
					)
				),
				$("<div/>").append(
					$("<div/>",{"class":"setting_conf_opt xregular"}).append(
						$("<label/>",{
							"for":optsGamepad["id"],
							"class":"checkbox_cont"
						}).text(lang("advSettHardwareBlockGamepad")).append(
							$("<input/>",optsGamepad),
							$("<span/>",{"class":"ccheck"})
						)
					)
				),
				$("<br/>"),
				$("<div/>").append(
					$("<div/>",{"class":"setting_conf_opt xregular"}).append(
						$("<label/>",{
							"for":optsCpu["id"],
							"class":"checkbox_cont"
						}).text(lang("advSettHardwareCountCpu")).append(
							$("<input/>",optsCpu),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<input/>",{
						"type":"number",
						"id":"hwspoof_val_fakecpu",
						"placeholder":"CPU Cores",
						"value":cpuVal
					})
				),
				$("<br/>"),$("<br/>"),$("<br/>"),$("<br/>"),
				$("<div/>").append(
					$("<div/>",{"class":"setting_conf_opt xregular"}).append(
						$("<label/>",{
							"for":optsRam["id"],
							"class":"checkbox_cont"
						}).text(lang("advSettHardwareCountRam")).append(
							$("<input/>",optsRam),
							$("<span/>",{"class":"ccheck"})
						)
					),
					$("<input/>",{
						"type":"number",
						"id":"hwspoof_val_fakeram",
						"placeholder":"RAM Amount",
						"value":ramVal
					})
				),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlSave")).click(Opts.HardwareSpoof.SaveParameters)
			);
			Overlay.AssignCloseEvent(true);
		},
		SaveParameters:function(){
			TraceBg(function(bg){
				bg.Prefs.SetMultiple({
					"Pref_HardwareSpoof.hardware.hardwareConcurrency.enabled": $("#hwspoof_use_fakecpu").is(":checked"),
					"Pref_HardwareSpoof.hardware.deviceMemory.enabled": $("#hwspoof_use_fakeram").is(":checked"),
					"Pref_HardwareSpoof.hardware.hwVrDisplays.enabled": $("#hwspoof_use_blockvr").is(":checked"),
					"Pref_HardwareSpoof.hardware.hwGamepads.enabled": $("#hwspoof_use_blockgp").is(":checked"),
					"Pref_HardwareSpoof.hardware.hardwareConcurrency.value": parseInt($("#hwspoof_val_fakecpu").val()),
					"Pref_HardwareSpoof.hardware.deviceMemory.value": parseInt($("#hwspoof_val_fakeram").val())
				});
				Overlay.DoClose();
			});
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
				"data-parent":Opts.Config.SelectedOption
			});

			el.append(
				$("<span/>").text("Warning: Enabling user agents that don't match your system can break sites such as YouTube."),$("<br />"),$("<br />")
			);

			for (let i in Opts.Config.CurrentSel){
				if (i === "enabled" || i === "uaCust" || Opts.Config.CurrentSel[i] === undefined) continue;
				if (Object.keys(Opts.Config.CurrentSel[i]).length <= 1) continue;

				// Create option name
				el.append(
					$("<span/>",{"class":"setting_cont_opt"}).text(Opts.UserAgent.StringNames[i] || i)
				);

				for (let j in Opts.Config.CurrentSel[i]){
					if (j === "enabled" || typeof Opts.Config.CurrentSel[i][j] === undefined) continue;

					var opts = {
						"type":"checkbox",
						"id":"c_opt_"+makeRandomID(16),
						"data-conf":Opts.Config.SelectedOption + "." + i + "." + j + ".enabled"
					};
					if (Opts.Config.CurrentSel[i][j].enabled === true) opts["checked"] = "checked";

					el.append(
						$("<div/>",{"class":"setting_conf_opt"}).append(
							$("<label/>",{
								"for":opts["id"],
								"class":"checkbox_cont"
							}).text(Opts.UserAgent.StringNames[j] || j).append(
								$("<input/>",opts).on("click enter",function(){
									Opts.Config.SaveConf(this);
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

			$("#drop_message").empty().append(
				$("<h1/>").text("User Agent Customiser"),
				$("<div/>",{"id":"ua_specialconfig"}).append(el),
				Overlay.CloseUI()
			);
			Overlay.AssignCloseEvent(true);
		}
	},
	ScreenRes:{
		OpenDialog:function(){
			let el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":Opts.Config.SelectedOption
			});

			el.append(
				$("<div/>",{"id":"sr_resolutions"}).append(
					$("<span/>").text(lang("advSettScreenResAddSubhead")),$("<br/>"),
					$("<div/>",{"id":"sr_currentresolutions","class":"itemlist"}),
					$("<div/>",{"id":"sr_addtoresolutions"}).append(
						$("<input/>",{"type":"number","id":"sr_addtoreswidth","placeholder":lang("advSettScreenResAddWidth")}),
						$("<input/>",{"type":"number","id":"sr_addtoresheight","placeholder":lang("advSettScreenResAddHeight")}),
						$("<input/>",{"type":"number","id":"sr_addtoresdepth","placeholder":lang("advSettScreenResAddDepth")})
					),
					$("<button/>",{"id":"sr_addtoressubmit","class":"small"}).text(lang("advSettScreenResAddButton")).on("click enter",Opts.ScreenRes.AddNewResolution),$("<span/>").text(" "),
					$("<button/>",{"class":"small"}).text(lang("advSettScreenResAddCommon")).on("click enter",Opts.ScreenRes.AddCommonResolutions),$("<span/>").text(" "),
					$("<button/>",{"class":"small"}).text(lang("advSettScreenResClearList")).on("click enter",Opts.ScreenRes.ClearResolutionsList)
				),
				$("<div/>",{"id":"sr_randoffset"}).append(
					$("<span/>").text("A random number between these two values is created and added to the width and height of the screen resolution at each page refresh, making it harder to know your real screen resolution."),
					$("<br/>"),$("<br/>"),
					$("<span/>").text("Minimum Offset (Default is -10)"),
					$("<input/>",{"type":"text","id":"sr_offsetminval","placeholder":"Minimum Value"}),
					$("<br/>"),$("<br/>"),
					$("<span/>").text("Maximum Offset (Default is 10)"),
					$("<input/>",{"type":"text","id":"sr_offsetmaxval","placeholder":"Maximum Value"}),
					$("<br/>"),$("<br/>"),
					$("<button/>",{"id":"sr_updateoffsets","class":"small"}).text(lang("miscCtrlSave")).on("click enter",Opts.ScreenRes.UpdateOffset)
				),
				$("<br/>"),$("<button/>",{"id":"sr_togglemode","class":"small"}).text("Change selection method").on("click enter",Opts.ScreenRes.ToggleModeUI),
				$("<button/>",{"title":lang("miscCtrlClose"),"class":"small float_r"}).text(lang("miscCtrlClose")).on("click enter",Overlay.DoClose)
			);

			$("#drop_message").empty().append(
				$("<h1/>").text(SettingNames["Pref_ScreenRes"]),
				$("<div/>",{"id":"sr_specialconfig"}).append(el)
			);

			if (Opts.Config.CurrentSel.randomOpts.enabled === true){
				$("#sr_resolutions").hide();
			}
			if (Opts.Config.CurrentSel.commonResolutions.enabled === true){
				$("#sr_randoffset").hide();
			}

			Opts.ScreenRes.UpdateResolutions();
			Opts.ScreenRes.UpdateOffsets();

			Overlay.AssignCloseEvent(true);
		},
		ToggleModeUI:function(){
			$(this).text("Changing...");

			if (Opts.Config.CurrentSel.randomOpts.enabled === true){
				TraceBg(function(bg){
					bg.Prefs.SetMultiple({
						"Pref_ScreenRes.randomOpts.enabled":false,
						"Pref_ScreenRes.commonResolutions.enabled":true
					});
				});
			} else {
				TraceBg(function(bg){
					bg.Prefs.SetMultiple({
						"Pref_ScreenRes.randomOpts.enabled":true,
						"Pref_ScreenRes.commonResolutions.enabled":false
					});
				});
			}

			setTimeout(Opts.ScreenRes.OpenDialog,500);
		},
		UpdateOffsets:function(){
			$("#sr_offsetminval").val(Opts.Config.CurrentSel.randomOpts.values[0]);
			$("#sr_offsetmaxval").val(Opts.Config.CurrentSel.randomOpts.values[1]);
		},
		AddCommonResolutions:function(){
			let common = [
				[1024,768,16],
				[1280,720,16],
				[1280,800,16],
				[1280,1024,16],
				[1360,768,16],
				[1366,768,24],
				[1440,900,24],
				[1600,900,24],
				[1920,1080,24],
				[1920,1280,24],
				[1920,1440,24],
				[3440,1440,24],
				[3840,1600,24]
			];

			if (!confirm("This will add " + common.length + " resolutions to the list.\nAre you sure you wish to proceed?")) return;

			for (let res in common){
				// You cannot pass parseInt to map without causing issues
				Opts.Config.CurrentSel.commonResolutions.resolutions.push(common[res].map(function(n){ return parseInt(n); }));
			}

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_ScreenRes.commonResolutions.resolutions",Opts.Config.CurrentSel.commonResolutions.resolutions);
			});

			Opts.ScreenRes.UpdateResolutions();
		},
		ClearResolutionsList:function(){
			if (!confirm("This will delete all resolutions in the list.\nAre you sure you wish to proceed?")) return;

			Opts.Config.CurrentSel.commonResolutions.resolutions = [];

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_ScreenRes.commonResolutions.resolutions",[]);
			});

			Opts.ScreenRes.UpdateResolutions();
		},
		UpdateResolutions:function(){
			let r = Opts.Config.CurrentSel.commonResolutions.resolutions,
				d = $("#sr_currentresolutions");
			d.empty();

			if (typeof r === "undefined" || r.length === 0){
				d.append(
					$("<h2/>").text(lang("advSettScreenResEmptyListHead")),
					$("<p/>").text(lang("advSettScreenResEmptyListSubhead"))
				);
				return;
			}

			for (let item in r){
				d.append(
					$("<div/>",{
						"class":"itemlist_itm",
						"data-listid":item,
						"title":"Click to delete this resolution\nFormat: Width x Height x Depth"
					}).text(r[item].join("x")).on("click enter",Opts.ScreenRes.RemoveResolution)
				);
			}
		},
		RemoveResolution:function(){
			var id = $(this).data("listid");
			Opts.Config.CurrentSel.commonResolutions.resolutions.splice(id,1);
			TraceBg(function(bg){
				bg.Prefs.Set("Pref_ScreenRes.commonResolutions.resolutions",Opts.Config.CurrentSel.commonResolutions.resolutions);
			});
			Opts.ScreenRes.UpdateResolutions();
		},
		AddNewResolution:function(){
			let res = [
				$("#sr_addtoreswidth").val().toLowerCase(),
				$("#sr_addtoresheight").val().toLowerCase(),
				$("#sr_addtoresdepth").val().toLowerCase(),
			];
			let valid = res.map($.isNumeric).reduce(function(val, curr){ return val && curr; });

			if (!valid){
				alert("Input not accepted, please make sure you specify an integer in each box.");
				return;
			}

			Opts.Config.CurrentSel.commonResolutions.resolutions.push(res.map(function(n){ return parseInt(n); }));
			TraceBg(function(bg){
				bg.Prefs.Set("Pref_ScreenRes.commonResolutions.resolutions",Opts.Config.CurrentSel.commonResolutions.resolutions);
			});
			Opts.ScreenRes.UpdateResolutions();
		},
		UpdateOffset:function(){
			let max = parseInt($("#sr_offsetmaxval").val()),
				min = parseInt($("#sr_offsetminval").val());
			Opts.Config.CurrentSel.randomOpts.values = [min,max];

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_ScreenRes.randomOpts.values",Opts.Config.CurrentSel.randomOpts.values);
				Opts.ScreenRes.UpdateOffsets();
			});

			$("#sr_updateoffsets").text("Saved!");
			setTimeout(function(){
				$("#sr_updateoffsets").text(lang("miscCtrlSave"));
			},1000);
		}
	},
	WebGL:{
		OpenDialog:function(){
			let el = $("<div/>",{
				"class":"settings_config_container",
				"data-parent":Opts.Config.SelectedOption
			});

			el.append(
				$("<div/>",{"id":"sr_resolutions"}).append(
					$("<span/>").text(lang("advSettWebglGpuSubhead")),$("<br/>"),
					$("<div/>",{"id":"gl_gpulist","class":"itemlist"}),
					$("<div/>",{"id":"gl_addgpu"}).append(
						$("<input/>",{"type":"text","id":"gpu_addtolist","placeholder":"GPU Model to add"}),$("<br/>"),$("<br/>"),
						$("<button/>",{"id":"sr_addtoressubmit","class":"small"}).text(lang("advSettWebglGpuAddButton")).on("click enter",Opts.WebGL.AddNewGPU),$("<span/>").text(" "),
						$("<button/>",{"id":"sr_addtoressubmit","class":"small"}).text(lang("advSettWebglGpuAddCommon")).on("click enter",Opts.WebGL.AddTraceList),$("<span/>").text(" "),
						$("<button/>",{"id":"sr_addtoressubmit","class":"small"}).text(lang("advSettWebglGpuClearList")).on("click enter",Opts.WebGL.ClearList)
					)
				),
				$("<button/>",{"title":lang("miscCtrlClose"),"class":"small float_r"}).text(lang("miscCtrlClose")).on("click enter",Overlay.DoClose)
			);

			$("#drop_message").empty().append(
				$("<h1/>").text(SettingNames["Pref_WebGLFingerprint"]),
				el
			);

			Opts.WebGL.UpdateGPUList();

			Overlay.AssignCloseEvent(true);
		},
		UpdateGPUList:function(){
			let l = Opts.Config.CurrentSel.gpuList.list,
				d = $("#gl_gpulist");
			d.empty();

			if (typeof l === "undefined" || l.length === 0){
				d.append(
					$("<h2/>").text(lang("advSettWebglGpuEmptyListHead"))
				);
				return;
			}

			for (let item in l){
				d.append(
					$("<div/>",{
						"class":"itemlist_itm",
						"data-listid":item,
						"title":"Click to delete this GPU"
					}).text(l[item]).on("click enter",Opts.WebGL.RemoveGPU)
				);
			}
		},
		RemoveGPU:function(){
			var id = $(this).data("listid");
			Opts.Config.CurrentSel.gpuList.list.splice(id,1);

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebGLFingerprint.gpuList.list",Opts.Config.CurrentSel.gpuList.list);
			});
			Opts.WebGL.UpdateGPUList();
		},
		AddNewGPU:function(){
			var res = $("#gpu_addtolist").val();
			Opts.Config.CurrentSel.gpuList.list.push(res);

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebGLFingerprint.gpuList.list",Opts.Config.CurrentSel.gpuList.list);
				bg.Alarms.Updaters.ChooseGPU();
			});
			Opts.WebGL.UpdateGPUList();
		},
		AddTraceList:function(){
			if (!confirm("This will add the entire Trace GPU list.\nAre you sure you wish to proceed?")) return;

			TraceBg(function(bg){
				for (let item in bg.Vars.gpuModels){
					Opts.Config.CurrentSel.gpuList.list.push(bg.Vars.gpuModels[item]);
				}
				bg.Prefs.Set("Pref_WebGLFingerprint.gpuList.list",Opts.Config.CurrentSel.gpuList.list);

				Opts.WebGL.UpdateGPUList();
			});
		},
		ClearList:function(){
			if (!confirm("This will delete all GPUs in the list.\nAre you sure you wish to proceed?")) return;

			Opts.Config.CurrentSel.gpuList.list = [];

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebGLFingerprint.gpuList.list",[]);
			});

			Opts.WebGL.UpdateGPUList();
		}
	},
	Blocklist:{
		ListConfig:{},
		isPremium:false,
		updatedList:false,
		OpenDialog:function(){
			TraceBg(function(bg){
				Opts.Blocklist.isPremium = (typeof bg.Vars.Premium !== "undefined" ?
					(bg.Vars.Premium.length !== 0) : false);
			});

			$("#overlay_cont").addClass("blc_parent");

			$("#drop_message").empty().append(
				$("<h1/>",{"class":"hasloader"}).text(lang("advBlocklistConfTitle")).append(
					$("<img/>",{
						"src":"../icons/loader.gif",
						"alt":"Please wait whilst Trace loads the lists available for use",
						"class":"loader_img"
					}).show()
				),
				$("<input/>",{
					"type":"text",
					"id":"blc_searchlists",
					"class":"hidden",
					"placeholder":lang("advBlocklistConfSearchBox")
				}).on("keyup",Opts.Blocklist.SearchList),
				$("<span/>",{"id":"blc_updAlert","style":"display:none"}).text("The blocklist will update with new the settings when you exit this popup."),
				$("<div/>",{"id":"blc_lists"}).append(
					$("<span/>",{"id":"blc_loadStatus"}).text(lang("miscMsgPleaseWait"))
				)
			);

			Opts.Blocklist.LoadList();

			$("#ux").addClass("blurred");
			$("#overlay_message").slideDown(300);

			// Stop events coming back to haunt me in the future
			function unbindClick(){
				$(window).unbind("click");
				$("#overlay_close").unbind("click");
			}

			function updateLists(){
				if (Opts.Blocklist.updatedList) {
					unbindClick();
					TraceBg(function(bg){
						bg.Web.BlocklistLoader(true);
					});
				}

				$("#blc_cServerList").empty();
				$("#overlay_cont").removeClass("blc_parent");
				Overlay.DoClose();
			}

			unbindClick();
			$("#overlay_close").click(updateLists);
			$(window).click(function(e){
				if ($(e.target)[0].id === "overlay_message") updateLists();
			});
		},
		SearchList:function(){
			let term = $(this).val().toLowerCase();
			if (term.length === 0){
				$(".blcTraceList").show();
			}
			$(".blcTraceList h2").each(function(){
				if (!$(this).text().toLowerCase().includes(term)){
					$(this).parent().hide();
				} else {
					$(this).parent().show();
				}
			});
		},
		LoadList:function(){
			if (!navigator.onLine){
				$(".loader_img").hide();
				$("#blc_loadStatus").text(lang("miscMsgOffline"));
				return;
			}

			var writeListToBody = function(){
				var body = $("<div/>",{
					"id":"blc_cServerList",
					"class":"settings_config_container"
				});

				if (Opts.Blocklist.ListConfig.lists.length === 0){
					body.append(
						$("<h2/>").text("There are no lists available for use.")
					);
				} else {
					for (let i = 0,l = Opts.Blocklist.ListConfig.lists.length;i<l;i++){
						var currentItem = Opts.Blocklist.ListConfig.lists[i];
						var currentItemId = makeRandomID(7);

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
									if (Opts.Blocklist.isPremium !== true && $(this).is(":checked") === true && $(this).data("warnpremium")){
										e.preventDefault();
										alert("This list requires premium.");
									} else {
										Opts.Blocklist.InstallList($(this).data("install"),$(this).is(":checked"));
									}
								}),
								$("<span/>",{"class":"ccheck"})
							)
						);

						// List labels
						var label = $("<span/>",{"class":"blc_optreq blc_req"}).text(lang("advBlocklistConfListOptional"));
						if (currentItem.premium === true){
							label = $("<span/>",{"class":"blc_premreq blc_req"}).text(Opts.Blocklist.isPremium===true ? lang("advBlocklistConfListPremium") : "This list requires Premium");
						} else if (currentItem.default === true){
							label = $("<span/>",{"class":"blc_defreq blc_req"}).text(lang("advBlocklistConfListDefault"));
						}

						if (Opts.debug === true){
							label.append(": "+currentItem.install);
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
					var isInstalled = chrome.extension.getBackgroundPage().Prefs.Current.Pref_WebController.installCodes[installCode];
					if (isInstalled){
						$(this).attr("checked","checked");
					}
				});
			};

			$.ajax({
				url:"https://trace-extension.absolutedouble.co.uk/app/weblist.php?v=210&a=list",
				dataType:"text",
				cache:false,
				method:"GET",
				timeout:30000,
				beforeSend:function(){
					$("#blc_loadStatus").text("Contacting Server...");
				},
				success:function(data){
					$("#blc_loadStatus").text("Compiling List...");
					Opts.Blocklist.ListConfig = JSON.parse(data);
					writeListToBody();
					checkEnabledItems();
					$(".loader_img").hide();
					$("#blc_searchlists").show();
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
								$("<li/>").text("Your DNS server isn't resolving absolutedouble.co.uk"),
								$("<li/>").text("There is an error connecting over TLS"),
								$("<li/>").text("The server is down for maintenance"),
								$("<li/>").text("Trace is out of date")
							),
							$("<span/>").text("Things to try:"),
							$("<ul/>").append(
								$("<li/>").text("See if you can access any other websites"),
								$("<li/>").text("Check if you can access https://absolutedouble.co.uk/"),
								$("<li/>").text("Try pinging 1.1.1.1 or another IP to check if it's a DNS issue")
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
			console.log("Updating blocklist:",installCode,enabled);

			if (typeof installCode !== "string"){
				return;
			}

			TraceBg(function(bg){
				let currentCodes = bg.Prefs.Current.Pref_WebController.installCodes;
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

				Opts.Blocklist.updatedList = true;
				$("#blc_updAlert").show();

				bg.Prefs.Set("Pref_WebController.installCodes",currentCodes);
			});
		}
	},
	Scope:{
		CurrentList:[],
		CurrentSelect:null,
		Title:$("#scope .sect_header"),
		Init:function(){
			Opts.Scope.AssignEvents();
			Opts.Scope.PopulateList(Opts.Scope.AddToUI);
		},
		AssignEvents:function(){
			$("#wlctrl_search").attr("placeholder",lang("advWhitelistListSearch")).on("keyup",Opts.Scope.StartSearch);
			$("#wlctrl_refresh").text(lang("advWhitelistListRefresh")).on("click enter",Opts.Scope.ReloadList);
			$("#wlctrl_clear").text(lang("advWhitelistListClear")).on("click enter",Opts.Scope.ClearWhitelist);
			$("#wlctrl_test").text(lang("advWhitelistListTest")).on("click enter",Opts.Scope.ListTest);
			$("#wlctrl_addent").text(lang("advWhitelistListAdd")).on("click enter",Opts.Scope.AddDomain);
			$("#wlctrl_rement").text(lang("advWhitelistListRemove")).on("click enter",Opts.Scope.RemoveDomain);
			$("#wlctrl_editent").text(lang("advWhitelistListEdit")).on("click enter",Opts.Scope.EditDomain);
			$("#wlctrl_import").text(lang("advWhitelistListImport")).on("click enter",Opts.Scope.Export.UI);
			$("#wlctrl_help").text(lang("advWhitelistListHelp")).on("click enter",Opts.Scope.HelpDialog);
		},
		ClearWhitelist:function(){
			if (confirm(lang("advWhitelistListClearConfirm"))){
				TraceBg(function(bg){
					bg.Whitelist.EmptyList();
					Opts.Scope.ReloadList();
				});
			}
		},
		EmptyList:function(){
			$("#wl_biglist").empty().append(
				$("<h2/>").text(lang("advWhitelistListNoEntries")),
				$("<span/>").text(" Add new ones here.")
			);
		},
		StartSearch:function(){
			clearTimeout(Opts.searchTimeout);
			Opts.searchTimeout = setTimeout(Opts.Scope.SearchList,500);
		},
		SearchList:function(){
			Opts.Scope.UnselectDomain(false);
			Opts.Scope.PopulateList(function(array,cb){
				let keys = Object.keys(array);
				let len = keys.length, added = 0;
				let lst = $("#wl_biglist");
				let src = $("#wlctrl_search").val();

				for (let i = 0;i < len;i++){
					let pos = i;
					if (!keys[i].includes(src)) continue;
					lst.append(
						$("<div/>",{
							"class":"wl_blist_domain",
							"tabindex":"1",
							"data-itmkey":keys[pos],
							"data-pos":added,
							"id":"wle_id_" + makeRandomID(7)
						}).text(keys[pos]).on("keyup",Opts.Scope.AlterSelect).click(Opts.Scope.SelectDomain)
					);
					added++;
				}

				if (added === 0){
					$("#wl_biglist").empty().append(
						$("<h2/>").text("Search for '"+src+"' returned no results")
					);
				}

				if (cb) cb();
			});
		},
		AddDomain:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advWhitelistAddTitle")),
				$("<input/>",{
					"type":"text",
					"placeholder":"Wildcard Pattern (e.g. *badtracker.co.nz*)",
					"class":"textbox",
					"id":"wle_domainadd",
					"autocomplete":"false"
				}),
				$("<div/>",{"class":"setting_conf_opt"}).append(
					$("<label/>",{
						"for":"s_prot_blocksite",
						"class":"checkbox_cont xlarge"
					}).text(lang("miscMsgWhitelistBlockSite")).append(
						$("<input/>",{"id":"s_prot_blocksite","type":"checkbox"}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<div/>",{"class":"setting_conf_opt"}).append(
					$("<label/>",{
						"for":"s_prot_initreqs",
						"class":"checkbox_cont xlarge"
					}).text(lang("miscMsgWhitelistAllowInitReq")).append(
						$("<input/>",{"id":"s_prot_initreqs","type":"checkbox","checked":"checked"}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<br/>"),
				$("<span/>").text(lang("advWhitelistEditorProtections")),
				$("<div/>",{"id":"s_add_protections"}),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlCancel")).on("click enter",Overlay.DoClose),
				$("<button/>",{"class":"float_r","title":"Add entry"}).text("Add Domain").click(function(){
					let d = $("#wle_domainadd").val();
					Opts.Scope.AddValidation(d,this);
				}),
				$("<br/>"),$("<br/>")
			);
			Overlay.AssignCloseEvent(true);
			TraceBg(Opts.Scope.AddExecs);
		},
		AddExecs:function(bg){
			var enableStatus = bg.Whitelist.whitelistDefaults;
			var $cont = $("#s_add_protections");

			let allProts = Object.keys(bg.Whitelist.whitelistDefaults);

			$cont.empty();
			for (let i = 0;i<allProts.length;i++){
				$cont.append(
					$("<div/>",{
						"data-protid":allProts[i],
						"class":"setting_traffic " + (enableStatus[allProts[i]] === true ? "traffic_enabled" : "traffic_disabled"),
						"title":(enableStatus[allProts[i]] === true ? lang("miscCtrlEnabled") : lang("miscCtrlDisabled"))
					}).on("click enter",function(){
						if ($(this).hasClass("traffic_enabled")){
							$(this).removeClass("traffic_enabled").addClass("traffic_disabled").attr("title",lang("miscCtrlDisabled"));
						} else {
							$(this).removeClass("traffic_disabled").addClass("traffic_enabled").attr("title",lang("miscCtrlEnabled"));
						}
					}).text(SettingNames[allProts[i]])
				);
			}
		},
		AddValidation:function(domain,e){
			$(e).text(lang("miscMsgPleaseWait"));

			// Default protection template
			var scopeData = ProtectionTemplate(true);

			// Update 2 main controllers
			scopeData["SiteBlocked"] = $("#s_prot_blocksite").is(":checked");
			scopeData["InitRequests"] = $("#s_prot_initreqs").is(":checked");

			// Update protection object
			$("div[data-protid]").each(function() {
				scopeData["Protections"][$(this).data("protid")] = $(this).hasClass("traffic_enabled");
				console.log($(this).data("protid"),"set to",$(this).hasClass("traffic_enabled"));
			});

			TraceBg(function(bg){
				bg.Whitelist.AddItem(domain,scopeData,function(){
					Opts.Scope.ReloadList();
					Overlay.DoClose();
				});
			});
		},
		EditDomain:function(){
			if(Opts.Scope.CurrentSelect === null){
				return false;
			}

			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advWhitelistEditTitle")),
				$("<h3/>").text("Edit the wildcard pattern, site request permissions and modify protections that can run."),
				$("<input/>",{
					"type":"text",
					"placeholder":"Wildcard Pattern (e.g. *badtracker.co.nz*)",
					"class":"textbox",
					"id":"wle_domainadd",
					"autocomplete":"false",
					"value":Opts.Scope.CurrentSelect.data("itmkey")
				}),
				$("<div/>",{"class":"setting_conf_opt"}).append(
					$("<label/>",{
						"for":"s_prot_blocksite",
						"class":"checkbox_cont xlarge"
					}).text(lang("miscMsgWhitelistBlockSite")).append(
						$("<input/>",{"id":"s_prot_blocksite","type":"checkbox"}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<div/>",{"class":"setting_conf_opt"}).append(
					$("<label/>",{
						"for":"s_prot_initreqs",
						"class":"checkbox_cont xlarge"
					}).text(lang("miscMsgWhitelistAllowInitReq")).append(
						$("<input/>",{"id":"s_prot_initreqs","type":"checkbox","checked":"checked"}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<br/>"),
				$("<span/>").text(lang("advWhitelistEditorProtections")),
				$("<div/>",{"id":"s_add_protections"}),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlCancel")).on("click enter",Overlay.DoClose),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlModifyEntry")).click(Opts.Scope.DoEditDomain),
				$("<br/>"),$("<br/>")
			);
			Overlay.AssignCloseEvent(true);
			TraceBg(Opts.Scope.AddExecs);
			TraceBg(Opts.Scope.UpdateExecs);
		},
		UpdateExecs:function(bg){
			var currData = bg.Whitelist.storedList[Opts.Scope.CurrentSelect.data("itmkey")];

			if (typeof currData.Protections === "undefined"){
				console.error(currData);
				alert("Error with Scope entry.");
			}

			$("div[data-protid]").each(function() {
				if (!currData.Protections[$(this).data("protid")]){
					$(this).removeClass("traffic_enabled").addClass("traffic_disabled").attr("title",lang("miscCtrlDisabled"));
				} else {
					$(this).removeClass("traffic_disabled").addClass("traffic_enabled").attr("title",lang("miscCtrlEnabled"));
				}
			});

			$("#s_prot_blocksite").attr("checked",currData.SiteBlocked);
			$("#s_prot_initreqs").attr("checked",currData.InitRequests);
		},
		DoEditDomain:function(){
			if(Opts.Scope.CurrentSelect === null){
				return false;
			}
			Overlay.DoClose();

			// Get information
			var removeItem = Opts.Scope.CurrentSelect.data("itmkey");
			var addItem = $("#wle_domainadd").val();

			// Default protection template
			var scopeData = ProtectionTemplate(true);

			// Update 2 main controllers
			scopeData["SiteBlocked"] = $("#s_prot_blocksite").is(":checked");
			scopeData["InitRequests"] = $("#s_prot_initreqs").is(":checked");

			// Update protection object
			$("div[data-protid]").each(function() {
				scopeData["Protections"][$(this).data("protid")] = $(this).hasClass("traffic_enabled");
			});

			TraceBg(function(bg){
				bg.Whitelist.EditItem(removeItem,addItem,scopeData,function(){
					Opts.Scope.ReloadList();
				});
			});
		},
		RemoveDomain:function(){
			if(Opts.Scope.CurrentSelect === null){
				return false;
			}
			var item = Opts.Scope.CurrentSelect.data("itmkey");
			TraceBg(function(bg){
				bg.Whitelist.RemoveItem(item,function(){
					Opts.Scope.ReloadList();
				});
			});
		},
		AlterSelect:function(e){
			if ($("#wl_biglist .wl_blist_domain").length < 2) return;

			if (e.keyCode === 13){
				$("#wlctrl_editent").click();
				return;
			}

			let pos = $(this).data("pos");
			let el = null;

			if (e.keyCode === 40){
				if ($("#wl_biglist div[data-pos='"+ (pos+1) +"']").length !== 0){
					el = $("#wl_biglist div[data-pos='"+ (pos+1) +"']");
				} else {
					el = $("#wl_biglist div[data-pos='0']");
				}
			} else if (e.keyCode === 38) {
				if ($("#wl_biglist div[data-pos='"+ (pos-1) +"']").length !== 0 && pos !== 0){
					el = $("#wl_biglist div[data-pos='"+ (pos-1) +"']");
				} else {
					el = $("#wl_biglist div[data-pos='"+ ($("#wl_biglist div").length-1) +"']");
				}
			} else {
				return;
			}

			el.click().focus();
		},
		UnselectDomain:function(deleted){
			if (Opts.Scope.CurrentSelect === null) return;

			if (!deleted) $("#" + $(Opts.Scope.CurrentSelect)[0].id).removeClass("wl_selected");

			Opts.Scope.CurrentSelect = null;

			$("#wl_scontrols").addClass("faded");
			$("#wlctrl_rement").prop("disabled",true);
			$("#wlctrl_editent").prop("disabled",true);
		},
		SelectDomain:function(){
			if (Opts.Scope.CurrentSelect !== null){
				if ($(this)[0].id === $(Opts.Scope.CurrentSelect)[0].id){
					Opts.Scope.UnselectDomain(false);
					return;
				}
				Opts.Scope.UnselectDomain(false);
			}
			Opts.Scope.CurrentSelect = $(this);
			$(this).addClass("wl_selected");

			$("#wl_scontrols").removeClass("faded");
			$("#wlctrl_rement").prop("disabled",false);
			$("#wlctrl_editent").prop("disabled",false);
		},
		ReloadList:function(){
			$("#wl_biglist").addClass("faded");
			$("#wlctrl_search").val("");

			Opts.Scope.UnselectDomain(false);
			Opts.Scope.PopulateList(Opts.Scope.AddToUI);
			setTimeout(function(){
				$("#wl_biglist").removeClass("faded");
			},300);
		},
		AddToUI:function(array,cb){
			let keys = Object.keys(array).sort();
			let len = keys.length;
			let lst = $("#wl_biglist");

			let parseEntry = function(e){
				return e.replace(/</g,"&lt;").replace(/\*/g,"<strong>*</strong>");
			};

			for (let i = 0;i < len;i++){
				let pos = i;
				lst.append(
					$("<div/>",{
						"class":"wl_blist_domain",
						"tabindex":"0",
						"data-itmkey":keys[pos],
						"data-pos":pos,
						"id":"wle_id_" + makeRandomID(7)
					}).html(parseEntry(keys[pos])).on("keyup",Opts.Scope.AlterSelect).click(Opts.Scope.SelectDomain)
				);
			}

			if (cb) cb();
		},
		PopulateList:function(cb){
			$("#wl_biglist").empty();
			TraceBg(function(bg){
				bg.Whitelist.ReturnWhitelist(function(list){
					if (Object.keys(list).length === 0){
						Opts.Scope.EmptyList();
					} else {
						cb(list);
					}
				});
			});
		},
		ListTest:function(){
			function runTest(){
				// Get decoded wl and string we are testing
				var val = $(this).val();
				var cont = $("#sl_testresp");
				var matches = 0;

				cont.empty();

				function doTheWhitelistParse(bg){
					let currWl = bg.Whitelist.GetWhitelist();
					let storWl = Object.keys(bg.Whitelist.storedList);

					// Get result if there is one
					for (let i = 0, l = currWl.keys.length;i<l;i++){
						if (!currWl.keys[i].test(val)) continue;

						let currItm = $("<div/>").append($("<h1/>").text(storWl[i]));

						// Blocked status
						currItm.append(
							$("<span/>").text(currWl.values[i].SiteBlocked === true ? "This site is blocked." : "This site is not blocked."),$("<br/>"),
							$("<span/>").text(currWl.values[i].InitRequests === true ? "This site can make requests to blocked sites." : "This site can't make requests to blocked sites.")
						);

						// Update main data
						cont.append(currItm);
						matches++;
					}

					if (matches === 0){
						cont.append($("<h1/>").text("Couldn't find any entries that would match this URL"));
					}
				}

				TraceBg(doTheWhitelistParse);
			}

			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advWhitelistTestTitle")),
				$("<h2/>").text("Use this to see what protections apply to a specified URL"),
				$("<div/>").append(
					$("<input/>",{
						"type":"text",
						"placeholder":"URL to test (e.g. https://www.bad-tracking-server.co.au/eviltrack.aspx)",
						"class":"textbox",
						"autocomplete":"false",
					}).keyup(runTest),
					$("<div/>",{"id":"sl_testresp","class":"textscrollable"})
				),
				Overlay.CloseUI(),$("<br />")
			);
			Overlay.AssignCloseEvent(false);
		},
		HelpDialog:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text(lang("advWhitelistHelpTitle")),
				$("<h2/>").text(lang("advWhitelistHelpSubhead")),
				$("<div/>",{"class":"textscrollable xregular"}).append(
					$("<ul/>").append(
						$("<li/>").append(
							$("<span/>",{"class":"premhelp_q"}).text("What does the asterisk/'wildcard pattern' mean?"),$("<br />"),
							$("<span/>",{"class":"premhelp_a"}).text("This is what's known as a wildcard character, it basically means anything can go there."),$("<br />"),
							$("<span/>",{"class":"premhelp_a"}).text("So for example if you typed *.com then example.com would match but example.net wouldn't match."),$("<br />"),
							$("<span/>",{"class":"premhelp_a"}).text("You can make this more complicated, for example https://*.ac.uk/* could be used to allow all .ac.uk domains so long as they use https"),$("<br />")
						)
					)
				),
				Overlay.CloseUI()
			);
			Overlay.AssignCloseEvent(true);
		},
		Export:{
			Data:{},
			UI:function(){
				$("#drop_message").empty().append(
					$("<h1/>",{"id":"backuprestore_title"}).text(lang("advWhitelistImportTitle")),
					$("<section/>",{"id":"backuprestore_section"}).append(
						$("<span/>").text("Export your whitelist"),
						$("<br/>"),$("<br/>"),
						$("<button/>",{"style":"font-size:1em"}).text("Export Whitelist").on("click",Opts.Scope.Export.Download),
						$("<h2/>").text("Import a whitelist")
					),
					$("<input/>",{
						"type":"file",
						"accept":".json",
						"style":"font-size:1.1em"
					}).on("change",Opts.Scope.Export.Upload),
					$("<p/>",{"id":"restore_info"})
				);
				Overlay.AssignCloseEvent(true);
			},
			Download:function(){
				TraceBg(function(bg){
					bg.Whitelist.WhitelistExport(function(raw){
						MakeDownload("TraceWhitelistExport",JSON.stringify(raw,null,4));
					});
				});
			},
			Upload:function(evt){
				if (!this.files.length) return;

				let reader = new FileReader();
				reader.onload = function(){
					let data = reader.result;
					try{
						Opts.Scope.Export.Data = JSON.parse(data);
					} catch(e){
						Opts.Scope.Export.Data = {};
					}
					Opts.Scope.Export.UploadUI();
				};
				reader.readAsText(this.files[0]);
			},
			UploadUI:function(){
				// Check backup file..
				var keys = Object.keys(Opts.Scope.Export.Data);
				var redFlags = 0;
				if (Opts.Scope.Export.Data["backupTime"] === undefined) redFlags++;
				if (Opts.Scope.Export.Data["traceVersion"] === undefined) redFlags++;
				if (Opts.Scope.Export.Data["traceBrowser"] === undefined) redFlags++;
				if (Opts.Scope.Export.Data["entries"] === undefined) redFlags++;

				if (redFlags >= 2){
					$("#restore_info").empty().append(
						$("<h2/>").text("This file isn't a valid Trace Whitelist Export.")
					);
					return;
				}

				var versionInfo = $("<span/>").text("This export is the same version as your current version of Trace.");
				if (Opts.Scope.Export.Data.traceVersion !== chrome.runtime.getManifest().version){
					versionInfo = $(
						$("<p/>").append(
							$("<strong/>").text("Trace Export Version: "),
							$("<span/>").text(Opts.Scope.Export.Data.traceVersion || "Unknown.")
						),
						$("<p/>").append(
							$("<strong/>").text("Trace Current Version: "),
							$("<span/>").text(chrome.runtime.getManifest().version || "Unknown.")
						)
					);
				}

				$("#backuprestore_section").hide();
				$("#backuprestore_title").text("Import Whitelist Entries");

				$("#restore_info").empty().append(
					$("<p/>").append(
						$("<span/>").text("Please note: If an item in the import has the same key as one in the list then the list currently will be overridden."),
						$("<br/>"),
						$("<strong/>").text("Date: "),
						$("<span/>").text(Opts.Scope.Export.Data.exportTime || "Unknown.")
					),
					versionInfo,
					$("<br/>"),
					$("<button/>",{"title":"Import whitelist entries","class":"small"}).text("Just import entries").on("click enter",Opts.Scope.Export.ImportList),
					$("<br/>"),$("<br/>"),
					$("<button/>",{"title":"Clear whitelist and add entries","class":"small"}).text("Clear whitelist & Import Entries").on("click enter",Opts.Scope.Export.ClearImportList)
				);
			},
			ImportedListUI:function(){
				$("#restore_info").empty().append(
					$("<h2/>").text("Import Complete. Trace will now reload.")
				);
				setTimeout(function(){
					window.location.reload(true);
				},3000);
			},
			ImportList:function(){
				var data = {};
				data = Opts.Scope.Export.Data.entries;

				//window.location.href = "#whitelistImported";
				TraceBg(function(bg){
					bg.Whitelist.WhitelistImport(data,function(){
						bg.Whitelist.SaveWhitelist(function(){
							Opts.Scope.Export.ImportedListUI();
							bg.window.location.reload();
						});
					});
				});
			},
			ClearImportList:function(){
				TraceBg(function(bg){
					bg.Whitelist.EmptyList();
					Opts.Scope.Export.ImportList();
				});
			}
		}
	},
	BadTLD:{
		tldPresets:{
			all:["accountant", "date", "diet", "loan", "mom", "online", "om", "racing", "ren", "stream", "study", "top", "xin", "yokohama"],
			extended:["asia", "cc", "cf", "christmas", "cricket", "party", "pro", "review", "systems", "trade", "vip", "wang", "zip"],
			most:["ads", "club", "icu", "link", "market", "jetzt", "kim", "top", "science", "space", "webcam", "men", "win", "work"],
			few:["bid", "click", "country", "download", "faith", "gdn", "gq"]
		},
		AssignEvents:function(){
			$("#adv_settingstld").click(Opts.BadTLD.SelectProtectionUI);
		},
		SelectProtectionUI:function(){
			$("#drop_message").empty().append(
				$("<h1/>").text("Bad Top Level Domains"),
				$("<h2/>").text("Click a TLD to toggle whether or not it is blocked"),
				$("<div/>",{"id":"adv_tldlist"}),
				$("<div/>").append(
					$("<h1/>").text("TLD Presets"),
					$("<button/>",{"data-selects":"0"}).text("Minimal").on("click enter",Opts.BadTLD.SelectPreset),
					$("<button/>",{"data-selects":"1"}).text("Regular").on("click enter",Opts.BadTLD.SelectPreset),
					$("<button/>",{"data-selects":"2"}).text("Extended").on("click enter",Opts.BadTLD.SelectPreset),
					$("<button/>",{"data-selects":"3"}).text("All Bad TLDs").on("click enter",Opts.BadTLD.SelectPreset)
				),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlClose")).on("click enter",Overlay.DoClose)
			);
			Overlay.AssignCloseEvent(true);

			TraceBg(function(bg){
				if (bg.Prefs.Current.Pref_WebController.tld.enabled !== true){
					$("#drop_message").prepend(
						$("<h1/>",{"class":"setting_disabled"}).text(lang("advSettingsMsgDisabled"))
					);
				}
			});

			Opts.BadTLD.LoadTLDs();
		},
		SelectPreset:function(){
			let preset = $(this).data("selects");
			var newList = {
				"accountant":false, "ads":false, "asia":false,
				"bid":false,
				"cc":false, "cf":false, "christmas":false, "click":false, "club":false, "country":false, "cricket":false,
				"date":false, "diet":false, "download":false,
				"faith":false,
				"gdn":false, "gq":false,
				"icu":false,
				"jetzt":false,
				"kim":false,
				"link":false, "loan":false,
				"market":false, "men":false, "mom":false,
				"om":false, "online":false,
				"party":false, "pro":false,
				"racing":false, "ren":false, "review":false,
				"science":false, "space":false, "stream":false, "study":false, "systems":false,
				"top":false, "trade":false,
				"vip":false,
				"wang":false, "webcam":false, "win":false, "work":false,
				"xin":false,
				"yokohama":false,
				"zip":false
			};
			var enableList = [];
			if (preset >= 0) enableList = enableList.concat(Opts.BadTLD.tldPresets.few);
			if (preset >= 1) enableList = enableList.concat(Opts.BadTLD.tldPresets.most);
			if (preset >= 2) enableList = enableList.concat(Opts.BadTLD.tldPresets.extended);
			if (preset === 3) enableList = enableList.concat(Opts.BadTLD.tldPresets.all);

			for (let tld in enableList){
				newList[enableList[tld]] = true;
			}

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebController.tld.settings",newList);
			});
			Opts.BadTLD.LoadTLDs();
		},
		LoadTLDs:function(){
			TraceBg(function(bg){
				let s = bg.Prefs.Current.Pref_WebController.tld.settings;
				let k = Object.keys(s);
				let r = $("<div/>",{"id":"adv_tldlist"});
				for (let i = 0,l = k.length;i<l;i++){
					r.append(
						$("<div/>",{
							"data-tldid":k[i],
							"data-current":s[k[i]],
							"class":"setting_traffic " + (s[k[i]] === true ? "traffic_enabled" : "traffic_disabled"),
							"title":(s[k[i]] === true ? lang("miscCtrlEnabled") : lang("miscCtrlDisabled"))
						}).on("click enter",Opts.BadTLD.SaveSelection).text(k[i])
					);
				}

				$("#adv_tldlist").replaceWith(r);
			});
		},
		SaveSelection:function(){
			var newVal = $(this).data("current") !== true;
			var tldId = $(this).data("tldid");
			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebController.tld.settings."+tldId,newVal);
				Opts.BadTLD.LoadTLDs();
			});
		}
	},
	UICustomiser:{
		OptionsInterface:function(){
			TraceBg(function(bg){
				Opts.Blocklist.isPremium = (typeof bg.Vars.Premium !== "undefined" ?
					(bg.Vars.Premium.length !== 0) : false);
			});

			if (!Opts.Blocklist.isPremium){
				$("#drop_message").empty().append(
					$("<h1/>").text(lang("advPremiumMsgRequired"))
				);
				Overlay.AssignCloseEvent(true);
				return;
			}

			var opts = {"type":"checkbox"};
			if (Opts.Config.CurrentSel["Theme"]["timeAlterations"].enabled === true) opts["checked"] = "checked";

			$("#drop_message").empty().append(
				$("<h1/>").text("Customise User Interface"),
				$("<h2/>").text("Choose overall theme"),
				$("<select/>",{"id":"custui_themename"}).append(
					$("<option>",{"value":"default"}).text("Default Theme"),
					$("<option>",{"value":"traceintense"}).text("Intense"),
					$("<option>",{"value":"traceleaf"}).text("Autumn Leaf"),
					$("<option>",{"value":"tracebeach"}).text("Beach Sunset"),
					$("<option>",{"value":"tracelight"}).text("Trace Light"),
					$("<option>",{"value":"tracegreyscale"}).text("Trace Greyscale")
				).on("change",function (){
					var thatVal = $(this).val();
					TraceBg(function(bg){
						bg.Prefs.Set("Main_Interface.Theme.name",thatVal);
						reloadTheme();
					});
				}),
				$("<h2/>").text("Navigation bar position"),
				$("<select/>",{"id":"custui_navbarpos"}).append(
					$("<option>",{"value":"nav_top"}).text("Top"),
					$("<option>",{"value":"nav_left"}).text("Left"),
					$("<option>",{"value":"nav_right"}).text("Right")
				).on("change",function () {
					var thatVal = $(this).val();
					TraceBg(function(bg){
						bg.Prefs.Set("Main_Interface.Theme.navPlacement",thatVal);
						reloadTheme();
					});
				}),
				$("<div/>",{"class":"setting_conf_opt xregular"}).append(
					$("<label/>",{
						"for":opts["id"],
						"class":"checkbox_cont"
					}).text("Enable time-based alterations").append(
						$("<input/>",opts).on("click enter",function(){
							var thatVal = $(this).is(":checked");
							TraceBg(function(bg){
								bg.Prefs.Set("Main_Interface.Theme.timeAlterations",thatVal);
								reloadTheme();
							});
						}),
						$("<span/>",{"class":"ccheck"})
					)
				),
				Overlay.CloseUI(),
				$("<br/>"),$("<br/>")
			);
			Overlay.AssignCloseEvent(true);

			$("#custui_navbarpos option[value='" + Opts.Config.CurrentSel.Theme["navPlacement"] + "']").prop("selected", true);
			$("#custui_themename option[value='" + Opts.Config.CurrentSel.Theme["name"] + "']").prop("selected", true);
		}
	},
	URLCleaner: {
		ParamPresets:{
			safe:["ga_source", "ga_medium", "ga_term", "ga_content", "ga_campaign", "ga_place", "utm_source", "utm_campaign", "utm_content", "utm_medium", "utm_name", "utm_cid", "utm_reader", "utm_term"],
			regular:["ad_bucket", "ad_size", "ad_slot", "ad_type", "adid", "adserverid", "adserveroptimizerid", "adtype", "adurl", "clickid", "clkurlenc", "fb_source", "fb_ref", "CampaignID", "AffiliateGuid", "AdID", "ImpressionGuid", "ga_fc", "ga_hid", "ga_sid", "ga_vid", "piggiebackcookie", "pubclick", "pubid", "num_ads", "tracking", "usegapi", "affiliate", "first_visit", "trackId", "_trkparms"],
			risky:["bdref", "bstk", "campaignid", "dclid", "documentref", "exitPop", "flash", "matchid", "mediadataid", "minbid", "page_referrer", "referrer", "reftype", "revmod", "rurl", "siteid", "tldid", "zoneid", "site", "fb", "pk_campaign"],
			extreme:["_reqid", "data", "payload", "providerid", "rev", "uid", "sourceid", "origin"]
		},
		AssignEvents: function () {
			$("#adv_urlcleaner_settings").on("click enter",Opts.URLCleaner.SelectProtectionUI);
		},
		SelectProtectionUI: function() {
			$("#drop_message").empty().append(
				$("<h1/>").text("URL Cleaning Settings"),
				$("<h3/>").text("Select URL parameters and what happens with them below."),
				$("<h2/>").text("Frame URL Cleaning Settings"),
				$("<select/>", {id: "afr_urlc_pmethod"}).append(
					$("<option/>", {value: "removeall"}).text("Remove All Parameters"),
					$("<option/>", {value: "remove"}).text("Remove Selected Parameters"),
					$("<option/>", {value: "randomise"}).text("Randomise Selected Parameters")
				).on("change",Opts.URLCleaner.SaveSelection),
				$("<br/>"),
				$("<div/>",{"id":"adv_urlparams","class":"sinksect"}),
				$("<br/>"),
				$("<div/>",{"class":"sinksect"}).append(
					$("<h1/>").text("Parameter Presets"),
					$("<button/>",{"data-selects":"0"}).text("Safe").on("click enter",Opts.URLCleaner.SelectPreset),
					$("<button/>",{"data-selects":"1"}).text("Regular").on("click enter",Opts.URLCleaner.SelectPreset),
					$("<button/>",{"data-selects":"2"}).text("Risky").on("click enter",Opts.URLCleaner.SelectPreset),
					$("<button/>",{"data-selects":"3"}).text("All Parameters").on("click enter",Opts.URLCleaner.SelectPreset)
				),
				/*$("<h2/>").text("Resource URL Cleaning Settings"),
				$("<select/>", {id: "ars_urlc_plevel"}).append(
					$("<option/>", {value: -1}).text("No Cleaning"),
					$("<option/>", {value: 0}).text("Safe Cleaning"),
					$("<option/>", {value: 1}).text("Regular Cleaning"),
					$("<option/>", {value: 2}).text("Risky Cleaning"),
					$("<option/>", {value: 3}).text("Extreme Cleaning"),
					$("<option/>", {value: 4}).text("Remove All URL Parameters")
				).on("change", function () {
					if ($(this).val() === "4") {
						$("#aurlc_uwarning").text("Are you sure you want to remove all URL parameters? This will break almost every single website you use on the web.").append($("<br/>"), $("<br/>")).show();
					} else if ($(this).val() === "3") {
						$("#aurlc_uwarning").text("This setting is very extreme and may break a lot of websites, if you don't want websites to be broken as easily please use regular cleaning instead.").append($("<br/>"), $("<br/>")).show();
					} else {
						$("#aurlc_uwarning").hide();
					}
				}),
				$("<span/>").text(" "),
				$("<select/>", {id: "ars_urlc_pmethod"}).append(
					$("<option/>", {value: "remove"}).text("Remove Parameters"),
					$("<option/>", {value: "randomise"}).text("Randomise Parameters")
				),*/
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlClose")).on("click enter",Overlay.DoClose)
			);
			Overlay.AssignCloseEvent(true);
			Opts.URLCleaner.LoadParams();

			TraceBg(function(bg){
				function getName(type){
					return bg.Prefs.Current.Pref_WebController.urlCleaner.queryString[type].method;
				}
				$("#afr_urlc_pmethod option[value='" + getName("main_frame") + "']").prop("selected", true);
				//$("#ars_urlc_pmethod option[value='" + getName("resources") + "']").prop("selected", true);

				if (bg.Prefs.Current.Pref_WebController.urlCleaner.enabled !== true) {
					$("#drop_message").prepend(
						$("<h1/>",{"class":"setting_disabled"}).text(lang("advSettingsMsgDisabled"))
					);
				}
			});
		},
		SelectPreset:function(){
			var preset = $(this).data("selects");
			var newList = {
				"ga_source":true, "ga_medium":true, "ga_term":true, "ga_content":true,
				"ga_campaign":true, "ga_place":true, "utm_source":true, "utm_campaign":true, "utm_content":true, "utm_medium":true, "utm_name":true, "utm_cid":true, "utm_reader":true, "utm_term":true, "ad_bucket":false,
				"ad_size":false, "ad_slot":false, "ad_type":false, "adid":false, "adserverid":false, "adserveroptimizerid":false, "adtype":false, "adurl":false, "clickid":false, "clkurlenc":false, "fb_source":false,
				"fb_ref":false, "CampaignID":false, "AffiliateGuid":false, "AdID":false, "ImpressionGuid":false, "ga_fc":false, "ga_hid":false, "ga_sid":false, "ga_vid":false, "piggiebackcookie":false, "pubclick":false,
				"pubid":false, "num_ads":false, "tracking":false, "usegapi":false, "affiliate":false, "first_visit":false, "trackId":false, "_trkparms":false, "bdref":false, "bstk":false, "campaignid":false, "dclid":false,
				"documentref":false, "exitPop":false, "flash":false, "matchid":false, "mediadataid":false, "minbid":false, "page_referrer":false, "referrer":false, "reftype":false, "revmod":false, "rurl":false, "siteid":false,
				"tldid":false, "zoneid":false, "site":false, "fb":false, "pk_campaign":false, "_reqid":false, "data":false, "payload":false, "providerid":false, "rev":false, "uid":false, "sourceid":false, "origin":false
			};

			var enableList = [];
			if (preset >= 0)
				enableList = enableList.concat(Opts.URLCleaner.ParamPresets.safe);

			if (preset >= 1)
				enableList = enableList.concat(Opts.URLCleaner.ParamPresets.regular);

			if (preset >= 2)
				enableList = enableList.concat(Opts.URLCleaner.ParamPresets.risky);

			if (preset === 3)
				enableList = enableList.concat(Opts.URLCleaner.ParamPresets.extreme);

			for (let param in enableList){
				newList[enableList[param]] = true;
			}

			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebController.urlCleaner.queryString.params",newList);
			});
			Opts.URLCleaner.LoadParams();
		},
		LoadParams:function(){
			TraceBg(function(bg){
				var s = bg.Prefs.Current.Pref_WebController.urlCleaner.queryString.params || {};
				var k = Object.keys(s);
				var r = $("<div/>",{"id":"adv_urlparams"});
				for (let i = 0,l = k.length;i<l;i++){
					r.append(
						$("<div/>",{
							"data-tldid":k[i],
							"data-current":s[k[i]],
							"class":"setting_traffic " + (s[k[i]] === true ? "traffic_enabled" : "traffic_disabled"),
							"title":(s[k[i]] === true ? lang("miscCtrlEnabled") : lang("miscCtrlDisabled"))
						}).on("click enter",Opts.URLCleaner.SaveParams).text(k[i])
					);
				}

				if (k.length === 0){
					r = $("<div/>",{"id":"adv_urlparams"}).append(
						$("<h2/>").text("Trace was unable to load the list of URL parameters")
					);
				}
				$("#adv_urlparams").replaceWith(r);
			});
		},
		SaveParams:function(){
			var newVal = ($(this).data("current") == true ? false : true);
			var theTld = $(this).data("tldid");
			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebController.urlCleaner.queryString.params."+theTld,newVal);
			});
			Opts.URLCleaner.LoadParams();
		},
		SaveSelection:function (){
			var frameMethod = $("#afr_urlc_pmethod").val();
			//var resMethod = $("#ars_urlc_pmethod").val();
			TraceBg(function(bg){
				bg.Prefs.Set("Pref_WebController.urlCleaner.queryString.main_frame.method", frameMethod);
				// bg.Prefs.Set("Pref_WebController.urlCleaner.queryString.resources.method", resMethod);
			});
		}
	},
	CanvasRGBA:{
		OpenDialog:function(){
			let opts = {
				"type":"checkbox",
				"id":"trcanv_custrgba"
			};
			let rgba = Opts.Config.CurrentSel["customRGBA"]["rgba"];
			if (Opts.Config.CurrentSel["customRGBA"].enabled === true){
				opts["checked"] = "checked";
			}

			$("#drop_message").empty().append(
				$("<h1/>").text(SettingNames["Pref_CanvasFingerprint"]),
				$("<h2/>").text(lang("advSettCanvasCustomSubhead")),
				$("<div/>",{"class":"setting_conf_opt xregular"}).append(
					$("<label/>",{
						"for":opts["id"],
						"class":"checkbox_cont"
					}).text(lang("advSettCanvasCustomRgba")).append(
						$("<input/>",opts),
						$("<span/>",{"class":"ccheck"})
					)
				),
				$("<br/>"),
				$("<input/>",{
					"type":"number",
					"id":"trcanv_custr",
					"placeholder":"R",
					"value":rgba[0]
				}),
				$("<input/>",{
					"type":"number",
					"id":"trcanv_custg",
					"placeholder":"G",
					"value":rgba[1]
				}),
				$("<input/>",{
					"type":"number",
					"id":"trcanv_custb",
					"placeholder":"B",
					"value":rgba[2]
				}),
				$("<input/>",{
					"type":"number",
					"id":"trcanv_custa",
					"placeholder":"A",
					"value":rgba[3]
				}),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlSave")).click(Opts.CanvasRGBA.SaveParameters),
				$("<br/>"),$("<br/>")
			);
			Overlay.AssignCloseEvent(true);
		},
		SaveParameters:function(){
			var rgba = [
				parseInt($("#trcanv_custr").val()),
				parseInt($("#trcanv_custg").val()),
				parseInt($("#trcanv_custb").val()),
				parseInt($("#trcanv_custa").val())
			];
			var custRgba = $("#trcanv_custrgba").is(":checked");
			TraceBg(function(bg){
				bg.Prefs.SetMultiple({
					"Pref_CanvasFingerprint.customRGBA.rgba":rgba,
					"Pref_CanvasFingerprint.customRGBA.enabled":custRgba
				});
			});
			Overlay.DoClose();
		}
	},
	CookieEaterUI:{
		OpenDialog:function(){
			var rc_sett = Opts.Config.CurrentSel["settings"]["cookie"];
			var sc_sett = Opts.Config.CurrentSel["settings"]["setcookie"];
			var rc_opts = {"type":"checkbox","id":"ce_sett_cookieheadmod"};
			var sc_opts = {"type":"checkbox","id":"ce_sett_setcookieheadmod"};
			if (Opts.Config.CurrentSel["settings"]["cookie"].enabled === true) rc_opts["checked"] = "checked";
			if (Opts.Config.CurrentSel["settings"]["setcookie"].enabled === true) sc_opts["checked"] = "checked";

			$("#drop_message").empty().append(
				$("<h1/>").text("Cookie Eater Settings"),
				$("<h2/>",{"style":"padding-top:0;font-weight:500",class:"sinksect mtop xlarge"}).text("'Cookie' Header Settings"),
				$("<div/>",{
					"class":"setting_conf_opt mbot xregular",
				}).append(
					$("<label/>",{
						"for":rc_opts["id"],
						"class":"checkbox_cont scheckbox_cont"
					}).text("Allow Trace to modify the 'Cookie' header sent to  websites").append(
						$("<input/>",rc_opts),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<div/>",{"class":"floatsect"}).append(
					$("<label/>",{for:"ce_sett_fpcookiehead",class:"large"}).text("First-Party Cookie Settings"),$("<br/>"),
					$("<select/>",{name:"ce_sett_fpcookiehead",id:"ce_sett_fpcookiehead"}).append(
						$("<option/>",{value:"removeall"}).text("Remove All Cookies"),
						$("<option/>",{value:"remove"}).text("Remove Cookies in List"),
						$("<option/>",{value:"randomiseall"}).text("Randomise All Values"),
						$("<option/>",{value:"randomise"}).text("Randomise Values of only Cookies in List"),
						$("<option/>",{value:"nothing"}).text("Do Nothing")
					)
				),
				$("<div/>",{"class":"floatsect"}).append(
					$("<label/>",{for:"ce_sett_tpcookiehead",class:"large"}).text("Third-Party Cookie Settings"),$("<br/>"),
					$("<select/>",{name:"ce_sett_tpcookiehead",id:"ce_sett_tpcookiehead"}).append(
						$("<option/>",{value:"removeall"}).text("Remove All Cookies"),
						$("<option/>",{value:"remove"}).text("Remove Cookies"),
						$("<option/>",{value:"randomiseall"}).text("Randomise All Values"),
						$("<option/>",{value:"randomise"}).text("Randomise Values of only Cookies in List"),
						$("<option/>",{value:"nothing"}).text("Do Nothing")
					)
				),
				$("<h2/>",{class:"sinksect mtop xlarge","style":"font-weight:500"}).text("'Set-Cookie' Header Settings"),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":sc_opts["id"],
						"class":"checkbox_cont scheckbox_cont"
					}).text("Allow Trace to edit 'Set-Cookie' headers sent by websites").append(
						$("<input/>",sc_opts),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<div/>",{"class":"floatsect"}).append(
					$("<label/>",{for:"ce_sett_fpsetcookiehead",class:"large"}).text("First-Party Set-Cookie Settings"),$("<br/>"),
					$("<select/>",{name:"ce_sett_fpsetcookiehead",id:"ce_sett_fpsetcookiehead"}).append(
						$("<option/>",{value:"removeall"}).text("Remove All Cookies"),
						$("<option/>",{value:"remove"}).text("Remove Cookies in List"),
						$("<option/>",{value:"randomiseall"}).text("Randomise All Values"),
						$("<option/>",{value:"randomise"}).text("Randomise Values of only Cookies in List"),
						$("<option/>",{value:"nothing"}).text("Do Nothing")
					)
				),
				$("<div/>",{"class":"floatsect"}).append(
					$("<label/>",{for:"ce_sett_tpsetcookiehead",class:"large"}).text("Third-Party Set-Cookie Settings"),$("<br/>"),
					$("<select/>",{name:"ce_sett_tpsetcookiehead",id:"ce_sett_tpsetcookiehead"}).append(
						$("<option/>",{value:"removeall"}).text("Remove All Cookies"),
						$("<option/>",{value:"remove"}).text("Remove Cookies in List"),
						$("<option/>",{value:"randomiseall"}).text("Randomise All Values"),
						$("<option/>",{value:"randomise"}).text("Randomise Values of only Cookies in List"),
						$("<option/>",{value:"nothing"}).text("Do Nothing")
					)
				),
				$("<br/>"),$("<br/>"),
				$("<br/>"),$("<br/>"),
				$("<button/>").text("Edit cookie list").on("click enter",Opts.CookieEaterUI.List.InitUI),
				$("<br/>"),$("<br/>"),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlCancel")).on("click enter",Overlay.DoClose),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlSaveClose")).click(Opts.CookieEaterUI.SaveSelection)
			);
			Overlay.AssignCloseEvent(true);

			$("#ce_sett_fpcookiehead option[value='" + rc_sett["fp_method"] + "']").prop("selected", true);
			$("#ce_sett_tpcookiehead option[value='" + rc_sett["tp_method"] + "']").prop("selected", true);
			$("#ce_sett_fpsetcookiehead option[value='" + sc_sett["fp_method"] + "']").prop("selected", true);
			$("#ce_sett_tpsetcookiehead option[value='" + sc_sett["tp_method"] + "']").prop("selected", true);
		},
		SaveSelection:function(){
			var rc_ena = $("#ce_sett_cookieheadmod").is(":checked");
			var rc_fpm = $("#ce_sett_fpcookiehead").val();
			var rc_tpm = $("#ce_sett_tpcookiehead").val();
			var sc_ena = $("#ce_sett_setcookieheadmod").is(":checked");
			var sc_fpm = $("#ce_sett_fpsetcookiehead").val();
			var sc_tpm = $("#ce_sett_tpsetcookiehead").val();
			TraceBg(function(bg){
				bg.Prefs.SetMultiple({
					"Pref_CookieEater.settings.cookie.enabled":rc_ena,
					"Pref_CookieEater.settings.setcookie.enabled":sc_ena,
					"Pref_CookieEater.settings.cookie.fp_method":rc_fpm,
					"Pref_CookieEater.settings.setcookie.fp_method":sc_fpm,
					"Pref_CookieEater.settings.cookie.tp_method":rc_tpm,
					"Pref_CookieEater.settings.setcookie.tp_method":sc_tpm
				});
			});

			Overlay.DoClose();
		},
		List:{
			InitUI:function(){
				$("#drop_message").empty().append(
					$("<h1/>").text("Cookie Eater Target List"),
					$("<h2/>").text("Click a Cookie Name to toggle whether it is affected by the protection"),
					$("<div/>",{"id":"adv_tldlist"}),
					$("<br/>"),$("<br/>"),
					Overlay.CloseUI()
				);
				Overlay.AssignCloseEvent(true);

				Opts.CookieEaterUI.List.LoadCookies();
			},
			LoadCookies:function(){
				TraceBg(function(bg){
					var s = bg.Prefs.Current.Pref_CookieEater.list;
					var k = Object.keys(s);
					var r = $("<div/>",{"id":"adv_tldlist"});
					for (let i = 0,l = k.length;i<l;i++){
						r.append(
							$("<div/>",{
								"data-cookieid":k[i],
								"data-current":s[k[i]],
								"class":"setting_traffic " + (s[k[i]] === true ? "traffic_enabled" : "traffic_disabled"),
								"title":(s[k[i]] === true ? lang("miscCtrlEnabled") : lang("miscCtrlDisabled"))
							}).on("click enter",Opts.CookieEaterUI.List.SaveSelection).text(k[i])
						);
					}

					$("#adv_tldlist").replaceWith(r);
				});
			},
			SaveSelection:function(){
				var newVal = ($(this).data("current") !== true);
				var cookieId = $(this).data("cookieid");
				TraceBg(function(bg){
					bg.Prefs.Set("Pref_CookieEater.list."+cookieId,newVal);
					Opts.CookieEaterUI.List.LoadCookies();
				});
			}
		}
	},
	RefererHeader:{
		OpenDialog:function(){
			var jsvar_opts = {"type":"checkbox","id":"referhead_jsvar_cb","name":"referhead_jsvar_cb"};
			if (Opts.Config.CurrentSel["jsVariable"].enabled === true) jsvar_opts["checked"] = "checked";

			var httpHead_ash = {"type":"checkbox","id":"referhead_ash","name":"referhead_ash"};
			var httpHead_ashu = {"type":"checkbox","id":"referhead_ashu","name":"referhead_ashu"};
			var httpHead_asd = {"type":"checkbox","id":"referhead_asd","name":"referhead_asd"};
			var httpHead_asdu = {"type":"checkbox","id":"referhead_asdu","name":"referhead_asdu"};
			var httpHead_atp = {"type":"checkbox","id":"referhead_atp","name":"referhead_atp"};
			var httpHead_atpu = {"type":"checkbox","id":"referhead_atpu","name":"referhead_atpu"};
			var httpHead_oso = {"type":"checkbox","id":"referhead_oso","name":"referhead_oso"};
			if (Opts.Config.CurrentSel.httpHeader["allowSameHost"].enabled === true) httpHead_ash["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["allowSameHost"].fullUrl === true) httpHead_ashu["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["allowSameDomain"].enabled === true) httpHead_asd["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["allowSameDomain"].fullUrl === true) httpHead_asdu["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["allowThirdParty"].enabled === true) httpHead_atp["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["allowThirdParty"].fullUrl === true) httpHead_atpu["checked"] = "checked";
			if (Opts.Config.CurrentSel.httpHeader["onlySecureOrigins"].enabled === true) httpHead_oso["checked"] = "checked";

			$("#drop_message").empty().append(
				$("<h1/>").text("HTTP 'Referer' Header Settings"),
				$("<h2/>").text("When staying on same hostname"),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_ash",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Allow header in this case").append(
						$("<input/>",httpHead_ash).on("click",function(){
							if ($(this).is(":checked")){
								$("#referhead_asd").prop("checked",false);
							}
						}),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_ashu",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Send full URL").append(
						$("<input/>",httpHead_ashu),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<h2/>").text("When staying on the same domain"),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_asd",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Allow header in this case").append(
						$("<input/>",httpHead_asd).on("click",function(){
							if ($(this).is(":checked")){
								$("#referhead_ash").prop("checked",true);
							}
						}),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_asdu",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Send full URL").append(
						$("<input/>",httpHead_asdu),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<h2/>").text("When navigating to a third party"),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_atp",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Allow header in this case").append(
						$("<input/>",httpHead_atp).on("click",function(){
							if ($(this).is(":checked")){
								$("#referhead_ash").prop("checked",true);
							}
						}),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_atpu",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Send full URL").append(
						$("<input/>",httpHead_atpu),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				$("<h2/>").text("General settings"),
				$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_oso",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Only send header when using HTTPS").append(
						$("<input/>",httpHead_oso),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),
				/*$("<div/>",{"class":"setting_conf_opt mbot xregular"}).append(
					$("<label/>",{
						"for":"referhead_jsvar_cb",
						"class":"checkbox_cont scheckbox_cont"
					}).text("Set document.referrer to an empty string").append(
						$("<input/>",jsvar_opts),
						$("<span/>",{"class":"ccheck sccheck"})
					)
				),*/
				$("<span/>").text("If you don't select any boxes then the header will never be set."),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlCancel")).on("click enter",Overlay.DoClose),
				$("<button/>",{"class":"float_r"}).text(lang("miscCtrlSaveClose")).click(Opts.RefererHeader.SaveSelection)
			);
			Overlay.AssignCloseEvent(true);
		},
		SaveSelection:function(){
			var rf_ash = $("#referhead_ash").is(":checked");
			var rf_ashu = $("#referhead_ashu").is(":checked");
			var rf_asd = $("#referhead_asd").is(":checked");
			var rf_asdu = $("#referhead_asdu").is(":checked");
			var rf_atp = $("#referhead_atp").is(":checked");
			var rf_atpu = $("#referhead_atpu").is(":checked");
			var rf_oso = $("#referhead_oso").is(":checked");
			TraceBg(function(bg){
				bg.Prefs.SetMultiple({
					"Pref_ReferHeader.httpHeader.allowSameHost.enabled":rf_ash,
					"Pref_ReferHeader.httpHeader.allowSameDomain.enabled":rf_asd,
					"Pref_ReferHeader.httpHeader.allowThirdParty.enabled":rf_atp,
					"Pref_ReferHeader.httpHeader.allowSameHost.fullUrl":rf_ashu,
					"Pref_ReferHeader.httpHeader.allowSameDomain.fullUrl":rf_asdu,
					"Pref_ReferHeader.httpHeader.allowThirdParty.fullUrl":rf_atpu,
					"Pref_ReferHeader.httpHeader.onlySecureOrigins.enabled":rf_oso
				});
			});

			Overlay.DoClose();
		}
	}
};

backgroundConnectCheck();
ls.IsSupported();

try{
	$(document).ready(Opts.WindowLoad);
} catch(e){
	showErr(lang("miscMsgUiFail"));
	console.error(e);
}

// Check if is new install
if(window.location.hash && window.location.hash === "#installed") {
	Opts.NewInstall.ShowInterface();
} else {
	if (window.location.hash && window.location.hash.includes("#view")) {
		Opts.Interface.NavigateFromHash();
	}
}