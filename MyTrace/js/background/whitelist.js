var Whitelist = {
	whitelistDefaults:{
		"Pref_AudioFingerprint":true,
		"Pref_BatteryApi":true,
		"Pref_CanvasFingerprint":true,
		"Pref_ClientRects":true,
		"Pref_CookieEater":true,
		"Pref_ETagTrack":true,
		"Pref_GoogleHeader":true,
		"Pref_IPSpoof":true,
		"Pref_NativeFunctions":true,
		"Pref_NetworkInformation":true,
		"Pref_HardwareSpoof":true,
		"Pref_PingBlock":true,
		"Pref_PluginHide":true,
		"Pref_ReferHeader":true,
		"Pref_ScreenRes":true,
		"Pref_UserAgent":true,
		"Pref_WebRTC":true,
		"Pref_WebGLFingerprint":true
	},

	tempWhitelist:{
		"keys":[],
		"values":[]
	},
	useTempWl:false,

	storedWhitelist:{},
	decodedWhitelist:{
		"keys":[],
		"values":[]
	},
	wlEnabled:true,

	NewWhitelistFormat:function(old){
		console.log("Saved new whitelist format");
		var trNewWl = {};
		for (var i = 0, l = Object.keys(old).length;i<l;i++){
			trNewWl["*"+Object.keys(old)[i]+"*"] = {
				"SiteBlocked":false,	// Allow access to the site
				"InitRequests":true,	// Allow the site to make requests to sites in the blocklist
				"Protections":Whitelist.whitelistDefaults		// Object of protections to change on the site
			};
		}
		return trNewWl;
	},
	GetStoredWhitelist:function(cb){
		delete Whitelist.storedWhitelist;

		Whitelist.storedWhitelist = {};
		Vars.s.get(["WebData_Whitelist","Main_PageList"],function(s){
			if ((typeof s.Main_PageList === "undefined" || s.Main_PageList === null) && typeof s.WebData_Whitelist !== "object"){
				// If new whitelist isn't set and old one isn't either save a blank one
				Whitelist.SaveWhitelist();
			} else if (typeof s.WebData_Whitelist === "object") {
				// If old whitelist is set convert to new format
				Whitelist.storedWhitelist = Whitelist.NewWhitelistFormat(s.WebData_Whitelist);
				Vars.s.remove(["WebData_Whitelist"]);
				Whitelist.SaveWhitelist();
				if (cb) cb(true);
			} else {
				// If new whitelist is there, set it.
				Whitelist.storedWhitelist = s.Main_PageList;
			}
			// Load Whitelist
			Whitelist.LoadWhitelist(cb);
		});
	},
	LoadWhitelist:function(cb){
		delete Whitelist.decodedWhitelist;
		Whitelist.decodedWhitelist = {
			"keys":[],
			"values":[]
		};

		var keys = Object.keys(Whitelist.storedWhitelist);
		var vals = Object.values(Whitelist.storedWhitelist);
		var defKeys = Object.keys(Whitelist.whitelistDefaults);
		var decoded = {
			"keys":[],
			"values":[]
		};
		var l = keys.length;

		for (var i = 0;i<l;i++){
			decoded["keys"].push(Utils.wildcardToRegExp(keys[i]));

			if (typeof vals[i] !== "object"){
				continue;
			}

			try {
				// Repair protections object
				if (typeof vals[i].Protections !== "object" || Object.keys(vals[i].Protections).length !== defKeys.length){
					var repairedProts = vals[i].Protections;
					for (var j = 0, k = defKeys.length;j<k;j++){
						if (typeof repairedProts[defKeys[j]] === "undefined"){
							repairedProts[defKeys[j]] = Whitelist.whitelistDefaults[defKeys[j]];
							console.log("[plstd]-> Updated protections for",keys[i],defKeys[j]);
						}
					}
					vals[i].Protections = repairedProts;
					Whitelist.storedWhitelist[keys[i]].Protections = repairedProts;
					Whitelist.UpdateStorage();
				}

				// Add settings preset key if not exists
				if (vals[i].PresetLevel === undefined){
					vals[i].PresetLevel = null;
					Whitelist.storedWhitelist[keys[i]].PresetLevel = null;
					Whitelist.UpdateStorage();
				}
			} catch(e){
				console.warn("Caught error");
				console.error(e);
				onerror("WhiteListDecodeError","backgroundscript",1052,0,e);
			}

			decoded["values"].push(vals[i]);
		}

		Whitelist.decodedWhitelist = decoded;
		Whitelist.wlEnabled = l !== 0;

		if (Trace.DEBUG) console.log("[plstd]-> Decoded pagelist!");
		if (cb) cb();
	},
	SaveWhitelist:function(cb){
		if (Trace.DEBUG) console.log("[plstd]-> Saving pagelist!");
		Vars.s.set({
			"Main_PageList":Whitelist.storedWhitelist
		},function(){
			Whitelist.LoadWhitelist(cb);
		});
	},
	UpdateStorage:function(cb){
		Vars.s.set({
			"Main_PageList":Whitelist.storedWhitelist
		},function(){
			window.location.reload();
			if (cb) cb();
		});
	},
	WhitelistExport:function(cb){
		var exportObj = {
			"fileCompat":1,
			"maxStoreSize":Vars.s.QUOTA_BYTES || 0,
			"exportTime":(new Date).toString(),
			"traceVersion":chrome.runtime.getManifest().version || null,
			"traceBrowser":navigator.userAgent || "Unknown.",
			"entries":Whitelist.storedWhitelist
		};

		cb(exportObj);
	},
	WhitelistImport:function(entries,cb){
		// Remove memory references
		var curr = JSON.parse(JSON.stringify(Whitelist.storedWhitelist));
		var fMem = JSON.parse(JSON.stringify(entries));

		var keys = Object.keys(fMem);

		for (var i = 0, l = keys.length;i<l;i++){
			// Override values already in list with same key
			if (curr[keys[i]] !== undefined){
				console.log("[plstd]-> Overriding Entry:",keys[i]);
				curr[keys[i]] = fMem[keys[i]];
				continue;
			}

			// Write new keys to list
			curr[keys[i]] = fMem[keys[i]];
			console.log("[plstd]-> Imported Entry:",keys[i]);
		}

		Whitelist.storedWhitelist = curr;

		if (cb) cb();
	},
	ReturnWhitelist:function(callback){
		callback(Whitelist.storedWhitelist);
	},
	GetWhitelist:function(){
		if (!Whitelist.useTempWl) return Whitelist.decodedWhitelist;

		// Merge temporary whitelist with main whitelist
		return {
			"keys":[].concat(
				Whitelist.decodedWhitelist.keys,
				Whitelist.tempWhitelist.keys
			),
			"values":[].concat(
				Whitelist.decodedWhitelist.values,
				Whitelist.tempWhitelist.values
			)
		};
	},
	EmptyList:function(){
		Whitelist.storedWhitelist = {};
		Whitelist.SaveWhitelist();
	},
	EditItem:function(removeItem,addItem,newObject,cb){
		Whitelist.RemoveItem(removeItem);
		Whitelist.AddItem(addItem,newObject,cb);
	},
	AddItem:function(item,newObject,cb){
		if (typeof item !== "string" || item.length < 2){
			return "Invalid entry";
		}
		// this needs to stay as a variable statement to do some memory assignment trickery in firefox to fix issue #4
		var newSafeObject = JSON.parse(JSON.stringify(newObject));

		Whitelist.storedWhitelist[item] = newSafeObject;
		//Whitelist.storedWhitelist[item] = newObject;
		Whitelist.SaveWhitelist(cb);
	},
	RemoveItem:function(item,cb){
		delete Whitelist.storedWhitelist[item];
		if (cb) Whitelist.SaveWhitelist(cb);
	},
	CheckWhitelist:function(url,protection){
		// Check if protection can run on all pages
		var globalAllow = Prefs.Current.Main_ExecutionOrder.AllPage.indexOf(protection) !== -1;

		//if (Trace.DEBUG) console.log("[plstd]-> Checking",url,"for",protection,":",(Whitelist.DoCheck(url) !== false ? Whitelist.DoCheck(url).Protections[protection] : globalAllow));

		// If whitelist is empty -> go with the default option
		if (Whitelist.wlEnabled !== true) return globalAllow;

		// Check if the item is in the whitelist
		var checkResult = Whitelist.DoCheck(url);

		// If not (or there is an error) -> go with the default option
		if (!checkResult || !checkResult.Protections) return globalAllow;

		// Return the value of the protection, if the value isn't set return true
		return !!checkResult.Protections[protection];
	},
	DoCheck:function(url){
		var activeWl = Whitelist.GetWhitelist();
		for (var i = 0, l = activeWl.keys.length;i<l;i++){
			if (activeWl.keys[i].test(url)){
				return activeWl.values[i];
			}
		}
		return false;
	}
};