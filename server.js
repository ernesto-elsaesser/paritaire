// node.js modules
var http = require("http");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");
var socketio = require('socket.io');

// global variables
var sessions = []; // stores all game sessions
var sid = 1; // next available session ID
var cache = {}; // stores static documents
var gameSkeleton = String(fs.readFileSync("playing.skeleton")); // html skeleton
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
				sessions[id].wins1 = 0;
				sessions[id].wins2 = 0;
				sessions[id].next = 1;
				sessions[id].full = false;
				response.writeHead(302, {"Location": "play?id="+id});
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
	
	// create the javascript line that initiaties the game session
	var jsline = "session = new class_";

	if(s.online == "0") jsline += "local_session(document.getElementById('field'),";
	else {
	
		// first or second player to join or session full?
		if(s.full) return "Session is full!";
		else if (s.player[1]) {
			s.full = true;
			jsline += "online_session(document.getElementById('field'),io.connect('http://localhost')," + id + ",2,";
		}
		else if (s.player[2])  {
			s.full = true;
			
		}
		else {
		
			return "Pending ..."; // TODO: implement
		}
		
	}
	
	jsline += "'" + s.col1 + "'," + s.wins1 + ",'" + s.col2 + "'," + s.wins2 + "," + s.dim + "," + s.dim + "," + s.next + ");";

	return gameSkeleton.replace("##",jsline);
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

var server = http.createServer(onRequest);

server.listen(80);

var socket = socketio.listen(server);

socket.sockets.on('connection', function (socket) {
	socket.on('init', function (data) {
		sessions[data.id].player[data.side] = socket;
	});
	socket.on('start', function (data) {
		sessions[data.id].player[data.to].emit('start', data);
	});
	socket.on('turn', function (data) {
		sessions[data.id].player[data.to].emit('turn', data);
	});
});
