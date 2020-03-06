/*
 * 	Trace options page script
 * 	Copyright AbsoluteDouble 2018 - 2020
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var sTrace = {
	debug:false,
	port:null,

	start:function(){
		sTrace.setupPort();
		sTrace.ui.createStructure();

		if (window.location.hash && window.location.hash === "#installed"){
			sTrace.welcome.init();
		}

		sTrace.send({"request":"dashboard"});
	},

	setupPort:function(){
		sTrace.port = chrome.runtime.connect({
			name:"background-msg"
		});
		sTrace.port.onMessage.addListener(sTrace.receive);

		sTrace.send({"request":"connect"});
	},

	receive:function(data){
		switch (data.response){
			case "connected":
				sTrace.debug = data.debug;
				break;
			case "update":
				sTrace.update.dashboard(data);
				break;
			case "site-list":
				sTrace.update.siteList(data);
				break;
			case "error":
				console.error(data);
				break;
			default:
				console.error("Unknown response:",data.response);
				break;
		}
	},

	send:function(data){
		sTrace.port.postMessage(data);
	},

	update:{

		dashboard:function(data){
			console.log(data);

			sTrace.ui.pauseState(data.paused,data.pause_end);
			sTrace.ui.selectedCard(data.presets_enabled, data.preset);
		},

		siteList:function(data){
			$("#sites_list").empty().append(
				sTrace.ui.createSiteAdd()
			);

			let wl = data.list;
			let wlKeys = Object.keys(wl).sort();
			for (let i = 0;i<wlKeys.length;i++){
				$("#sites_list").append(
					sTrace.ui.createSiteEntry(wlKeys[i],wl[wlKeys[i]].name,wl[wlKeys[i]].preset)
				);
			}
		}

	},

	welcome:{

		init:function(){
			var freshInstall = function(){
				$("#overlay_message").fadeOut(300);
				setTimeout(function(){
					$("#ux").removeClass("blurred");
				},10);

				window.location.hash = '#';
			};

			$("#sw_adv_ui").on("click enter",function(){
				TraceBg(function(bg){
					bg.Prefs.Set("Main_Simple.enabled",false);
					chrome.tabs.create({url:"html/options.html"});
					window.close();
				});
			});

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

	ui:{

		sliderPresets:[
			"none",
			"low",
			"medium",
			"high",
			"extreme",
			"custom"
		],
		sliderLevels:[
			lang("mainSiteListSliderNone"),
			lang("mainSiteListSliderLow"),
			lang("mainSiteListSliderMedium"),
			lang("mainSiteListSliderHigh"),
			lang("mainSiteListSliderExtreme"),
			lang("mainSiteListSliderCustom")
		],

		createStructure:function(){
			// Create navigation bar
			$("#main_nav").append(
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"protection"
				}).text(
					lang("mainNavProtection")
				).on("click enter",sTrace.events.nav),
				$("<div/>",{
					"class":"nav_item",
					"style":"display:none",
					"tabindex":"1",
					"data-load":"sites"
				}).text(
					lang("mainNavSiteList")
				).on("click enter",sTrace.events.nav),
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"advanced"
				}).text(
					lang("mainNavAdvanced")
				).on("click enter",sTrace.events.nav),
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"about"
				}).text(
					lang("mainNavAbout")
				).on("click enter",sTrace.events.nav)
			);

			// Create page headers
			$("#protection_title").text(lang("mainTitleProtection"));
			$("#protection_subtitle").text(lang("mainSubTitleProtection"));
			$("#presets_title").text(lang("mainTitlePresets"));
			$("#presets_subtitle").text(lang("mainSubTitlePresets"));
			$("#sitelist_title").text(lang("mainTitleSiteList"));
			$("#sitelist_subtitle").text(lang("mainSubTitleSiteList"));

			// Create tab specific elements
			sTrace.ui.createCards();
			sTrace.ui.createSiteList();

			// Show the UI
			$("#ux").removeClass("blurred");
		},

		createCards:function(){
			// Top 3 cards
			$("#prot_disabled").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleDisabled")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescDisabled")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlPause"))
				).on("click enter",sTrace.events.card)
			);
			$("#prot_web").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleWeb")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescWeb")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlWeb"))
				).on("click enter",sTrace.events.card)
			);
			$("#prot_premium").append(
				$("<h3/>",{"class":"card_title"}).text("Advanced Mode"),
				$("<div/>",{"class":"card_desc"}).text("Set advanced UI as the default UI. You can always change it back in Trace Options."),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text("Change")
				).on("click enter",function(){
					TraceBg(function(bg){
						bg.Prefs.Set("Main_Simple.enabled",false);
						chrome.tabs.create({url:"/html/options.html"});
						window.close();
					});
				})
				/*$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitlePremium")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescPremium")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlPremium"))
				).on("click enter",sTrace.events.card)*/
			);

			// Protection levels
			$("#prot_low").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleLow")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescLow"))
			).on("click enter",sTrace.events.presetCard).attr("title",lang("mainCardCtrlSelect"));
			$("#prot_med").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleMedium")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescMedium"))
			).on("click enter",sTrace.events.presetCard).attr("title",lang("mainCardCtrlSelect"));
			$("#prot_high").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleHigh")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescHigh"))
			).on("click enter",sTrace.events.presetCard).attr("title",lang("mainCardCtrlSelect"));
			$("#prot_extreme").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleExtreme")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescExtreme"))
			).on("click enter",sTrace.events.presetCard).attr("title",lang("mainCardCtrlSelect"));
			$("#prot_custom").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleCustom")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescCustom"))
			).on("click enter",sTrace.events.presetCard).attr("title",lang("mainCardCtrlSelect"));
		},

		createSiteAdd:function(){
			return $("<div/>",{"id":"sites_new","class":"list_item"}).append(
				$("<div/>",{"class":"list_title"}).append(
					$("<input/>",{
						"type":"text",
						"id":"site_add",
						"placeholder":lang("mainSiteListAddPlaceholder")
					})
				),
				$("<div/>",{"class":"list_protection"}).append(
					$("<span/>",{"id":"sites_new_slider","class":"list_rangetext"}).text(lang("mainSiteListSliderMedium")),
					$("<input/>",{
						"type":"range",
						"id":"site_add_level",
						"min":0,
						"max":4,
						"value":2
					}).on("change",sTrace.events.updateAddSlider)
				),
				$("<div/>",{"class":"list_ctrl"}).append(
					$("<button/>",{"class":"list_button"}).text("Add Site").on("click enter",sTrace.events.addSite)
				)
			);
		},

		createSiteList:function(){
			$("#sites_search").append(
				$("<input/>",{
					"type":"text",
					"placeholder":lang("mainSiteListSearchPlaceholder")
				}).on("keyup",sTrace.events.siteListSearch)
			);

			$("#sites_list").append(
				sTrace.ui.createSiteAdd()
			);
		},

		createSiteEntry:function(entryid,entry,preset){
			return $("<div/>",{"class":"list_item","data-entryid":entryid,"data-search":entry}).append(
				$("<div/>",{"class":"list_title"}).append(
					$("<span/>").text(entry)
				),
				$("<div/>",{"class":"list_protection"}).append(
					$("<span/>",{"class":"list_rangetext"}).text(
						sTrace.ui.sliderLevels[preset] || sTrace.ui.sliderLevels[2]
					),
					$("<input/>",{
						"type":"range",
						"min":0,
						"max":4,
						"value":(preset === null ? 2 : preset)
					}).on("change",sTrace.events.updateExistingSlider)
				),
				$("<div/>",{"class":"list_ctrl"}).append(
					$("<button/>",{"class":"list_button"}).text("Remove Site").on("click enter",sTrace.events.removeSite)
				)
			);
		},

		selectedCard:function(presetsEnabled, preset){
			let currPreset = sTrace.ui.sliderPresets[preset];
			if (!presetsEnabled) currPreset = "custom";

			$(".card_active div.card_control").text(lang("mainCardCtrlSelect"));
			$(".card_active").attr("title",lang("mainCardCtrlSelect")).addClass("card_standard").removeClass("card_active");
			$(".card_title_bold").removeClass("card_title_bold");

			$("[data-card='" + currPreset + "']").addClass("card_active").removeClass("card_standard").attr("title",lang("mainCardCtrlSelected"));
			$("[data-card='" + currPreset + "'] h3.card_title").addClass("card_title_bold")
		},

		pauseState:function(paused,pauseEnd){
			$("[data-card='pause'] div.card_control").text(
				paused ? lang("mainCardCtrlUnpause") : lang("mainCardCtrlPause")
			);
		},

		premiumState:function(active){

		}

	},

	events:{
		nav:function(){
			let load = "#" + $(this).data("load");

			switch(load){
				case "#protection":
					document.title = "Trace | Protection Level";
					break;
				case "#sites":
					document.title = "Trace | Site List";
					sTrace.send({
						"request":"site-list"
					});
					break;
				case "#advanced":
					chrome.tabs.create({url:"/html/options.html"});
					return;
				case "#about":
					chrome.tabs.create({url:"/html/about.html"});
					return;
				default:
					break;
			}

			$(".view").addClass("hidden");
			$(load).removeClass("hidden");
		},

		card:function(){
			let card = $($(this).parent()).data("card");

			switch (card){
				case "pause":
					sTrace.send({
						"request":"update",
						"name":"pause-trace"
					});
					break;
				case "web":
					chrome.tabs.create({url:"/html/options.html#view=wrc"});
					break;
				default:
					break;
			}
		},

		presetCard:function(){
			let card = $(this).data("card");

			switch (card){
				case "low":
				case "medium":
				case "high":
				case "extreme":
				case "custom":
					sTrace.send({
						"request":"update",
						"name":"protection-level",
						"preset":card,
						"level":sTrace.ui.sliderPresets.indexOf(card)
					});
					break;
			}
		},

		// Site list functions
		siteListSearch:function(){
			let searchTerm = $(this).val();

			$("div.list_item").each(function(){
				if (!$(this).data("search")) return;

				let searchId = $(this).data("search");
				if (searchId.indexOf(searchTerm) === -1){
					$(this).hide();
				} else {
					$(this).show();
				}
			});
		},

		addSite:function(){
			let entryText = $("#site_add").val();
			let entryLevel = parseInt($("#site_add_level").val());

			sTrace.send({
				"request":"update",
				"name":"site-add",
				"entryid":entryText,
				"level":entryLevel
			});
		},

		removeSite:function(){
			let entryid = $($($(this).parent()).parent()).data("entryid");

			sTrace.send({
				"request":"update",
				"name":"site-remove",
				"entryid":entryid
			});
		},

		updateAddSlider:function(){
			let newVal = parseInt($(this).val());
			$("#sites_new_slider").text(sTrace.ui.sliderLevels[newVal]);
		},

		updateExistingSlider:function(){
			let entryid = $($($(this).parent()).parent()).data("entryid");
			let newVal = parseInt($(this).val());

			$("div.list_item[data-entryid='" + entryid + "'] span.list_rangetext").text(sTrace.ui.sliderLevels[newVal]);

			sTrace.send({
				"request":"update",
				"name":"site-protection-level",
				"entryid":entryid,
				"level":newVal
			});
		}
	}

};

ls.IsSupported();

sTrace.start();