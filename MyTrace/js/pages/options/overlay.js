let Overlay = {
	msg:$("#overlay_message"),

	CloseUI:function(){
		return $("<button/>",{"title":lang("miscCtrlClose"),"class":"float_r"}).text(lang("advOverlayCtrlClose")).on("click enter",Overlay.DoClose);
	},
	DoClose:function(){
		Overlay.msg.fadeOut(250);
		$("#ux").removeClass("blurred");
		setTimeout(function(){
			Overlay.msg.removeClass("overlay_fs");
		},250);
	},
	AssignCloseEvent:function(fs){
		if (fs) Overlay.msg.addClass("overlay_fs");

		$("#ux").addClass("blurred");
		Overlay.msg.fadeIn(300);
		$("#overlay_close").on("click enter",Overlay.DoClose);
		$(window).click(function(e){
			if ($(e.target)[0].id === "overlay_message"){
				Overlay.DoClose();
			}
		});
	}
};

let Tutorial = {
	ShowRequest:function(){
		$("#drop_message").empty().append(
			$("<h1/>").text(lang("tutRequestsTitle")),
			$("<span/>").text("Use the Web Request Controller to block web requests - it must be enabled for protections like Bad TLD Protection to work, however you can set it not to block anything by deselecting all of the blocklists."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("Bad TLD protection is very useful for keeping you safe against lots of shady TLDs, read more about the research behind it in the 'Info' section."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("The URL Tracking Cleaner removes information from URLs that is used to track you, it has lots of configuration options and I recommend you enable it at some level to improve your privacy."),
			$("<br/>"),$("<br/>"),
			Overlay.CloseUI()
		);

		Overlay.AssignCloseEvent();
		ls.Store("showRequestTutorial",false);
	},
	ShowSettings:function(){
		$("#drop_message").empty().append(
			$("<h1/>").text(lang("tutSettingsTitle")),
			$("<span/>").text("Click on setting name to reveal a description of what it does."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("Advanced features are features that provide a greater level of protection but can cause more problems on websites when enabled."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("Browser settings are hidden settings already in your browser, they're shown here to make it easy for you to change them."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("You can find settings such as URL Parameter editing and Bad TLD Protection in the 'Requests' section."),
			$("<br/>"),$("<br/>"),
			$("<h3/>").html("If you find a bug with anything, especially features marked as 'Beta', please report it to <a class='dark' href='mailto:absolutedouble@gmail.com'>absolutedouble@gmail.com</a>"),
			Overlay.CloseUI()
		);

		Overlay.AssignCloseEvent();
		ls.Store("showSettingsTutorial",false);
	},
	ShowScope:function(){
		$("#drop_message").empty().append(
			$("<h1/>").text(lang("tutWhitelistTitle")),
			$("<span/>").text("This is the area of Trace where you can configure where protections will run."),
			$("<br/>"),$("<br/>"),
			$("<span/>").text("Add entries to the list and use the check boxes to select what protections are allowed to run on that page."),
			$("<br/>"),$("<br/>"),
			Overlay.CloseUI()
		);

		Overlay.AssignCloseEvent();
		ls.Store("showScopeTutorial",false);
	}
};