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
var sessions = []; // stores all game sessions
var publicSessions = [];

var cache = {
	"/": fs.readFileSync("index.html"),
	"/new": fs.readFileSync("new.html"),
	"/rules": fs.readFileSync("rules.html"),
	"/404": fs.readFileSync("404.html")
	};

var publicPage = String(fs.readFileSync("public.html"));
var playPage = String(fs.readFileSync("play.html"));

var filters = [ 
	new RegExp(".+\/$"),
	new RegExp("server","i")
	];
	
var mimeTypes = {
	"html": "text/html",
	"js": "text/javascript",
	"png": "image/png",
	"css": "text/css",
	"/": "text/html",
	"/new": "text/html",
	"/public": "text/html",
	"/rules": "text/html"
	};

// web server callback
function onRequest(request,response) {

	log(request.url);

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
			sessions[id] = new game.Session(id,querystring.parse(params)); // create new session from post data
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
		
	case "/public":
	case "/public.html":
		
		var html = publicPage;
		var list = "";
		
		for(var i in publicSessions) {
			list += '<a href="/play?id=' + publicSessions[i].id + '" class="list-group-item">' + publicSessions[i].publicName + '</a>';
		}
		
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
			log("returned 404");
			response.writeHead(404);
			response.write(cache["/404"]);
		}
		
		response.end();
	}
}

function log(msg) {
	
	var d = new Date();
	console.log((1900+d.getYear()) + "/" + d.getMonth() + "/" + d.getDay() + "-" + d.getHours() + ":" + d.getMinutes()  + " http: " + msg);
	
}

var server = http.createServer(onRequest);

server.listen(80);

socket.attachSocket(server,sessions,publicSessions);

shell.createShell(5001,{s: sessions, c: socket.clients, cache: cache});
