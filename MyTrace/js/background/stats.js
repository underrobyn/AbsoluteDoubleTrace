var Stats = {
	Current:{},
	Main:{"total":0,"webpage":0,"media":0,"code":0,"other":0},
	TimeSinceLastUpdate:0,
	TypeNames:{
		"main_frame":"webpage",
		"sub_frame":"webpage",
		"stylesheet":"media",
		"script":"code",
		"image":"media",
		"font":"media",
		"object":"code",
		"xmlhttprequest":"other",
		"csp_report":"other",
		"media":"media",
		"websocket":"other",
		"ping":"other",
		"other":"other"
	},
	LogStat:function(type){
		if (Prefs.Current.Main_Trace.ProtectionStats.enabled === false) return;

		// Get date time reference for today
		let TimeRef = Stats.GenTime();

		// Convert chrome type to TraceType
		let TraceType = Stats.TypeNames[type];

		if (TraceType === undefined) console.error("Massive type error, unknown type:",type);

		// If data time reference doesn't exist, create a new object
		if (Stats.Current[TimeRef[0]] === undefined){
			Stats.Current[TimeRef[0]] = {
				"webpage":0,
				"media":0,
				"code":0,
				"other":0
			};
		}

		// Update the appropriate values
		Stats.Current[TimeRef[0]][TraceType]++;
		Stats.Main[TraceType]++;
		Stats.Main["total"]++;

		// Schedule save data (to not affect page load time)
		chrome.alarms.create("StatsDatabaseRefresh",{when:TimeRef[1]});
	},
	GenTime:function(){
		let d = getDateStrings();
		return [
			(d[0] + "-" + d[1] + "-" + d[2]).toString(),
			Date.now()+3000
		];
	},
	SaveStats:function(cb){
		Prefs.s.set({
			"stats_db":Stats.Current,
			"stats_main":Stats.Main
		},function(){
			if (cb) cb();
		});
	},
	LoadStats:function(){
		Prefs.s.get(
			["stats_db", "stats_main"],
			function(s){
				let forceStatSave = false;

				// Load the current statistics
				if (typeof(s.stats_db) !== "undefined") {
					Stats.Current = s.stats_db;
				} else {
					Stats.Current = {};
					forceStatSave = true;
				}

				if (typeof(s.stats_main) !== "undefined") {
					Stats.Main = s.stats_main;
				} else {
					Stats.Main = {
						"total":0,
						"webpage":0,
						"media":0,
						"code":0,
						"other":0
					};
					forceStatSave = true;
				}

				if (forceStatSave === true){
					Stats.SaveStats();
				}
			}
		);
	},
	Data:function(cb){
		cb(Stats.Current);
	},
	DeleteAmount:function(amount,cb) {
		console.log("[statd]-> Deleting",amount);
		if (amount !== "all"){
			var newstats = {};
			var keys = Object.keys(Stats.Current);
			if (amount >= keys.length){
				cb();
				return;
			}

			for (let i = keys.length-amount;i < keys.length;i++){
				newstats[keys[i]] = Stats.Current[keys[i]];
			}
			Stats.Current = newstats;
		} else {
			Stats.Current = {};
		}

		Stats.SaveStats(cb);
	},
	MainText:function(cb){
		Prefs.s.get("trace_installdate",function(s){
			let wrcData = {},
				installDate = typeof(s.trace_installdate) === "string" ? s.trace_installdate : "today.";

			if (Prefs.Current.Pref_WebController.enabled === true){
				let recordData = {
					domain:WebBlocker.blocked.domain.length,
					host:WebBlocker.blocked.host.length,
					tld:WebBlocker.blocked.tld.length,
					url:WebBlocker.blocked.url.length,
					file:WebBlocker.blocked.file.length,
					total:0
				};
				recordData["total"] = Object.values(WebBlocker.blocked).map(a => a.length).reduce((a, b) => a+b);;

				wrcData = {
					listType:WebBlocker.meta.listTypeName,
					listVer:WebBlocker.meta.listVersion,
					listData:recordData,
					listOnline:WebBlocker.meta.fromServer
				};
			}
			cb(installDate,Stats.Main,wrcData);
		});
	}
};