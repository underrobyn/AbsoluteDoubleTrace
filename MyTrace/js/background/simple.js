var Simple = {

	port:null,

	open:function(){
		chrome.runtime.onConnect.addListener(function(port){
			Simple.port = port;
			port.onMessage.addListener(Simple.recieve);
		});
	},

	recieve:function(data){
		if (!data || !data.request){
			Simple.sendError("Unknown request sent to background page");
			return;
		}

		switch(data.request){
			case "connect":
				Simple.send({
					"response":"connected",
					"debug":Trace.DEBUG
				});
				break;
			case "update":
				Simple.handleUpdate(data);
				break;
			default:
				Simple.sendError("Unknown request sent to background page");
				break;
		}
	},

	sendError:function(msg){
		Simple.send({
			"response":"error",
			"message":msg
		});
	},

	send:function(data){
		Simple.port.postMessage(data);
	},

	handleUpdate:function(req){
		if (!req.name){
			Simple.sendError("Error");
		}
	}

};

Simple.open();