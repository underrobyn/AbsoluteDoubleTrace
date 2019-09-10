/*
 * 	Trace options page script
 * 	Copyright AbsoluteDouble 2018
 * 	Written by Jake Mcneill
 * 	https://absolutedouble.co.uk/
 */

var showErr = function(m){
	document.getElementById("e_msg").style.display = "block";
	document.getElementById("fail_reason").innerText = m;
};

if (typeof $ !== "function" || typeof jQuery !== "function") {
	showErr("jQuery Library failed to load.");
}
if (typeof window.JSON !== "object"){
	showErr("JSON Library failed to load.");
}

// A general fix for browser that use window.browser instead of window.chrome
if (!window.chrome.hasOwnProperty("extension")) window.chrome = (function (){ return window.msBrowser || window.browser || window.chrome; })();

// Get message for language
var lang = function(msg){
	if (!chrome.i18n) return "";
	return chrome.i18n.getMessage(msg);
};

var sTrace = {
	debug:false,
	port:null,

	start:function(){
		sTrace.port = chrome.runtime.connect({
			name:"background-msg"
		});
		sTrace.port.onMessage.addListener(sTrace.recieve);

		sTrace.send({
			"request":"connect"
		});

		sTrace.ui.createStructure();
	},

	recieve:function(data){
		console.log(data);
	},

	send:function(data){
		sTrace.port.postMessage(data);
	},

	ui:{

		createStructure:function(){
			// Create navigation bar
			$("#main_nav").append(
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"protection"
				}).text(
					lang("mainNavProtection")
				).on("click enter",sTrace.ui.navEvent),
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"sites"
				}).text(
					lang("mainNavSiteList")
				).on("click enter",sTrace.ui.navEvent),
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"advanced"
				}).text(
					lang("mainNavAdvanced")
				).on("click enter",sTrace.ui.navEvent),
				$("<div/>",{
					"class":"nav_item",
					"tabindex":"1",
					"data-load":"about"
				}).text(
					lang("mainNavAbout")
				).on("click enter",sTrace.ui.navEvent)
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
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlDisabled"))
				).on("click enter",sTrace.ui.cardEvent)
			);
			$("#prot_web").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleWeb")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescWeb")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlWeb"))
				).on("click enter",sTrace.ui.cardEvent)
			);
			$("#prot_premium").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitlePremium")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescPremium")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlPremium"))
				).on("click enter",sTrace.ui.cardEvent)
			);

			// Protection levels
			$("#prot_low").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleLow")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescLow")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlLow"))
				).on("click enter",sTrace.ui.cardEvent)
			);
			$("#prot_med").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleMedium")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescMedium")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlMedium"))
				).on("click enter",sTrace.ui.cardEvent)
			);
			$("#prot_high").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleHigh")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescHigh")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlHigh"))
				).on("click enter",sTrace.ui.cardEvent)
			);
			$("#prot_extreme").append(
				$("<h3/>",{"class":"card_title"}).text(lang("mainCardTitleExtreme")),
				$("<div/>",{"class":"card_desc"}).text(lang("mainCardDescExtreme")),
				$("<div/>",{"class":"card_bottom"}).append(
					$("<div/>",{"class":"card_control"}).text(lang("mainCardCtrlExtreme"))
				).on("click enter",sTrace.ui.cardEvent)
			);
		},

		createSiteList:function(){
			$("#sites_search").append(
				$("<input/>",{
					"type":"text",
					"placeholder":lang("mainSiteListSearchPlaceholder")
				}).on("keyup",sTrace.ui.siteListSearchEvent)
			);

			$("#sites_new").append(
				$("<div/>",{"class":"list_title"}).append(
					$("<input/>",{
						"type":"text",
						"placeholder":lang("mainSiteListAddPlaceholder")
					})
				),
				$("<div/>",{"class":"list_protection"}).append(
					$("<span/>",{"class":"list_rangetext"}).text(lang("mainSiteListSliderMedium")),
					$("<input/>",{
						"type":"range",
						"min":0,
						"max":4,
						"value":2
					})
				)
			)
		},

		navEvent:function(){
			var load = "#" + $(this).data("load");

			switch(load){
				case "#protection":
					document.title = "Trace | Protection Level";
					break;
				case "#sites":
					document.title = "Trace | Site List";
					break;
				case "#advanced":
					chrome.tabs.create({url:"/html/options.html"});
					return;
				case "#about":
					chrome.tabs.create({url:"/html/options.html#view=information"});
					return;
				default:
					break;
			}

			$(".view").addClass("hidden");
			$(load).removeClass("hidden");
		},

		cardEvent:function(){
			var card = $($(this).parent()).data("card");

			switch (card){
				case "pause":
					sTrace.send({
						"request":"update",
						"name":"pause-trace"
					});
					break;
				case "web":
					sTrace.send({
						"request":"update",
						"name":"web-controller"
					});
					break;
				case "low":
				case "medium":
				case "high":
				case "extreme":
					sTrace.send({
						"request":"update",
						"name":"protection-level",
						"level":card
					});
					break;
				default:
					break;
			}
		},

		siteListSearchEvent:function(){
			console.log($(this).val())
		}

	}

};

//sTrace.start();