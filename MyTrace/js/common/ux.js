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

String.prototype.capitalize = function() {
	return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

let neatNumber = function(x) {
	if (!x) return "0";
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

var TraceBg = chrome.runtime.getBackgroundPage;

// Localstorage functions
var ls = {
	supported:false,

	IsSupported:function(){
		ls.supported = (typeof Storage !== "undefined" && typeof localStorage !== "undefined" && localStorage !== null);
	},

	Store:function(key,value){
		if (!ls.supported) return;

		try {
			localStorage.setItem(key,value);
		} catch(e) {
			if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED'){
				alert("Your localStorage is full, please increase the size.");
				console.error(e);
			} else {
				_UserCrashReportService(e);
			}
		}
	},
	Read:function(key){
		let ret = null;

		try {
			ret = localStorage.getItem(key);
		} catch(e) {
			if (e.name === 'NS_ERROR_FILE_CORRUPTED'){
				alert("Your localStorage is corrupt, Trace may not function correctly as a result.");
				console.error(e);
			} else {
				_UserCrashReportService(e);
			}
		}

		return ret;
	}
};

// Broadcast Channel functions
let Auth = {
	Channel:null,

	Init:function(evtfunc){
		if (!('BroadcastChannel' in self)) return true;

		// Start Authentication Channel
		Auth.Channel = new BroadcastChannel('TraceAuth');

		// Assign event function
		if (evtfunc) Auth.Channel.onmessage = evtfunc;
	},

	SafePost:function(data){
		if (!('BroadcastChannel' in self)) return;
		if (!Auth.Channel) return;

		Auth.Channel.postMessage(data);
	},

	Integrity:function(){
		Auth.SafePost({action:"ByeByeTab"});
	}
};

var MakeDownload = function(name,data){
	// File information
	let a = document.createElement("a"),
		file = new Blob([data], {type: "text/json"});
	let url = URL.createObjectURL(file);

	// Generate file date
	let d = getDateStrings();
	let filedate = (d[0] + "-" + d[1] + "-" + d[2]).toString();

	// Download file
	a.href = url;
	a.download = name + "-" + filedate + ".json";
	document.body.appendChild(a);
	a.click();

	// Remove link
	setTimeout(function() {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	},0);
};

// Function to open new tab and focus it
let openNewTab = function(url){
	let win = window.open(url, "_blank");
	if (win !== null) win.focus();
};

// UI event to trigger a click handle on "enter" key press
let EnterTriggerClick = function(e) {
	if(e.which === 13) {
		$(this).trigger('enter');
	}
};

let backgroundConnectCheck = function(){
	TraceBg(function(bg){
		if (bg !== null) return;

		showErr("Extension failed to connect to background page. This may be caused if you're running Trace in normal and private browsing at the same time.");
	});
};

const traceTips = [
	"In the 'Settings' section you can click any setting name to open a menu that tells you what it does.",
	"The Web Request Controller lives in the 'Requests' section of Trace and can be used to block lots of tracking domains!",
	"Bad TLD Protection is a very effective way to block unknown tracking domains, enable it in the 'Requests' section.",
	"You can download all of your statistics data to csv, tsv, xml or json format to use externally.",
	"You can reset Trace's settings to default in 'Settings' then 'Trace Options'",
	"Click the Trace icon in the top corner of your browser window to report a site to Trace's developer.",
	"You can find links to all the Research and Tools that have helped me make Trace in the 'Info' section.",
	"A changelog and roadmap for Trace is available <a href='https://absolutedouble.co.uk/trace/information.html' rel='noreferrer' title='Trace RoadMap/Changelog'>here</a>.",
	"To contact the Trace Developer check the 'Info' section for details.",
	"If you want to see a feature in Trace, you can create an issue on <a href='https://github.com/jake-cryptic/AbsoluteDoubleTrace/' rel='noreferrer' title='Trace Source'>GitHub</a> or email absolutedouble@gmail.com",
	"The source code for Trace is available on <a href='https://github.com/jake-cryptic/AbsoluteDoubleTrace/' rel='noreferrer' title='Trace Source'>GitHub</a>",
	"You can enable protections for only certain sites by moving a protection to the 'Run on only some pages' list in 'Where Protections Run' under Settings and then creating a rule in the Whitelist section.",
	"You can whitelist sites from the Trace report panel",
	"Trace can function as a web filter by adding rules in the 'Whitelist' section and then choosing to block the site.",
	"You can backup and restore your Trace settings in 'Trace Options' under the settings section."
];