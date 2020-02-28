var Tabs = {
	TabInfo:true,
	TabList:{},
	ActiveTab:{
		"tab":0,
		"window":0
	},
	DataTemplate:{
		blockedUris:[],
		webRequests:{
			webpage:0,
			code:0,
			media:0,
			other:0
		},
		headers:{
			cookies:0,
			setcookie:0,
			referer:0,
			etag:0,
			google:0,
			useragent:0,
			proxyip:0
		}/*,
			javascript:{
				canvas:false,
				audio:false,
				webrtc:false,
				clientrects:false,
				plugins:false,
				hardware:false,
				battery:false,
				screenres:false,
				netinfo:0,
				sendbeacon:0
			}*/
	},

	Init:function(){
		if (Tabs.TabInfo !== true) return;

		Trace.Notify("Loading information about current tabs...","tabmd");
		if (Trace.DEBUG) console.log("[tabmd]-> Initialising...");

		Tabs.AssignEvents();
		Tabs.List.GetAllTabs();
	},

	AssignEvents:function(){
		chrome.tabs.onRemoved.addListener(Tabs.Events.removed);	// Event not always fired when flag: "Fast tab/window close" is enabled
		chrome.tabs.onCreated.addListener(Tabs.Events.created);
		chrome.tabs.onActivated.addListener(Tabs.Events.activate);
		chrome.tabs.onHighlighted.addListener(Tabs.Events.highlight);
		chrome.tabs.onUpdated.addListener(Tabs.Events.updated);
	},
	RemoveEvents:function(){
		chrome.tabs.onRemoved.removeListener(Tabs.Events.removed);
		chrome.tabs.onCreated.removeListener(Tabs.Events.created);
		chrome.tabs.onActivated.removeListener(Tabs.Events.activate);
		chrome.tabs.onHighlighted.removeListener(Tabs.Events.highlight);
		chrome.tabs.onUpdated.removeListener(Tabs.Events.updated);
	},

	Events:{
		removed:function(id) {
			if (Tabs.List.TabAccounted(id)) {
				Tabs.List.Remove(id);
			} else {
				if (Trace.DEBUG) console.log("[tabmd]-> Failed to remove tab id",id);
			}
		},
		created:function(tab){
			Tabs.List.Add(tab.id,tab.url);
			if (Trace.DEBUG) console.log("[tabmd]-> Added tab id",tab.id);
		},
		activate:function(id){
			Tabs.ActiveTab.tab = id.tabId;
			Tabs.ActiveTab.window = id.windowId;
			Tabs.List.GetTabId(id.tabId);
		},
		highlight:function(tab){
			//for (let i = 0;i<)
		},
		updated:function(tabId,state,tab){
			// Fired when an attribute changes, e.g. url, or audible
			if (!Tabs.List.TabAccounted(tabId)){
				Tabs.List.Add(tabId,tab.url);
				return;
			}

			if (!state || !state.hasOwnProperty("status")) return;
			if (state.status !== "loading") return;

			if (Trace.DEBUG) console.log("[tabmd]-> Updated data template for",tab.id,"as URL changed to",tab.url);

			// Prevent referenced object issue by cloning object instead (same fix in Tabs.List.Add)
			var template = JSON.parse(JSON.stringify(Tabs.DataTemplate));

			// Replace the URL and Data template
			Tabs.TabList[tabId].data = template;
			Tabs.TabList[tabId].url = tab.url;
		}
	},

	List:{
		TabAccounted:function(id){
			return (typeof Tabs.TabList[id] !== "undefined");
		},
		Add:function(id,url){
			// Prevents issue where all tabs would have the same statistics
			var template = JSON.parse(JSON.stringify(Tabs.DataTemplate));

			Tabs.TabList[id] = {
				data:template,
				url:url
			};
		},
		Remove:function(id){
			delete Tabs.TabList[id];
			if (Trace.DEBUG) console.log("[tabmd]-> Removed tab id",id);
		},
		GetTabId:function(id,cb){
			if (id < 0) return;
			if (!Tabs.List.TabAccounted(id)){
				if (Trace.DEBUG) console.log("[tabmd]-> Found new tab!",id);
				chrome.tabs.get(id,function(tab){
					// TODO: Check tab exists
					Tabs.List.Add(id,tab.url);
					if (cb) cb();
				});
			} else {
				if (cb) cb();
			}
		},
		GetAllTabs:function(){
			chrome.tabs.query({}, function(tabs) {
				for (let i = 0;i<tabs.length;i++){
					if (Tabs.List.TabAccounted(tabs[i].id)) {
						if (Trace.DEBUG) console.log("[tabmd]-> Skipped tab id", tabs[i].id);
						continue;
					}

					Tabs.List.Add(tabs[i].id,tabs[i].url);
				}
				if (Trace.DEBUG) console.log("[tabmd]-> Found new tabs! [" + tabs.length + " total]");
			});
		}
	},

	LogHeaders:function(tabId,header){
		// Check if the tab is in the list, if not add it
		Tabs.List.GetTabId(tabId,function(){
			//if (Trace.DEBUG) console.log("[tabmd]-> Logged stat for tab",tabId,header);
			Tabs.TabList[tabId].data.headers[header] = Tabs.TabList[tabId].data.headers[header] + 1;
		});
	},

	LogRequest:function(tabId,type){
		// Check if the tab is in the list, if not add it
		Tabs.List.GetTabId(tabId,function(){
			//if (Trace.DEBUG) console.log("[tabmd]-> Logged stat for tab",tabId,Stats.TypeNames[type]);
			Tabs.TabList[tabId].data.webRequests[Stats.TypeNames[type]] = Tabs.TabList[tabId].data.webRequests[Stats.TypeNames[type]] + 1;
		});
	},

	LogUri:function(tabId,url){
		// Check if the tab is in the list, if not add it
		Tabs.List.GetTabId(tabId,function(){
			//if (Trace.DEBUG) console.log("[tabmd]-> Logged stat for tab",tabId,Stats.TypeNames[type]);
			Tabs.TabList[tabId].data.blockedUris.push(url);
		});
	},

	ReturnTabInfo:function(cb){
		if (Trace.DEBUG) console.log("[tabmd]-> Providing information about tab id",tabId);
		cb(Tabs.TabList[tabId]);
	}
};