var Web = {

	GetInstallCodes:function(){
		let codeArray = Prefs.Current.Pref_WebController.installCodes;
		let installCodes = "";
		for (let i = 0,l = Object.keys(codeArray).length;i<l;i++){
			if(codeArray[Object.keys(codeArray)[i]] === true){
				installCodes += Object.keys(codeArray)[i] + ",";
			}
		}

		installCodes = installCodes.substring(0,installCodes.length-1);
		return installCodes;
	},

	BlocklistLoader:function(bypassCache){
		// Check if we are going to make a cache check
		if (bypassCache || Prefs.Current.Main_Trace.DomainCache.enabled !== true){
			Web.GetBlockList(0,0);
			return;
		}

		var installCodes = Web.GetInstallCodes();

		let url = Vars.blocklistURL;
		url += "?r=" + (typeof(Vars.Premium) !== "string" || Vars.Premium === "" ? "rv" : "pv");
		url += "&a=cache";
		url += "&v=" + Vars.listCompat;
		url += "&c=" + btoa(installCodes);

		$.ajax({
			url:url,
			dataType:"text",
			method:"GET",
			timeout:50000,
			beforeSend:function(){
				if (Trace.DEBUG) console.log("[cachd]-> Checking blocklist version against main server");
			},
			success:function(version){
				if (Trace.DEBUG) console.log("[cachd]-> Got version from server, server version is",version);

				try{
					var vInfo = JSON.parse(version);
				} catch(e){
					console.error(e);
					Web.GetBlockList(0,0);
					return;
				}

				Prefs.s.get([
					"WebCache_Version"
				],function(v){
					if (typeof(v.WebCache_Version) !== "number"){
						Web.GetBlockList(0,0);
					} else if (v.WebCache_Version !== vInfo.db_version){
						Web.GetBlockList(0,0);
					} else {
						Web.BlocklistCache([v.WebCache_Version,vInfo.db_version]);
					}
				});
			},
			error:function(e){
				if (navigator.onLine){
					if (Trace.DEBUG) console.error(e);
				}

				Web.GetBlockList(0,0);
			}
		});
	},
	BlocklistURL:function(attempt,server){
		if (server === 2) return Vars.blocklistOffline;

		let url;
		let installCodes = Web.GetInstallCodes();

		function getdparam(){
			return Math.round((new Date()).getTime()/1000)*2;
		}

		if (typeof(Vars.Premium) !== "string" || Vars.Premium === "" || attempt > 2){
			if (server === 0){
				url = Vars.blocklistURL;
				url += "?d=" + btoa(getdparam());
				url += "&a=download";
				url += "&v=" + Vars.listCompat;
				url += "&c=" + btoa(installCodes);
				url += "&l=true";
			} else {
				url = Vars.blocklistFallback;
			}
		} else {
			url = Vars.blocklistBase;
			url += btoa(Vars.Premium);
			url += "&s=" + btoa(Vars.appSecret);
			url += "&a=download";
			url += "&d=" + btoa(getdparam());
			url += "&v=" + Vars.listCompat;
			url += "&c=" + btoa(installCodes);
			url += "&f=" + "json";
			url += "&l=true";
		}

		return url;
	},
	GetBlockList:function(attempt,server){
		// Check if user is online
		if (!navigator.onLine || attempt > 3) {
			// Use local blocklist if we can
			if (Prefs.Current.Pref_WebController.useLocal.enabled === true){
				Trace.Notify("You don't seem to be connected to the internet. Will use built in blocklist.", "protd");
				server = 2;
			} else {
				Trace.Notify(lang("miscMsgOffline"), "protd");
				return false;
			}
		}

		if (attempt > 5){
			Trace.Notify("Error downloading blocklist! Unable to download blocklist for unknown reasons. Domain protection will not function.","protd");
			return false;
		}
		attempt++;

		// Get URL
		let url = Web.BlocklistURL(attempt,server);

		// Create XMLHttpRequest
		var xhr = new XMLHttpRequest();
		xhr.timeout = 50000;
		xhr.open("get",url,true);

		if (Trace.DEBUG) console.info("[protd]-> Loading from: " + Vars.serverNames[server] + " server");

		// Notify blocklist download progress if user allows notifications
		if (Vars.bNotifications === true && server !== 2){
			xhr.onprogress = function(evt){
				if (!evt.lengthComputable) return;

				var percentComplete = Math.round(((evt.loaded / evt.total) * 100));
				try {
					chrome.notifications.create("notification",{
						"type":"progress",
						"title":"Trace",
						"message":"Updating Blocklist...",
						"iconUrl":Vars.notifIcon,
						"progress":percentComplete
					});
				} catch(e){
					console.log("[protd]-> Notifications aren't allowed.");
				}
			};
		}

		xhr.onreadystatechange = function(){
			if (xhr.readyState !== 4) return;

			let status = xhr.status,
				sName = Vars.serverNames[server],
				data;

			if (status === 200){
				try {
					data = JSON.parse(xhr.responseText);
				} catch(e) {
					Trace.Notify("Parsing downloaded blocklist error! Will retry.","protd");
					setTimeout(function(){
						Web.GetBlockList(attempt,1);
					},attempt*1250);
					return false;
				}

				// Apply list
				Trace.Notify("Got blocklist from " + sName + " server","protd");
				Web.ApplyWebBlocklist(data,server);
				return true;
			}

			let headerResp = xhr.getResponseHeader("x-trace-list");
			if (headerResp !== null && headerResp !== "x-trace-list"){
				console.error(JSON.stringify({"Event":"GetBlocklistDownloadFailure","TraceListHead":headerResp,"ErrorObj":{"status":status,"text":xhr.statusText}}));
			}

			switch (status){
				case 0:
					Trace.Notify("Couldn't download blocklist because a connection couldn't be made to the server.", "protd");
					break;
				case 402:
					Trace.Notify("Your premium code is invalid! It has been removed from Trace's storage", "protd");
					break;
				case 403:
					Trace.Notify("One or more security parameters were missing when updating the blocklist", "protd");
					break;
				case 404:
					Trace.Notify("Trace recieved a 404 from " + sName + " blocklist server.","protd");
					break;
				case 508:
				case 520:
					Trace.Notify("Cloudflare error occurred when downloading update to blocklist.", "protd");
					break;
				default:
					Trace.Notify("Trace couldn't download the blocklist, unknown error from " + sName + " blocklist server.","protd");
					break;
			}

			// Retry blocklist download
			if (server === 0){
				Trace.Notify("Failed to load blocklist from main server, trying from a different server..","protd");
				server = 1;
			} else {
				Trace.Notify("Failed to load blocklist from server, trying again. Attempt " + attempt + " of 6","protd");
			}
			setTimeout(function(){
				Web.GetBlockList(attempt,server);
			},attempt*1000);
		};

		// Send XHR Request
		xhr.send();
	},
	BlocklistCache:function(ver){
		Trace.Notify("Using WebCache. Cache version: " + ver[0] + "; Server Version: " + ver[1],"cachd");

		Prefs.s.get([
			"WebCache_Type",
			"WebCache_Data"
		],function(r){
			let data = {
				list_version:ver[1],
				list_type:r.WebCache_Type,
				data:r.WebCache_Data
			};

			Web.ApplyWebBlocklist(data,3);
		});
	},
	CacheTheList:function(db){
		if (!db.data){
			return false;
		}

		// Put database in localstorage
		Prefs.s.set({
			"WebCache_Version":db.list_version || 0,
			"WebCache_Type":db.list_type || "Unknown",
			"WebCache_Data":{
				"domain":db.data.domain || [],
				"host":db.data.host || [],
				"url":db.data.url || [],
				"tld":db.data.tld || [],
				"file":db.data.file || []
			}
		},function(){
			if (Trace.DEBUG) console.info("[stord]-> Saved database cache to local storage");
		});
	},
	ClearDomainCache:function(){
		Prefs.s.set({
			"WebCache_Version":0,
			"WebCache_Type":"",
			"WebCache_Data":{
				"domain":[],
				"host":[],
				"url":[],
				"tld":[],
				"file":[]
			}
		},function(){
			if (Trace.DEBUG) console.info("[cachd]-> Cleared cache");
		});
	},
	ApplyWebBlocklist:function(db,fromServer){
		// No point caching the list if it's already cached
		if (fromServer === 3){
			Web.CacheTheList(db);
		}

		// Log where list came from
		if (Trace.DEBUG) console.log("[protd]-> Loaded blocklist from",Vars.serverNames[fromServer]);

		// Load web domain database into program
		WebBlocker.meta.fromServer = fromServer;
		WebBlocker.meta.listTypeName = db.list_type;
		WebBlocker.meta.listVersion = db.list_version;

		// Get data from source into program
		if (typeof db.data !== "object"){
			if (fromServer === 3) Web.ClearDomainCache();
			db.data = {};
		}

		WebBlocker.blocked.domain = db.data.domain || [];
		WebBlocker.blocked.host = db.data.host || [];
		WebBlocker.blocked.url = db.data.url || [];
		WebBlocker.blocked.tld = db.data.tld || [];
		WebBlocker.blocked.file = db.data.file || [];

		// Add TLD list from Trace
		WebBlocker.blocked.tld = WebBlocker.blocked.tld.concat(Trace.g.BadTopLevelDomain.GetList());

		// Tell the checker what to check for
		Object.keys(WebBlocker.blocked).map(function(key) {
			WebBlocker.validate[key] = WebBlocker.blocked[key].length > 0;
		});

		Trace.Notify("Trace WebController has loaded the blocklists and is ready.","protd");
	},
	ToggleBlockPings:function(){
		if (Prefs.Current.Pref_PingBlock.enabled === true && Prefs.Current.Pref_PingBlock.pingRequest.enabled === true){
			try {
				chrome.webRequest.onBeforeRequest.addListener(
					WebBlocker.PingBlocker,
					{
						urls:["http://*/*","https://*/*","ws://*/*","wss://*/*"],
						types:["ping"]
					},
					["blocking"]
				);
			} catch(e){
				if (e.message && e.message.toLowerCase().includes("invalid value for argument 1")){
					Trace.Notify("Ping blocks are not supported by your browser.","pingd");
				}
			}
		} else {
			if (Prefs.Current.Pref_PingBlock.pingRequest.enabled !== true){
				try {
					chrome.webRequest.onBeforeRequest.removeListener(WebBlocker.PingBlocker);
				} catch(e){
					console.error(e);
				}
			}
		}
	}
};

