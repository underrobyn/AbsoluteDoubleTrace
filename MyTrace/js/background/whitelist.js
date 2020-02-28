var Whitelist = {
	whitelistDefaults:{
		"Pref_AudioFingerprint":true,
		"Pref_BatteryApi":true,
		"Pref_CanvasFingerprint":true,
		"Pref_ClientRects":true,
		"Pref_CommonTracking":true,
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

	tempList:{
		"search":[],
		"keys":[],
		"values":[]
	},
	useTempWl:false,

	storedList:{},
	decodedList:{
		"keys":[],
		"values":[]
	},
	wlEnabled:true,

	// Thanks to https://gist.github.com/donmccurdy/6d073ce2c6f3951312dfa45da14a420f
	wildcardToRegExp:function(s){
		return new RegExp('^' + s.split(/\*+/).map(Whitelist.regExpEscape).join('.*') + '$');
	},
	regExpEscape:function(s){
		return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
	},

	NewWhitelistFormat:function(old){
		console.log("[plstd]-> Saved new whitelist format");
		let trNewWl = {};
		for (let i = 0, l = Object.keys(old).length;i<l;i++){
			trNewWl["*"+Object.keys(old)[i]+"*"] = {
				"PresetLevel":null,
				"SiteBlocked":false,							// Allow access to the site
				"InitRequests":true,							// Allow the site to make requests to sites in the blocklist
				"Protections":Whitelist.whitelistDefaults		// Object of protections to change on the site
			};
		}
		return trNewWl;
	},
	GetStoredWhitelist:function(cb){
		delete Whitelist.storedList;

		Whitelist.storedList = {};
		Prefs.s.get(["WebData_Whitelist","Main_PageList"],function(s){
			if ((typeof s.Main_PageList === "undefined" || s.Main_PageList === null) && typeof s.WebData_Whitelist !== "object"){
				// If new whitelist isn't set and old one isn't either save a blank one
				Whitelist.SaveWhitelist();
			} else if (typeof s.WebData_Whitelist === "object") {
				// If old whitelist is set convert to new format
				Whitelist.storedList = Whitelist.NewWhitelistFormat(s.WebData_Whitelist);
				Prefs.s.remove(["WebData_Whitelist"]);
				Whitelist.SaveWhitelist();
				if (cb) cb(true);
			} else {
				// If new whitelist is there, set it.
				Whitelist.storedList = s.Main_PageList;
			}
			// Load Whitelist
			Whitelist.LoadWhitelist(cb);
		});
	},
	LoadWhitelist:function(cb){
		delete Whitelist.decodedList;
		Whitelist.decodedList = {
			"keys":[],
			"values":[],
			"presets":[]
		};

		let keys = Object.keys(Whitelist.storedList);
		let vals = Object.values(Whitelist.storedList);
		let defKeys = Object.keys(Whitelist.whitelistDefaults);
		let decoded = {
			"keys":[],
			"values":[]
		};
		let l = keys.length;

		for (let i = 0;i<l;i++){
			decoded["keys"].push(Whitelist.wildcardToRegExp(keys[i]));

			if (typeof vals[i] !== "object") continue;

			try {
				// Repair protections object
				if (typeof vals[i].Protections !== "object" || Object.keys(vals[i].Protections).length !== defKeys.length){
					let repairedProts = vals[i].Protections;
					for (let j = 0, k = defKeys.length;j<k;j++){
						if (typeof repairedProts[defKeys[j]] === "undefined"){
							repairedProts[defKeys[j]] = Whitelist.whitelistDefaults[defKeys[j]];
							console.log("[plstd]-> Updated protections for",keys[i],defKeys[j]);
						}
					}
					vals[i].Protections = repairedProts;
					Whitelist.storedList[keys[i]].Protections = repairedProts;
					Whitelist.UpdateStorage();
				}

				// Add settings preset key if not exists
				if (vals[i].PresetLevel === undefined){
					vals[i].PresetLevel = null;
					Whitelist.storedList[keys[i]].PresetLevel = null;
					Whitelist.UpdateStorage();
				}
			} catch(e){
				console.warn("Caught error");
				console.error(e);
				onerror("WhiteListDecodeError","whitelistscript",126,0,e);
			}

			decoded["values"].push(vals[i]);
		}

		Whitelist.decodedList = decoded;
		Whitelist.wlEnabled = l !== 0;

		if (Trace.DEBUG) console.log("[plstd]-> Decoded pagelist!");
		if (cb) cb();
	},
	SaveWhitelist:function(cb){
		if (Trace.DEBUG) console.log("[plstd]-> Saving pagelist!");
		Prefs.s.set({
			"Main_PageList":Whitelist.storedList
		},function(){
			Whitelist.LoadWhitelist(cb);
		});
	},
	UpdateStorage:function(cb){
		Prefs.s.set({
			"Main_PageList":Whitelist.storedList
		},function(){
			window.location.reload();
			if (cb) cb();
		});
	},
	WhitelistExport:function(cb){
		let exportObj = {
			"fileCompat":1,
			"maxStoreSize":Prefs.s.QUOTA_BYTES || 0,
			"exportTime":(new Date).toString(),
			"traceVersion":chrome.runtime.getManifest().version || null,
			"traceBrowser":navigator.userAgent || "Unknown.",
			"entries":Whitelist.storedList
		};

		cb(exportObj);
	},
	WhitelistImport:function(entries,cb){
		// Remove memory references
		var curr = JSON.parse(JSON.stringify(Whitelist.storedList));
		var fMem = JSON.parse(JSON.stringify(entries));

		var keys = Object.keys(fMem);

		for (let i = 0, l = keys.length;i<l;i++){
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

		Whitelist.storedList = curr;

		if (cb) cb();
	},
	ReturnWhitelist:function(callback){
		callback(Whitelist.storedList);
	},
	GetWhitelist:function(){
		if (!Whitelist.useTempWl) return Whitelist.decodedList;

		// Merge temporary whitelist with main whitelist
		return {
			"keys":[].concat(
				Whitelist.decodedList.keys,
				Whitelist.tempList.keys
			),
			"values":[].concat(
				Whitelist.decodedList.values,
				Whitelist.tempList.values
			)
		};
	},
	EmptyList:function(){
		Whitelist.storedList = {};
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

		Whitelist.storedList[item] = newSafeObject;
		Whitelist.SaveWhitelist(cb);
	},
	RemoveItem:function(item,cb){
		delete Whitelist.storedList[item];
		if (cb) Whitelist.SaveWhitelist(cb);
	},
	AddTempItem:function(item,cb){
		if (typeof item !== "string" || item.length < 2){
			return "Invalid entry";
		}

		let template = new ProtectionTemplate(false);
		template.tempEntry = true;

		// Update temp whitelist
		Whitelist.tempList.search.push(item);
		Whitelist.tempList.keys.push(Whitelist.wildcardToRegExp(item));
		Whitelist.tempList.values.push(template);

		// Allow Trace to see temp whitelist
		Whitelist.useTempWl = true;

		if (Trace.DEBUG) console.log("[tmpwd]-> Added %s to the temporary whitelist",item);
		if (cb) cb();
	},
	RemoveTempItem:function(item,cb){
		var index = Whitelist.tempList.search.indexOf(item);

		if (index === -1) return;

		Whitelist.tempList.search.splice(index,1);
		Whitelist.tempList.keys.splice(index,1);
		Whitelist.tempList.values.splice(index,1);

		console.log(Whitelist.tempList.keys.length);
		Whitelist.useTempWl = Whitelist.tempList.keys.length !== 0;

		if (Trace.DEBUG) console.log("[tmpwd]-> Removed %s from the temporary whitelist",item);
		if (cb) cb();
	},
	CheckList:function(url,protection){
		// Check if protection can run on all pages
		let globalAllow = Prefs.Current.Main_ExecutionOrder.AllPage.indexOf(protection) !== -1;

		//if (Trace.DEBUG) console.log("[plstd]-> Checking",url,"for",protection,":",(Whitelist.DoCheck(url) !== false ? Whitelist.DoCheck(url).Protections[protection] : globalAllow));

		// If whitelist is empty -> go with the default option
		if (Whitelist.wlEnabled !== true) return globalAllow;

		// Check if the item is in the whitelist
		let checkResult = Whitelist.DoCheck(url);

		// If not (or there is an error) -> go with the default option
		if (!checkResult || !checkResult.Protections) return globalAllow;

		// Return the value of the protection, if the value isn't set return true
		return !!checkResult.Protections[protection];
	},
	DoCheck:function(url){
		var activeWl = Whitelist.GetWhitelist();
		for (let i = 0, l = activeWl.keys.length;i<l;i++){
			if (activeWl.keys[i].test(url)){
				return activeWl.values[i];
			}
		}
		return false;
	}
};