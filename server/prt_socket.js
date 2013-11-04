// node.js modules
var socketio = require('socket.io');

var clients = {};

function attachSocket(httpServer,sessions) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 0);

	socketServer.sockets.on('connection', function (socket) {

		log("CONNECTION " + socket.id);

		clients[socket.id] = {};

		socket.on('init', function (data) {
  
			var c = clients[socket.id];
			c.socket = socket;
			c.session = sessions[data.id];
			
			if(c.session == undefined) {
				log("INIT invalid session (" + data.id + ") id from " + socket.id);
				return;
			}
		
			if(c.session.first == null) {
		
				log("INIT to empty session " + data.id + " from " + socket.id);
				c.session.first = c;
				socket.emit('alone');
			}
			else {
		
				c.session.full = true;
				var t = (c.session.first.side == 1 ? 2 : 1);
				c.side = t;
				// cross reference for disconnect event
				c.other = c.session.first;
				c.session.first.other = c;
				if(data.recon) {
				
					log("INIT to session " + data.id + ", resuming game with side " + t + " as " + socket.id);
					c.session.first.socket.emit('resume');
					socket.emit('resume');
				}
				else {
					
					log("INIT to session " + data.id + ", assigned side " + t + " to " + socket.id);
					c.session.first.socket.emit('ready',{side: c.session.first.side});
					socket.emit('ready',{side: t});
				}
			}
    	
		});
	  socket.on('choose', function (data) {
	    log("CHOSE side " + data.side + " in session " + data.id + " from " + socket.id);
	    clients[socket.id].side = data.side;
	  });
  		
	  socket.on('start', function (data) {
		  log("START side " + sessions[data.id].next + " in session " + data.id + " from " + socket.id);
	    var t = sessions[data.id].next;
	    sessions[data.id].next = (t == 1 ? 2 : 1);
	    clients[socket.id].other.socket.emit('start');
	  });
	  socket.on('turn', function (data) {
	    clients[socket.id].other.socket.emit('turn', data);
	  });
	  socket.on('win', function (data) {
	    log("WIN side " + clients[socket.id].side + " in session " + data.id + " from " + socket.id);
	    sessions[data.id].wins[clients[socket.id].side]++;
	  });
	  socket.on('publish', function (data) {
		  log("PUBLISH session " + data.id + " from " + socket.id);
	    publishSession(data.id);
	  });
	  socket.on('disconnect', function () {
  
	    var c = clients[socket.id];
  
	    if(c) {
     	
	      if (c.session) {
    
	        if(c.session.full) { // session was full
        
	          log("DISCONNECT side " + c.side + " in session " + c.session.id + " (was full) from " + socket.id);
	          c.other.socket.emit('alone');
	          c.other.other = undefined;
	          if(c.session.first === c) c.session.first = c.other;
	          c.session.full = false;
           
	        }
	        else { // player was alone
        
  	          log("DISCONNECT side " + c.side + " in session " + c.session.id + " (now empty) from " + socket.id);
	          c.session.first = null;
          
	        }
	      }
	      else log("DISCONNECT uninitialized client, from " + socket.id);
      
	      delete c;
	    }
	    else log("DISCONNECT no client, from " + socket.id);

	  });
	});
	
}

function log(msg) {
	
	var d = new Date();
	console.log((1900+d.getYear()) + "/" + d.getMonth() + "/" + d.getDay() + "-" + d.getHours() + ":" + d.getMinutes()  + " socket: " + msg);
	
}

exports.clients = clients;
exports.attachSocket = attachSocket;
exports.log = log;