// node.js modules
var http = require("http");
var net = require("net");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");

// custom modules
var shell = require('./server/prt_shell');
var socket = require('./server/prt_socket');
var game = require('./server/prt_game_obj');

// global variables
var sessions = {};
var publications = {};

if(fs.existsSync("sessions.dump")) {// try to load old sessions

		var dump = JSON.parse(String(fs.readFileSync("sessions.dump")));
		var c = 0;

		for(var id in dump) {
			
			sessions[id] = new game.Session(dump[id]);
			if(dump[id].pubname) publications[id] = sessions[id];
			c++;
			
		}


		log("init: restored " + c + " session(s).");
	}

var cache = {
	"/new": fs.readFileSync("new.html"),
	"/rules": fs.readFileSync("rules.html"),
	"/404": fs.readFileSync("404.html")
	};

var indexPage = String(fs.readFileSync("index.html"));
var publicPage = String(fs.readFileSync("public.html"));
var playPage = String(fs.readFileSync("play.html"));

var filters = [ 
	new RegExp(".+\/$"),
	new RegExp("server","i"),
	new RegExp("sessions.dump","i")
	];
	
var mimeTypes = {
	"html": "text/html",
	"js": "text/javascript",
	"png": "image/png",
	"css": "text/css",
	"/new": "text/html",
	"/rules": "text/html"
	};

// web server callback
function onRequest(request,response) {

	log("http: " + request.url);

	var requrl = url.parse(request.url,true);
	var path = requrl.pathname;

	switch(path) {

	case '/create':
		
		var params = "";
		request.on("data", function(data) {
			params += data; // TODO: 1e6 anti flooding
			});
		request.on("end", function() {
			var id = (new Date()).getTime();
			sessions[id] = new game.Session(querystring.parse(params)); // create new session from post data
			if(sessions[id]) {
				
				log("created new session (" + id + "): " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				response.write("" + id);
				response.end();
			}
			else { // invalid post data
				
				// the session ID remains unused
				log("invalid session request (" + id + "): " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				//response.write(); no content
				response.end();
			}
			response.end();
			});
		break;
		
	case "/play":
	case "/play.html":
		
		var html = playPage;
		var s = sessions[requrl.query["id"]];
		if(s) html = html.replace("#1",s.player[1].color).replace("#2",s.player[2].color);
		
		response.writeHead(200, {"Content-Type": "text/html"});				
		response.write(html);
		response.end();
		
		break;
	
	case "/":
	case "/public":
	case "/public.html":
		
		var html = (path == "/" ? indexPage : publicPage);
		var list = "";
		
		for(var id in publications) {
			list += '<a href="/play?id=' + id + '" class="list-group-item">' + publications[id].publicName + '</a>';
		}
		
		if(list == "") list = '<a href="#" class="list-group-item">No public sessions.</a>';
		
		html = html.replace("##",list);
		
		response.writeHead(200, {"Content-Type": "text/html"});	
		response.write(html);
		response.end();
		
		break;
		
	default:
		
		var bRespond = true;
		
		for(var i in filters) { // url filter
			
			if(path.match(filters[i])) bRespond = false;
		}
		
		if(bRespond) {
			
			var doc = cache[path];
		
			if(doc == undefined) { // document not in cache
			
				file = path.substr(1,path.length); // strip "/" at start
			
				if(fs.existsSync(file)) {
					doc = fs.readFileSync(file);
					cache[path] = doc;
				}
				else bRespond = false;
			}
		}

		if(bRespond) {
			// mime type
			var frags = path.split(".");
			var ext = frags[frags.length-1];
			var mime = mimeTypes[ext];
			if(mime == undefined) mime = "text/" + ext;
			
			response.writeHead(200, {"Content-Type": mime});
			response.write(doc);
		}
		else {
			log("http: returned 404");
			response.writeHead(404);
			response.write(cache["/404"]);
		}
		
		response.end();
	}
}

function log(msg) {
	
	var d = new Date();
	console.log((1900+d.getYear()) + "/" + (1+d.getMonth()) + "/" + d.getDate() + "-" + d.getHours() + ":" + d.getMinutes()  + " " + msg);
	
}

function cleanSessions() {

	log("cleanup: checking for expired sessions.");

	var now = (new Date()).getDate();

	for(var s in sessions) {

		if(now == sessions[s].expirationDate) {

			log("cleanup: session " + sessions[s].id + " expired.");
			delete sessions[s];
		}
	}
}

function cleanPublications() {

	log("cleanup: checking for expired publications.");

	var deadline = (new Date()).getTime() - 3600000;

	for(var id in publications) {

		if(publications[id].publicationDate < deadline) {

			log("cleanup: publication '" + publications[id].publicName + "' of ssession " + id + " expired.");
			publications[id].unpublish();
			delete publications[id];
			// TODO: inform publisher?
		}
	}
}

function shutdown() {
	
	log("shutdown - dumping sessions.");
	
	var dump = "";
	
	for(var id in sessions) {
		sessions[id].player[1].disconnect();
		sessions[id].player[2].disconnect();
		dump += '"' + id + '":' + JSON.stringify(sessions[id].getState(true)) + ",\n";
	}
	
	dump = "{" + dump.substr(0,dump.length-2) + "}";
	
	fs.writeFileSync("sessions.dump", dump);
	
	process.exit(0);
	
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

setInterval(cleanSessions,86400000); // every 24 hours
setInterval(cleanPublications,900000); // every 15 minutes

var server = http.createServer(onRequest);

server.listen(80);

socket.attachSocket(server,sessions,publications);

shell.createShell(5001,{s: sessions, p: publications, c: socket.clients, cache: cache});
