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
		
			if(!c.session.players[1] && !c.session.players[2]) {
			
				log("INIT to empty session " + data.id + " from " + socket.id);
				socket.emit('alone');
				
			} 
			else {
			
				if(c.session.players[1]) {
					c.other = c.session.players[1];
					c.session.players[1].other = c;
					c.side = 2;
					c.other.side = 1;
				}
				else {
					c.other = c.session.players[2];
					c.session.players[2].other = c;
					c.side = 1;
					c.other.side = 2;
				}
				
				c.session.players[c.side] = c;
				
				if(c.session.playing) {
				
					log("INIT to session " + data.id + ", resuming game with side " + c.side + " as " + socket.id);
					socket.emit('resume',{side: c.side, field: c.session.field, turn: c.session.nextTurn});
					c.other.socket.emit('resume',{side: c.other.side, field: c.session.field, turn: c.session.nextTurn});
				}
				else {
					
					log("INIT to session " + data.id + ", assigned side 2 to " + socket.id);
					socket.emit('ready',{side: c.side});
					c.other.socket.emit('ready',{side: c.other.side});
				}
			}
    	
		});
	  socket.on('choose', function (data) {
	    log("CHOSE side " + data.side + " in session " + data.id + " from " + socket.id);
	    clients[socket.id].session.players[data.side] = clients[socket.id];
	  });
  		
	  socket.on('start', function (data) {
		
		var s = sessions[data.id];
		log("START side " + s.next + " in session " + data.id + " from " + socket.id);
		  
		for (var x = 0; x < s.dim; x++) {
			for (var y = 0; y < s.dim; y++)
				s.field[x][y]=0;
		}
		
		s.playing = true;
	    s.nextRound = (s.nextRound == 1 ? 2 : 1);
	    clients[socket.id].other.socket.emit('start');
		
	  });
	  socket.on('turn', function (data) {
		var c = clients[socket.id];
		c.session.field[data.x][data.y] = c.side;
		c.session.nextTurn = (c.session.nextTurn == 1 ? 2 : 1);
	    c.other.socket.emit('turn', data);
	  });
	  socket.on('win', function (data) {
	    log("WIN side " + clients[socket.id].side + " in session " + data.id + " from " + socket.id);
	    sessions[data.id].wins[clients[socket.id].side]++;
		sessions[data.id].playing = false;
	  });
	  socket.on('publish', function (data) {
		  log("PUBLISH session " + data.id + " from " + socket.id);
	    publishSession(data.id);
	  });
	  socket.on('disconnect', function () {
  
	    var c = clients[socket.id];
  
	    if(c) {
     	
	      if (c.session) {
		  
			c.session.players[c.side] = null;
    
	        if(c.session.players[(c.side == 1 ? 2 : 1)]) { // session was full
        
	          log("DISCONNECT side " + c.side + " in session " + c.session.id + " (was full) from " + socket.id);
	          c.other.socket.emit('alone');
	          c.other.other = null;
           
	        }
	        else { // player was alone
        
  	          log("DISCONNECT side " + c.side + " in session " + c.session.id + " (now empty) from " + socket.id);
          
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