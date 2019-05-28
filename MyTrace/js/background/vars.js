var Vars = {
	// From storage
	eReporting:false,
	bNotifications:false,
	pSessions:false,
	sessionData:{},
	Premium:"",

	// Trace pausing
	paused:false,
	pauseEnd:0,

	// Refresh constants
	UserAgentInterval:1,
	FakeIPInterval:1,

	// Storage type
	s:(/Edge/.test(navigator.userAgent) ? browser.storage.local : chrome.storage.local),

	// Blocklist URLs
	blocklistURL:"https://trace-extension.absolutedouble.co.uk/app/weblist.php",
	blocklistFallback:"https://raw.githubusercontent.com/jake-cryptic/hmfp_lists/master/fallback.json",
	blocklistOffline:(chrome.hasOwnProperty("extension") ? chrome.runtime.getURL("data/blocklist.json") : browser.extension.getURL("data/blocklist.json")),
	blocklistBase:"https://trace-extension.absolutedouble.co.uk/app/weblist.php?p=",
	appSecret:"Cza7kImqFYZPrbGq76PY8I9fynasuWyEoDtY4L9U0zgIACb2t9vpn2sO4eHcS0Co",		// Is this pointless? Yes. Do I care? No.
	serverNames:{
		0:"main",
		1:"GitHub",
		2:"local",
		3:"cache"
	},

	// Blocker Vars
	listCompat:"210",
	callbacks:[],

	// Notification constant
	notifIcon:"icons/trace_256.png",

	// User agent values (move these later)
	uaSettings:{
		"os": {
			"windows":{
				"Windows 10 (x64)": "Windows NT 10.0; Win64; x64",
				"Windows 10 (x86)": "Windows NT 10.0; en-US",
				"Windows 8.1 (x64)":"Windows NT 6.3; Win64; x64",
				"Windows 8.1 (x86)":"Windows NT 6.3; en-US",
				"Windows 8 (x64)":"Windows NT 6.2; Win64; x64",
				"Windows 8 (x86)":"Windows NT 6.2; en-US",
				"Windows 7 (x64)":"Windows NT 6.1; Win64; x64",
				"Windows 7 (x86)":"Windows NT 6.1; en-US",
				"Windows Vista (x64)":"Windows NT 6.1; Win64; x64",
				"Windows Vista (x86)":"Windows NT 6.0; en-US"
			},
			"linux":{
				"linux 64bit":"X11; Linux x86_64",
				"linux 32bit":"X11; Linux x86_32"
			},
			"macos":{
				"macos mojave2":"Macintosh; Intel Mac OS X 10_14_0",
				"macos mojave":"Macintosh; Intel Mac OS X 10_14",
				"macos high sierra2":"Macintosh; Intel Mac OS X 10_13_6",
				"macos high sierra":"Macintosh; Intel Mac OS X 10_13",
				"macos sierra":"Macintosh; Intel Mac OS X 10_12_2",
				"macos el capitan":"Macintosh; Intel Mac OS X 10_11_6",
				"macos yosemite":"Macintosh; Intel Mac OS X 10_10_5"
			}
		},
		"wb":{
			"chrome":{
				"74":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3717.0 Safari/537.36",
				"73":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36",
				"72":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36",
				"71":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
				"70":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36",
				"69":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3493.3 Safari/537.36"
			},
			"firefox":{
				"65":"Gecko/20100101 Firefox/65.0",
				"62":"Gecko/20100101 Firefox/62.0",
				"61":"Gecko/20100101 Firefox/61.0",
				"60":"Gecko/20100101 Firefox/60.0",
				"59":"Gecko/20100101 Firefox/59.0",
				"58":"Gecko/20100101 Firefox/58.0",
				"57":"Gecko/20100101 Firefox/57.0"
			},
			"vivaldi":{
				"2.30":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.82 Safari/537.36 Vivaldi/2.3.1440.41",
				"1.96":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.183 Safari/537.36 Vivaldi/1.96.1147.47"
			},
			"opera":{
				"57":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 OPR/57.0.3098.106",
				"54":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.54"
			},
			"edge":{
				"17":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134",
				"15":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2743.116 Safari/537.36 Edge/15.15063",
				"14":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/14.14359"
			},
			"safari":{
				"10.1":"AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.1 Safari/603.1.30",
				"10.03":"AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8"
			}
		}
	},

	// Current UA settings
	useragent:"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0",
	oscpu:"Windows NT 6.1; Win64; x64; rv:57.0",
	platform:"Win32"
};