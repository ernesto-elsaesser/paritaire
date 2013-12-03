// node.js modules
var socketio = require('socket.io');
// custom modules
var game = require('./prt_game_obj');

var clients = {};

function attachSocket(httpServer,sessions,publications) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 0);
	socketServer.set('polling duration', 5);

	socketServer.sockets.on('connection', function (socket) {

		log("CONNECTION " + socket.id);

		clients[socket.id] = {socket: socket};

		socket.on('init', function (data) {
  
  			debugger;
			var c = clients[socket.id];
			var s = sessions[data.id];
			
			if(s == undefined) {
				log("INIT invalid session " + data.id + " from " + socket.id);
				//socket.emit('invalid'); TODO
				return;
			}

			log("INIT to session " + data.id + " from " + socket.id);

			s.isUsed(); // increase expiration date
			
			var players = s.countCon();

			if(s.online) { // online game

				if(players == 0) { // session empty
				
					socket.emit("init",s.getState());
					
				} 
				else { 

					if(s.player[1].connected) {
						s.player[1].invalidate();
						s.player[1].send("check");
					}
					if(s.player[2].connected) {
						s.player[2].invalidate();
						s.player[2].send("check");
					}
					setTimeout(validationOver,1000,[c,s,publications]);
					
				}

			}
			else { // local game
				
				if(players == 0) { // session empty
					
					c.session = s;
					c.side = 1; 
					socket.emit("init",s.getState());
					s.player[1].connect(socket);
					
				}
				else { // session full

					s.player[1].invalidate();
					s.player[1].send("check");
					setTimeout(validationOver,1000,[c,s]);

				}
			}
    	
		});

	socket.on("spectate", function(data) {

		var s = sessions[data.id];
		var c = clients[socket.id];

		if(!s) return; 

		c.session = s;
		c.side = 0;
		s.spectators.push(socket);

	});	

	  socket.on('choose', function (data) {
		
		var s = sessions[data.id];
		var c = clients[socket.id];
		
		// TODO: still good?

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

	  socket.on('surrender', function (data) {
		  
  		var c = clients[socket.id];
  		var s = sessions[data.id];
		
		if(c.session != s) return;
		
		var r = 0;
		if(s.online) r = s.surrender(c.side);
		else r = s.surrender(data.side);
		
		if(r) log("SURRENDER from side " + c.side + " in session " + data.id + " from " + socket.id);

	  });
	  
	  socket.on('publish', function (data) {
		  
    	// client object hasn't a session attribute yet
    	var s = sessions[data.id];
		
		// check if name is already in use
		for(var i in publications) {
			if(publications[i].publicName == data.name) {
				log("PUBLISH session " + data.id + " with occupied name from " + socket.id);
				socket.emit("published", {success: false});
				return;
			}
		}
		
   		var r = s.publish(data.name);
   		if(r) {

			publications[data.id] = s;

			socket.emit("published", {success: true});
			log("PUBLISH session " + data.id + " from " + socket.id);
		}
		else {

			socket.emit("published", {success: false});
			log("PUBLISH session " + data.id + " (invalid) from " + socket.id);
		}
		
			
	  });

	 socket.on('chat', function (data) {
		  
  		var c = clients[socket.id];
  		var s = sessions[data.id];
		
		if(!s || c.session != s) return;
		if(data.side != 0 && c.side != data.side) return; // side == 0 -> spectator
		
		if(s.online && s.player[1].connected && s.player[2].connected) {

			s.broadcast("chat",{side: data.side, msg: data.msg});
			log("CHAT from side " + data.side + " in session " + data.id + " from " + socket.id);
		}

	  });

	 socket.on('alive', function (data) {
		  
  		var c = clients[socket.id];
  		var s = c.session;
		
		if(s && c.side != 0) s.player[c.side].revalidate();

	  }); 
	  
	  socket.on('disconnect', function () {
  
	  	debugger;

	    var c = clients[socket.id];
  
	    if(c) {
     	
			var s = c.session;
			
	      	if (s) {
		  	  	
				if (s.online) {
				
					if(c.side != 0) {

						if(s.player[c.side].connected) { // possibly already kicked out

							s.player[c.side].disconnect(); // TODO: why is this sometimes 0?

		          			log("DISCONNECT side " + c.side + " in online session from " + socket.id);
		          	  		s.broadcast('playerleft');
		          	  	}

					}
					else { // spectator

						for(var i in s.spectators) {

							if(s.spectators[i].id == socket.id) {

								log("DISCONNECT spectator in online session from " + socket.id);
								s.spectators.splice(i,1);
								break;
							}

						}
					}
					
				}
				else {
					
					if(s.player[1].connected) { // possibly already kicked out
						log("DISCONNECT from local session from " + socket.id);
						s.player[1].disconnect();
						s.broadcast('playerleft');
					}
				}
         
	      	}
	      	else log("DISCONNECT uninitialized client, from " + socket.id);
      
	      	delete c;
	    }
	    else log("DISCONNECT no client, from " + socket.id);

	  });
	});
	
}

function validationOver(args) {

	debugger;

	var c = args[0]; // client
	var s = args[1]; // session

	var r1 = s.player[1].check();
	var r2 = s.player[2].check();

	if(r1 || r2) s.broadcast("playerleft");

	c.socket.emit("init",s.getState());
	var players = s.countCon();

	if(s.online) {
		
		if(players == 1) { // second to join

			if(s.player[1].connected) c.side = 2;
			else c.side = 1;

			c.session = s;
			
			s.broadcast("playerjoined",{side: c.side, turn: s.nextTurn});		
			s.player[c.side].connect(c.socket);
			
			var publications = args[2];

			if(publications[s.id]) {
				
				publications[s.id].unpublish();
				delete publications[s.id];
				log(" - unpublished session " + s.id);
			}
			
		}

	}
	else {

		if(players == 0) { // empty session, connection was a zombie

			c.session = s;
			c.side = 1; 

			s.broadcast("playerjoined");
			s.player[1].connect(c.socket);

		}

	}

}

function log(msg) {
	
	console.log((new Date()).toISOString() + " socket: " + msg);

}

exports.clients = clients;
exports.attachSocket = attachSocket;
exports.log = log;