var WebBlocker = {
	meta:{
		usingCache:false,
		isBlocking:false,
		listTypeName:"regular",
		listVersion:0
	},
	params:{
		urlPatterns:["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"],
		dataTypes:[
			"image",
			"sub_frame",
			"main_frame",
			"object",
			"xmlhttprequest",
			"stylesheet",
			"ping",
			"other",
			"script",
			"font",
			"csp_report",
			"media",
			"websocket"
		]
	},
	validate:{
		tld:false,
		domain:false,
		host:false,
		url:false,
		file:false,
		query:false
	},
	blocked:{
		tld:[],
		domain:[],
		host:[],
		url:[],
		file:[],
		query:[]
	},

	// Thanks to https://github.com/Olical/binary-search/blob/master/src/binarySearch.js
	arraySearch:function(list,item){
		let min = 0, max = list.length - 1, guess;

		let bitwise = (max <= 2147483647);
		if (bitwise) {
			while (min <= max) {
				guess = (min + max) >> 1;
				if (list[guess] === item) {
					return guess;
				} else {
					if (list[guess] < item) {
						min = guess + 1;
					} else {
						max = guess - 1;
					}
				}
			}
		} else {
			while (min <= max) {
				guess = Math.floor((min + max) / 2);
				if (list[guess] === item) {
					return guess;
				} else {
					if (list[guess] < item) {
						min = guess + 1;
					} else {
						max = guess - 1;
					}
				}
			}
		}

		return -1;
	},

	PingBlocker:function(d){
		// Check if Trace is paused
		if (Vars.paused !== false) return {cancel:false};

		if (d.type === "ping" && d.tabId < 0){
			Stats.LogStat(d.type);
			Tabs.LogRequest(d.tabId,d.type);
			return {cancel:true};
		}
	},
	AssignChecker:function(){
		if (WebBlocker.meta.isBlocking){
			WebBlocker.RestartChecker();
			return false;
		}

		if (typeof chrome.webRequest === "undefined") {
			Trace.Notify("Failed to access browser WebRequest API. Maybe we don't have permission","webcd");
			return false;
		}

		try {
			chrome.webRequest.onBeforeRequest.addListener(WebBlocker.RequestChecker,{
				"types":WebBlocker.params.dataTypes,
				"urls":WebBlocker.params.urlPatterns
			},["blocking"]);
		} catch(e){
			if (e.message && e.message.toLowerCase().includes("invalid value for argument 1.")){
				WebBlocker.params.dataTypes.splice(8,4);
				WebBlocker.params.dataTypes.splice(7,1);
				chrome.webRequest.onBeforeRequest.addListener(WebBlocker.RequestChecker,{
					"types":WebBlocker.params.dataTypes,
					"urls":WebBlocker.params.urlPatterns
				},["blocking"]);
			}
		}
		WebBlocker.meta.isBlocking = true;
	},
	RemoveChecker:function(){
		Trace.Notify("Stopping WebRequestController","webcd");
		chrome.webRequest.onBeforeRequest.removeListener(WebBlocker.RequestChecker);
		WebBlocker.meta.isBlocking = false;
	},
	RestartChecker:function(){
		WebBlocker.RemoveChecker();
		setTimeout(WebBlocker.AssignChecker,2000);
	},
	CleanURL:function(s,type){
		// If no params to edit, return
		if (!s.includes("?")) return s;

		if (Prefs.Current.Pref_WebController.urlCleaner.queryString[type].level === 4){
			return s.split('?')[0];
		}

		let params = Trace.g.URLCleaner.GetList(type);
		let parsed = new URL(s);

		for (let key of parsed.searchParams.keys()) {
			if (params.indexOf(key) === -1) continue;

			if (Prefs.Current.Pref_WebController.urlCleaner.queryString[type].method === "randomise"){
				parsed.searchParams.set(key,makeRandomID(10));
				if (Trace.DEBUG) console.log("-Rand Param: "+key);
			} else {
				parsed.searchParams.delete(key);
				if (Trace.DEBUG) console.log("-Remv Param: "+key);
			}
		}

		return parsed.href;
	},
	RequestChecker:function(request){
		// Check if URL is valid
		if (request.tabId === -1 || typeof request.url !== "string" || request.url.substring(0,4) !== "http"){
			return {cancel:false};
		}

		// Check if Trace is paused
		if (Vars.paused !== false){
			return {cancel:false};
		}

		// Split URL into its component parts
		var host = extractHostname(request.url);
		var domain = extractRootDomain(host);

		//if (Headers.Helpers.isRequestThirdParty(request)){
		//	console.log(request);
		//}

		if (Whitelist.wlEnabled === true){
			var initUrl, reqUrl = request.url;
			if (typeof request.initiator === "string") initUrl = request.initiator;
			if (typeof request.originUrl === "string") initUrl = request.originUrl;

			var wl = Whitelist.GetWhitelist();
			for (let i = 0, l = wl.keys.length;i<l;i++){
				// Check if this page is allowed to be accessed
				if (wl.keys[i].test(reqUrl)){
					if (wl.values[i].SiteBlocked === false){
						return {cancel:false};
					} else {
						return {cancel:true};
					}
				}

				// Check if this item is allowed to make requests
				if (typeof initUrl !== "undefined"){
					if (wl.keys[i].test(initUrl)){
						if (wl.values[i].InitRequests === true){
							return {cancel:false};
						}
					}
				}
			}
		}

		// Blocking time... Maybe
		var blockType = 0;

		// Check for TLD block
		if (WebBlocker.validate.tld === true){
			var toplevel = domain.split(".").reverse()[0];
			if (WebBlocker.arraySearch(WebBlocker.blocked.tld,toplevel) !== -1){
				blockType = 1;
			}
		}

		// Anything other than a TLD block
		if (blockType === 0){
			// Check for Domain block
			if (WebBlocker.validate.domain === true) {
				if (WebBlocker.arraySearch(WebBlocker.blocked.domain, domain) !== -1) {
					blockType = 2;
				}
			}

			// Check for Host block
			if (WebBlocker.validate.host === true){
				if (WebBlocker.arraySearch(WebBlocker.blocked.host,host) !== -1) {
					blockType = 3;
				}
			}

			// Check for URL block
			var cleanURL = request.url.replace(/#[^#]*$/,"").replace(/\?[^\?]*$/,"");
			if (WebBlocker.validate.url === true){
				var url = cleanURL.split("://")[1];
				if (WebBlocker.arraySearch(WebBlocker.blocked.url,url) !== -1){
					blockType = 4;
				}
			}

			// Check for file block
			if (WebBlocker.validate.file === true){
				var file = cleanURL.split("/").pop();
				if (file.length !== 0){
					if (WebBlocker.arraySearch(WebBlocker.blocked.file,file) !== -1){
						blockType = 5;
					}
				}
			}
		}

		// Check if we need to show a 'blocked' page
		var redirectToBlocked = false;
		//if (Prefs.Current.Pref_WebController.showBlocked.enabled === true){
			if (request.type === "main_frame"){
				redirectToBlocked = true;
			}
		//}

		// Check if we need to block the request
		if (blockType !== 0){
			if (Prefs.Current.Main_Trace.ProtectionStats.enabled === true){
				Stats.LogStat(request.type);
				Tabs.LogRequest(request.tabId,request.type);
				//Tabs.LogUri(request.tabId,request.url);
			}

			if (redirectToBlocked){
				return {redirectUrl:(chrome.runtime.getURL("html/blocked.html") + "#u;" + btoa(request.url) + "&" + blockType)};
			}

			switch(request.type){
				case "image":
					return {redirectUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="};
				case "sub_frame":
					return {redirectUrl:"about:blank"};
				default:
					return {cancel:true};
			}
		}

		// Modify URL?
		var modifiedUrl = false;
		if (Prefs.Current.Pref_WebController.urlCleaner.enabled === true){
			var newUrl = request.url, fragment = [];

			// First deal with the fragment
			if (Prefs.Current.Pref_WebController.urlCleaner.fragmentHash.enabled === true){
				newUrl = newUrl.split("#")[0];
				modifiedUrl = true;
			} else {
				fragment = newUrl.split("#");
			}

			// Then clean the query string
			if (Prefs.Current.Pref_WebController.urlCleaner.queryString.enabled === true) {
				modifiedUrl = false;

				// Remove fragment before cleaning URL
				//if (fragment.length === 2){
				//newUrl = fragment[0];
				//}
				if ((request.type === "main_frame" || request.type === "sub_frame") && Prefs.Current.Pref_WebController.urlCleaner.queryString.main_frame.level !== -1) {
					newUrl = WebBlocker.CleanURL(newUrl,"main_frame");
					modifiedUrl = true;
				}

				// Stop redirect loops
				if (newUrl === request.url){
					modifiedUrl = false;
				}

				// Re-add fragment
				//if (fragment.length === 2){
				//	newUrl = newUrl + "#" + fragment[1];
				//}
			}

			// If modifications were made then we redirect the user to the modified version
			if (modifiedUrl !== false){
				return {redirectUrl:newUrl};
			}
		}

		return {cancel:false};
	}
};