// node.js modules
var http = require("http");
var fs = require("fs");
var url = require("url");
var querystring = require("querystring");
var ns = require('node-static');

// custom modules
var socket = require('./modules/mod_socket');
var game = require('./modules/mod_game');

// global variables
var sessions = {};
var publications = {};

if(fs.existsSync("sessions.dump")) { // try to load old sessions

		var dump = JSON.parse(String(fs.readFileSync("sessions.dump")));
		var c = 0;

		for(var id in dump) {
			
			sessions[id] = new game.Session(id,dump[id]);
			if(dump[id].pubname) publications[id] = sessions[id];
			c++;
			
		}

		log("init: restored " + c + " session(s).");
	}

var indexPage = String(fs.readFileSync("index.html",{encoding:"utf8"}));
var publicPage = String(fs.readFileSync("public.html",{encoding:"utf8"}));
var playPage = String(fs.readFileSync("play.html",{encoding:"utf8"}));

var fileserver = new ns.Server('./static');

// web server callback
function onRequest(request,response) {

	log("http: " + request.url);

	var requrl = url.parse(request.url,true);
	var path = requrl.pathname;

	switch(path) {

	case '/create':
		
		var params = "";
		request.on("data", function(data) {
			params += data;
			});
		request.on("end", function() {
		
			var id = (new Date()).getTime();
			sessions[id] = new game.Session(id,querystring.parse(params)); // create new session from post data
			if(sessions[id].valid) {
				
				log("new session " + id + ": " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				response.write("" + id);
				response.end();
			}
			else { // invalid post data
				
				delete sessions[id];
				log("invalid session request: " + params);
				response.writeHead(200, {"Content-Type": "text/plain"});				
				response.end();
			}
			response.end();
			});
		break;
		
	case "/play":
	case "/play.html":
		
		var html = playPage;
		var s = sessions[requrl.query["id"]];

		if(s) {
			
			var c1 = s.player[1].color;
			var c2 = s.player[2].color;
			html = html.replace("#1",c1).replace("#2",c2);
			
			if(c1[0] > c2[0]) { // change if, in future, we support two colors with same first character
				c1 = c2;
				c2 = s.player[1].color;
			}
			html = html.replace("#0",c1 + "_" + c2);
		}
		
		response.writeHead(200, {"Content-Type": "text/html"});				
		response.write(html);
		response.end();
		
		break;
	
	case "/":
	case "/public.html":
		
		var html = (path == "/" ? indexPage : publicPage);
		var list = "";

		var count = 0;
		
		for(var id in publications) {
			if(path == "/" && count == 7) break;
			list += '<a href="/play?id=' + id + '" class="list-group-item">' + esc(publications[id].publicName) + '</a>';
			count++;
		}
		
		if(count == 0) list = '<li class="list-group-item">No public sessions.</li>';
		
		html = html.replace("##",list);
		
		response.writeHead(200, {"Content-Type": "text/html"});	
		response.write(html);
		response.end();
		
		break;
		
	default:
	
		request.addListener('end', function () {
		
			fileserver.serve(request, response,  function (e, res) {
				if (e && e.status === 404) {
			
					var ip = request.headers['X-Forwarded-For'];
					if(!ip) ip = request.connection.remoteAddress;

					log ("http: - 404 page not found (" + ip + ")");
					fileserver.serveFile('/404.html', 404, {}, request, response);
				}
			});
			
		}).resume();
		
	}
}

function log(msg) {
	
	console.log((new Date()).toISOString() + " " + msg);
	
}

function esc(html) {

	return html.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}

function cleanSessions() {

	var now = (new Date()).getDate();

	for(var s in sessions) {

		if(now == sessions[s].expirationDate) {

			log("cleanup: session " + sessions[s].id + " expired.");
			delete sessions[s];
		}
	}
}

function cleanPublications() {

	var deadline = (new Date()).getTime() - 3600000;

	for(var id in publications) {

		if(publications[id].publicationDate < deadline) {

			log("cleanup: publication '" + publications[id].publicName + "' of ssession " + id + " expired.");
			publications[id].unpublish();
			delete publications[id];
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

socket.attachSocket(server,sessions,publications);

server.listen(80);
