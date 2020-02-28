var Session = {

	Saved:{},
	Data:{
		use:false,
		current:""
	},

	init:function(){
		return;
		Session.storage.load(function(){
			Session.generate.init();
		});
	},

	isUsingSession:function() {
		return Session.Data.use;
	},

	storage:{
		load:function(cb) {
			Prefs.s.get(["Session_Saved", "Session_Data"], function(s){
				Session.storage.onload(s, cb);
			});
		},

		onload:function(s, cb){
			let forceSave = false;

			if (typeof(s.Session_Saved) !== "undefined"){
				Session.Saved = s.Session_Saved;
			} else {
				forceSave = true;
			}

			if (typeof(s.Session_Data) !== "undefined"){
				Session.Data = s.Session_Data;
			} else {
				forceSave = true;
			}

			if (forceSave) Session.storage.save();
			if (cb) cb();
		},

		save:function(cb) {
			Prefs.s.set({
				"Session_Saved":Stats.Saved,
				"Session_Data":Session.Data
			},function(){
				if (cb) cb();
			});
		}
	},

	generate:{
		init:function(){
			let newSession = {};
			let keys = Prefs.Current.Main_Trace.ProtectionSessions.affects;

			// Generate resolution & colour depth
			if (keys.indexOf("Pref_ScreenRes") !== -1){
				//newSession = Trace.
			}

			// Generate effectiveType, downlink and rtt
			if (keys.indexOf("Pref_NetworkInformation") !== -1){

			}

			// Generate browser and os
			if (keys.indexOf("Pref_UserAgent") !== -1){

			}
		}
	}

};