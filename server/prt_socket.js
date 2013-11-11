// node.js modules
var socketio = require('socket.io');
// custom modules
var game = require('./prt_game_obj');

var clients = {};

function attachSocket(httpServer,sessions,publicSessions) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 0);
	socketServer.set('polling duration', 5);

	socketServer.sockets.on('connection', function (socket) {

		log("CONNECTION " + socket.id);

		clients[socket.id] = {};

		socket.on('init', function (data) {
  
			var c = clients[socket.id];
			//c.socket = socket;
			var s = sessions[data.id];
			
			if(s == undefined) {
				log("INIT invalid session " + data.id + " from " + socket.id);
				//socket.emit('invalid'); TODO
				return;
			}
			
			if(!s.online) {
				
				if(s.player[1].connected) {
					
					if(!data.oldside) {
						
						log("INIT to full local session " + data.id + " from " + socket.id);
						socket.emit('full');
						return;
					} 
					
					s.player[1].disconnect();
					
				}
			
				log("INIT to local session " + data.id + " from " + socket.id);
				c.session = s;
				s.player[1].connect(socket);
				s.player[1].send("init",s.getState());
				return;
			}
		
			if(!s.player[1].connected && !s.player[2].connected) { // first to enter session
					
				log("INIT to empty session " + data.id + " from " + socket.id);
				
				var state = s.getState();
				state.alone = true;
				socket.emit('init',state);
				return;
				
			} 
			else if(s.player[1].connected && s.player[2].connected) { // reconnect
			
				if(!data.oldside) {
					
					log("INIT to full session " + data.id + " from " + socket.id);
					
					socket.emit('full');
					return;
					
				}
				else {
					
					log("INIT to old side " + data.oldside + " in session " + data.id + " from " + socket.id);
					
					c.side = data.oldside;
					s.player[c.side].disconnect();
					
				}
				
			} 
			else { // second to join session
				
				if(data.oldside && s.player[data.oldside].connected) { // old zombie connection
					
					log("INIT to old side " + data.oldside + " in empty session " + data.id + " from " + socket.id);
					
					s.player[data.oldside].disconnect();
					
					var state = s.getState();
					state.alone = true;
					socket.emit('init',state);
					return;
				
				}
			
				if(s.player[1].connected) c.side = 2;
				else c.side = 1;

				log("INIT to session " + data.id + ", assigned side " + c.side + " to " + socket.id);
				
			}
			
			c.session = s;
				
			s.player[c.side].connect(socket);
				
			s.player[c.side].send("init",s.getState());
			s.player[1].send("otherjoined",{side: 1, turn: s.nextTurn});
			s.player[2].send("otherjoined",{side: 2, turn: s.nextTurn});
			
			if(s.publicName) {
				
				s.publicName = null;
				delete publicSessions[s.id];
			}
    	
		});
	  socket.on('choose', function (data) {
		
		var s = sessions[data.id];
		var c = clients[socket.id];
		
		// this if-clause handles the special case when a second player enters a session
		// before the first has chosen his color - we then disconnect the second player 
		// right after his (discarded) decision, so that he will reconnect and resend 
		// his init message, which will then be answered by an init message from the 
		// server that will assign him the second color
		if(s.player[1].connected || s.player[2].connected) {
			socket.disconnect();
			return;
		}
		
		log("CHOOSE side " + data.side + " in session " + data.id + " from " + socket.id);
		s.player[data.side].connect(socket);
	    c.session = s;
		c.side = data.side;
		
	  });
  		
	  socket.on('start', function (data) {
		
		var s = sessions[data.id];
		var c = clients[socket.id];
		
		if(c.session != s) return;
	
		if(s.online) {
		
			if(c.side != s.nextRound) return;
			log("START side " + c.side + " in session " + data.id + " from " + socket.id);
			s.startGame();
		}
		else {
			
			log("START local session " + data.id + " from " + socket.id);
			s.startGame();
		}
		
	    
		
	  });
	  
	  socket.on('turn', function (data) {
		  
		var c = clients[socket.id];
		var s = sessions[data.id];
		
		if(c.session != s) return;
		
		var r = s.turn(c.side,data.x,data.y);
		
		if(s.online) {
			log("TURN [" + data.x + ":" + data.y + "] from side " + c.side + " in session " + 
				data.id + " (" + (r == 1 ? "valid" : "invalid") +") from " + socket.id);
		}
		else {
			log("TURN [" + data.x + ":" + data.y + "] in local session " + 
				data.id + " (" + (r == 1 ? "valid" : "invalid") +") from " + socket.id);
		}
		
		if(r == -1) socket.emit("alone");
		
	  });
	  
	  socket.on('undo', function (data) {
		  
  		var c = clients[socket.id];
  		var s = sessions[data.id];
		
		if(c.session != s) return;
		
		var r = s.undo(c.side);
		
		if(s.online) {
			log("UNDO from side " + c.side + " in session " + data.id + 
				" (" + (r == 1 ? "valid" : "invalid") +") from " + socket.id);
		}
		else {
			log("UNDO in local session " + data.id + " (" + (r == 1 ? "valid" : "invalid") +") from " + socket.id);
		}
		
	  });
	  
	  socket.on('publish', function (data) {
		  
    	var c = clients[socket.id];
    	var s = sessions[data.id];
		
  		if(c.session != s) return;
		
		if(s.online) {
			
			for(var i in publicSessions) {
				if(publicSessions[i].publicName == data.name) {
					log("PUBLISH session " + data.id + " with used name from " + socket.id);
					socket.emit("published", {success: false});
					return;
				}
			}
			
			log("PUBLISH session " + data.id + " from " + socket.id);
	   		s.publicName = data.name;
			publicSessions[s.id] = s;

			socket.emit("published", {success: true});
		}
			
	  });
	  
	  socket.on('disconnect', function () {
  
	    var c = clients[socket.id];
  
	    if(c) {
     	
			var s = c.session;
			
	      	if (s) {
		  	  	
				if (s.online) {
				
					s.player[c.side].disconnect();
    
					var other = s.player[(c.side == 1 ? 2 : 1)];
				
	        		if(other.connected) { // session was full
        
	          			log("DISCONNECT side " + c.side + " in session " + s.id + " (was full) from " + socket.id);
	          	  		other.send('otherleft');
           
	        		}
	        		else log("DISCONNECT side " + c.side + " in session " + s.id + " (now empty) from " + socket.id);
					
				}
				else {
					
					log("DISCONNECT local session " + s.id + " (now empty) from " + socket.id);
					s.player[1].disconnect();
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