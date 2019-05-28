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
		var TimeRef = Stats.GenTime();

		// Convert chrome type to TraceType
		var TraceType = Stats.TypeNames[type];

		if (TraceType === undefined) console.error("Massive type error, unknown type:",type);

		// If data time reference doesn't exist, create an object
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
		var d = new Date();
		var day = d.getDate();
		var mon = d.getMonth()+1;
		day.toString().length !== 2 ? day = "0" + day.toString() : 0;
		mon.toString().length !== 2 ? mon = "0" + mon.toString() : 0;

		return [
			(d.getFullYear() + "-" + mon + "-" + day).toString(),
			Date.now()+3000
		];
	},
	SaveStats:function(cb){
		Vars.s.set({
			"stats_db":Stats.Current,
			"stats_main":Stats.Main
		},function(){
			if (cb) cb();
		});
	},
	LoadStats:function(){
		Vars.s.get(
			["stats_db", "stats_main"],
			function(s){
				// Check for old stats and convert them to the new format
				var newStatsDB, newStatsMN, forceStatSave = false;
				if (typeof(s.stats_db) === "string" && typeof(s.stats_main) === "string") {
					newStatsDB = JSON.parse(s.stats_db);
					newStatsMN = JSON.parse(s.stats_main);
					forceStatSave = true;
					console.log("[statd]-> Changed statistics to new format");
				} else {
					newStatsDB = s.stats_db;
					newStatsMN = s.stats_main;
				}

				// Load the current statistics
				if (typeof(s.stats_db) !== "undefined") {
					Stats.Current = newStatsDB;
				} else {
					Stats.Current = {};
					forceStatSave = true;
				}
				if (typeof(s.stats_main) !== "undefined") {
					Stats.Main = newStatsMN;
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

				if (forceStatSave){
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
		if (amount === "all"){
			Stats.Current = {};
		} else {
			var newstats = {};
			var keys = Object.keys(Stats.Current);
			if (amount >= keys.length){
				cb();
				return;
			}

			for (var i = keys.length-amount;i < keys.length;i++){
				newstats[keys[i]] = Stats.Current[keys[i]];
			}
			Stats.Current = newstats;
		}

		Stats.SaveStats(cb);
	},
	MainText:function(cb){
		Vars.s.get("trace_installdate",function(s){
			var d = [], installDate = "today.";
			if (typeof s.trace_installdate === "string"){
				installDate = s.trace_installdate;
			}
			if (Prefs.Current.Pref_WebController.enabled === true){
				var recordData = [
					WebBlocker.blocked.domain.length,
					WebBlocker.blocked.host.length,
					WebBlocker.blocked.tld.length,
					WebBlocker.blocked.url.length,
					WebBlocker.blocked.file.length
				];
				d = [WebBlocker.meta.listTypeName,WebBlocker.meta.listVersion,recordData,WebBlocker.meta.fromServer];
			}
			cb(installDate,Stats.Main,d);
		});
	}
};