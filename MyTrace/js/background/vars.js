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
	GPUInterval:1,
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
				"Windows 7 (x86)":"Windows NT 6.1; en-US"
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
				"77":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3833.0 Safari/537.36",
				"75":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36",
				"74":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3717.0 Safari/537.36",
				"73":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36",
				"72":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.81 Safari/537.36",
				"71":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36",
				"70":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36"
			},
			"firefox":{
				"68":"Gecko/20100101 Firefox/68.0",
				"67":"Gecko/20100101 Firefox/67.0",
				"66":"Gecko/20100101 Firefox/66.0",
				"62":"Gecko/20100101 Firefox/62.0",
				"61":"Gecko/20100101 Firefox/61.0",
				"60":"Gecko/20100101 Firefox/60.0",
				"59":"Gecko/20100101 Firefox/59.0"
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
				"cr77":"AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3843.0 Safari/537.36 Edg/77.0.219.0",
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

	gpuModels: [
		'AMD Radeon HD 6290 Graphics' + gpuDirect3,
		'AMD Radeon HD 6310 Graphics' + gpuDirect3,
		'AMD Radeon HD 6320 Graphics' + gpuDirect3,
		'AMD Radeon HD 6350' + gpuDirect3,
		'AMD Radeon HD 6450' + gpuDirect3,
		'AMD Radeon HD 6800 Series' + gpuDirect3,
		'AMD Radeon HD 7310 Graphics' + gpuDirect3,
		'AMD Radeon HD 7340 Graphics' + gpuDirect3,
		'AMD Radeon HD 7520G' + gpuDirect3,
		'AMD Radeon HD 7640G' + gpuDirect3,
		'AMD Radeon HD 7700 Series' + gpuDirect3,
		'AMD Radeon HD 7800 Series' + gpuDirect3,
		'AMD Radeon HD 8240' + gpuDirect3,
		'AMD Radeon R7 200 Series' + gpuDirect5,
		'AMD Radeon R7 300 Series' + gpuDirect5,
		'AMD Radeon R9 200 Series' + gpuDirect5,
		'AMD Radeon R9 300 Series' + gpuDirect5,
		'AMD Radeon R9 400 Series' + gpuDirect5,
		'AMD Radeon(TM) HD 6480G' + gpuDirect3,
		'AMD Radeon(TM) HD 6520G' + gpuDirect3,
		'ATI Mobility Radeon HD 4250' + gpuDirect3,
		'ATI Mobility Radeon HD 5470' + gpuDirect3,
		'ATI Mobility Radeon HD 5650' + gpuDirect3,
		'ATI Radeon 3000 Graphics' + gpuDirect3,
		'ATI Radeon HD 3200 Graphics' + gpuDirect3,
		'ATI Radeon HD 3800 Series' + gpuDirect3,
		'ATI Radeon HD 4200' + gpuDirect3,
		'ATI Radeon HD 4300/4500 Series' + gpuDirect3,
		'ATI Radeon HD 4600 Series' + gpuDirect3,
		'ATI Radeon HD 5470' + gpuDirect3,
		'ATI Radeon HD 5570' + gpuDirect3,
		'ATI Radeon HD 5670' + gpuDirect3,
		'Mobile Intel(R) 4 Series Express Chipset Family' + gpuDirect3,
		'Mobile Intel(R) 965 Express Chipset Family' + gpuDirect3,
		'Mobile Intel(R) 965 Express Chipset Family',
		'Intel(R) HD Graphics 2000' + gpuDirect3,
		'Intel(R) HD Graphics 2000',
		'Intel(R) HD Graphics 3000' + gpuDirect3,
		'Intel(R) HD Graphics 3000',
		'Intel(R) HD Graphics 4000' + gpuDirect5,
		'Intel(R) HD Graphics 4000' + gpuDirect3,
		'Intel(R) HD Graphics 4000',
		'Intel(R) HD Graphics 5000' + gpuDirect5,
		'Intel(R) HD Graphics 5000' + gpuDirect3,
		'Intel(R) HD Graphics 5000',
		'Intel(R) HD Graphics 6000' + gpuDirect5,
		'Intel(R) HD Graphics 6000' + gpuDirect3,
		'Intel(R) HD Graphics 6000',
		'Intel(R) HD Graphics' + gpuDirect3,
		'Intel(R) HD Graphics',
		'Intel(R) HD Graphics Family' + gpuDirect3,
		'Intel(R) HD Graphics Family',
		'Intel(R) Q35 Express Chipset Family' + gpuDirect2,
		'Intel(R) Q45/Q43 Express Chipset' + gpuDirect3,
		'Intel(R) Q965/Q963 Express Chipset Family' + gpuDirect2,
		'Intel(R) 4 Series Internal Chipset' + gpuDirect3,
		'Intel(R) 82945G Express Chipset Family' + gpuDirect2,
		'Intel(R) G33/G31 Express Chipset Family' + gpuDirect2,
		'Intel(R) G33/G31 Express Chipset Family',
		'Intel(R) G41 Express Chipset' + gpuDirect3,
		'Intel(R) G41 Express Chipset',
		'Intel(R) G45/G43 Express Chipset' + gpuDirect3,
		'Intel(R) Graphics Media Accelerator 3150' + gpuDirect2,
		'Intel(R) Graphics Media Accelerator 3600 Series' + gpuDirect3,
		'Intel(R) Graphics Media Accelerator HD' + gpuDirect3,
		'NVIDIA GeForce 8400 GS' + gpuDirect3,
		'NVIDIA GeForce 9200' + gpuDirect3,
		'NVIDIA GeForce 9500 GT' + gpuDirect3,
		'NVIDIA GeForce 9500 GT',
		'NVIDIA GeForce 9800 GT' + gpuDirect3,
		'NVIDIA GeForce 9800 GT',
		'NVIDIA GeForce GT 220' + gpuDirect3,
		'NVIDIA GeForce GT 240' + gpuDirect3,
		'NVIDIA GeForce GT 430' + gpuDirect3,
		'NVIDIA GeForce GT 440' + gpuDirect3,
		'NVIDIA GeForce GT 610' + gpuDirect3,
		'NVIDIA GeForce GT 620' + gpuDirect3,
		'NVIDIA GeForce GT 630' + gpuDirect3,
		'NVIDIA GeForce GT 640' + gpuDirect3,
		'NVIDIA GeForce GTX 550 Ti' + gpuDirect3,
		'NVIDIA GeForce GTX 560' + gpuDirect3,
		'NVIDIA GeForce GTX 560 Ti' + gpuDirect3,
		'NVIDIA GeForce GTX 650' + gpuDirect3,
		'NVIDIA GeForce GTX 660' + gpuDirect3,
		'NVIDIA GeForce GTX 670' + gpuDirect3,
		'NVIDIA GeForce GTX 680' + gpuDirect3,
		'NVIDIA GeForce GTX 760' + gpuDirect5,
		'NVIDIA Quadro 4000M' + gpuDirect5,
		'NVIDIA Quadro 4000M' + gpuDirect3,
		'NVIDIA Quadro 2000M' + gpuDirect5,
		'NVIDIA Quadro 2000M' + gpuDirect3,
		'NVIDIA Quadro K2000M' + gpuDirect5,
		'NVIDIA Quadro K420' + gpuDirect3,
		'NVIDIA Quadro NVS 140M',
		'NVIDIA Quadro NVS 150M',
		'NVIDIA Quadro NVS 160M' + gpuDirect3,
		'NVIDIA GeForce GTX 960M' + gpuDirect5,
		'NVIDIA GeForce GTX 970M' + gpuDirect5,
		'NVIDIA GeForce GTX 980M' + gpuDirect5,
		'NVIDIA GeForce GTX 1050M' + gpuDirect5,
		'NVIDIA GeForce GTX 1060M' + gpuDirect5,
		'NVIDIA GeForce GTX 1070M' + gpuDirect5,
		'NVIDIA GeForce GTX 1080M' + gpuDirect5
	],
	gpuChose:"Intel(R) HD Graphics",

	// Current UA settings
	useragent:"Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0",
	oscpu:"Windows NT 6.1; Win64; x64; rv:57.0",
	platform:"Win32"
};