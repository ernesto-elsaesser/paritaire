// node.js modules
var http = require("http");
var net = require("net");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");
var shell = require('./server/prt_shell');
var socket = require('./server/prt_socket');

// global variables
var sessions = []; // stores all game sessions
var sid = 1; // next available session ID
var cache = {}; // stores static documents
var gameTemplate = String(fs.readFileSync("play.template")); // html skeleton
var mimeTypes = {"html": "text/html",
	"js": "text/javascript",
	"png": "image/png",
	"css": "text/css"};
var validColors = ["blue","green","orange","red","violet","yellow"];

// web server callback
function onRequest(request,response) {

	var requrl = url.parse(request.url,true);
	var path = requrl.pathname;
	
	if(path === '/') path = 'index.html';
	else path = path.substr(1,path.length);

	switch(path) {

	case 'create':
		var params = "";
		request.on("data", function(data) {
			params += data; // TODO: 1e6 anti flooding
			});
		request.on("end", function() {
			var id = sid++; // atomic
			sessions[id]=querystring.parse(params); // create new session from post data
			if(checkSession(id)) {
				sessions[id].id = id;
				sessions[id].wins = [null,0,0];
				sessions[id].next = 1;
				sessions[id].first = null;
				sessions[id].full = false;
				response.writeHead(302, {"Location": "play?id=" + id});
			}
			else { // invalid post data
				// the session ID remains unused
				response.writeHead(302, {"Location": "starting.html"});
			}
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
	
		if(doc == undefined) { // document not in cache
			if(fs.existsSync(path)) {
				doc = fs.readFileSync(path);
				cache[path] = doc;
			}
			else bFound = false;
		}

		if(bFound) {
			// mime type
			var frags = path.split(".");
			var ext = frags[frags.length-1];
			var mime = mimeTypes[ext];
			if(mime == undefined) mime = "text/" + ext;
			
			response.writeHead(200, {"Content-Type": mime});
			response.write(doc);
		}
		else response.writeHead(404);
		
		response.end();
	}
}

function buildGame(id) {

	if(id == undefined || isNaN(id)) return "Incorrect URL syntax!";

	var s = sessions[id];
	
	if(s == undefined) return "Invalid session ID!";
	if(s.full) return "Session is full!";
	
	var html = gameTemplate;
	
	var lineSession = "session = new class_";

	if(s.online == "0") {
	
		lineSession += "local_session(document.getElementById('field'),";
		html = html.replace("##1","");
		
	}
	else {
		
		lineSession += "online_session(document.getElementById('field'),io.connect('http://elsaesser.servegame.com/')," + id + ",";
		
		if(s.first == null) {
		
			html = html.replace("##1",'<a class="btn btn-primary" href="#" onclick="session.inviteUrl()">Inivitation URL</a>\n' +
				'<a class="btn btn-primary" href="#" onclick="session.publish()">Publish</a>');
			
		}
		else html = html.replace("##1","");
		
	}
	
	lineSession += "'" + s.col1 + "'," + s.wins1 + ",'" + s.col2 + "'," + s.wins2 + "," + s.dim + "," + s.dim + "," + s.next + ");";

	html = html.replace("##2",lineSession)
	
	return html;
}

function checkSession(id) {

	var s = sessions[id];
	
	if(s == undefined) return false;

	// are both colors valid color strings and different?
	var c = 0;
	for(var i in validColors) if(s.col1 == validColors[i] || s.col2 == validColors[i]) c++;
	if( c < 2 ) return false;	
	
	// is the dimension an even number?
	if(isNaN(s.dim) || s.dim % 2) return false;
	
	// online flag set?
	if(!s.online) return false;
	
	return true;

}

function publishSession(id) {

	// TODO: implement!

}

var server = http.createServer(onRequest);

server.listen(80);

socket.attachSocket(server,sessions);

shell.createShell(5001,{sessions: sessions, clients: socket.clients});
