var http = require("http");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");

var sessions = [];
var sid = 1;
var cache = {};
var gameSkeleton = String(fs.readFileSync("playing.skeleton"));

function onRequest(request,response) {

	var requrl = url.parse(request.url,true);
	var path = requrl.pathname;
	
	if(path === '/') path = 'index.html';
	else path = path.substr(1,path.length);

	switch(p) {

	case 'create':
		var params = "";
		request.on("data", function(data) {
			params += data; // TODO: 1e6 anti flooding
			});
		request.on("end", function() {
			var id = sid++; // atomic
			sessions[id]=querystring.parse(params);
			sessions[id].wins1 = 0;
			sessions[id].wins2 = 0;
			sessions[id].next = 1;
			response.writeHead(302, {"Location": "play?id="+id});
			response.end();
			});
		break;
	case 'play':
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write(buildGame(requrl.query["id"]));
		response.end();
		break;
	default:
		var doc = cache[path];
		var bFound = true;
	
		if(doc == undefined) {
			if(fs.existsSync(path)) {
				doc = fs.readFileSync(path);
				cache[path] = doc;
			}
			else bFound = false;
		}

		if(bFound) {
			var frags = path.split(".");
			var ext = frags[frags.length-1];
			var mime = "text/"+ext;
			if(ext === "js") mime = "text/javascript";
			else if (ext == "png") mime = "image/png";
			response.writeHead(200, {"Content-Type": mime});
			response.write(doc);
		}
		else response.writeHead(404);
		
		response.end();
	}
}

function buildGame(id) {

	var s = sessions[id];
	
	if(s == undefined) return "Invalid session ID!";
	
	var jsline = "session = new class_";

	if(s.online == "0") jsline += "local";
	else jsline += "online";

	jsline += "_session(document.getElementById('canvas'),'";
	jsline += s.col1 + "'," + s.wins1 + ",'" + s.col2 + "'," + s.wins2 + "," + s.dim + "," + s.dim + "," + s.next + ");";

	return gameSkeleton.replace("##",jsline);
}

http.createServer(onRequest).listen(80);
