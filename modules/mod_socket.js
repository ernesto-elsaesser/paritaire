// node.js modules
var socketio = require('socket.io');
// custom modules
var game = require('./mod_game');

var clients = {};

function attachSocket(httpServer,sessions,publications) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 0);
	socketServer.set('polling duration', 5);

	socketServer.sockets.on('connection', function (socket) {

		log(socket.id + " connects");

		clients[socket.id] = {socket: socket};

		socket.on('init', function (data) {
  
			var c = clients[socket.id];
			var s = sessions[data.id];
			
			if(s == undefined) {
				log(socket.id + " inits to invalid session (" + data.id + ")");
				//socket.emit('invalid'); TODO
				return;
			}

			s.isUsed(); // increase expiration date
			
			var players = s.countCon();

			if(s.online) { // online game

				if(players == 0) { // session empty
				
					socket.emit("init",s.getState());
					log(socket.id + " inits to empty online session " + data.id);
					
				} 
				else { // players present, check connections

					s.player[1].invalidate();
					s.player[2].invalidate();
					s.broadcast("check");
					
					setTimeout(validationOver,3000,[c,s,publications]);
					
				}

			}
			else { // local game
				
				if(players == 0) { // session empty
					
					c.session = s;
					c.side = 1; 
					socket.emit("init",s.getState());
					s.broadcast("full") // inform spectators
					s.player[1].connect(socket);

					log(socket.id + " inits to local session " + data.id);
					
				}
				else { // session full, check connections

					s.player[1].invalidate();
					s.broadcast("check");

					setTimeout(validationOver,3000,[c,s]);

				}
			}
    	
		});

		socket.on("spectate", function(data) {

			var s = sessions[data.id];
			var c = clients[socket.id];

			if(!s) return; 

			if(s.player[1].socket === socket) { // speactator reconnected to local session before player, revoke init
				s.player[1].socket = null;
				s.player[1].disconnect();
			}

			c.session = s;
			c.side = 0;
			s.spectators.push(socket);

			var state = s.getState();
			state .spec = true;
			socket.emit("init",state);

			log(socket.id + " spectates session " + data.id);

		});	

		socket.on('choose', function (data) {
			
			var s = sessions[data.id];
			var c = clients[socket.id];

			if(!s) return;
			if(data.side != 1 && data.side != 2) return;
			
			// this if-clause handles the special case when a second player enters a session
			// before the first has chosen his color - we then reinit the second player 
			// right after his (discarded) decision, so that he knows that his session is full by now
			if(s.player[1].connected || s.player[2].connected) {
				socket.emit("init",s.getState());
				return;
			}
			
			s.player[data.side].connect(socket);
		    c.session = s;
			c.side = data.side;

			log(socket.id + " choses side " + data.side + " in session " + data.id);
			
		});
  		
		socket.on('start', function (data) {

			var s = sessions[data.id];
			var c = clients[socket.id];
			
			if(!validSessionState(c,s)) return;
		
			if(s.online) {
			
				log(socket.id + " starts online session " + data.id);
				s.startGame(c.side);
			}
			else {
				
				log(socket.id + " starts local session " + data.id);
				s.startGame();
			}
			
		});
		  
		socket.on('turn', function (data) {
			  
			var c = clients[socket.id];
			var s = sessions[data.id];
			
			if(!validSessionState(c,s)) return;
			
			s.turn(c.side,data.x,data.y);
			
		});
		  
		socket.on('undo', function (data) {
			  
	  		var c = clients[socket.id];
	  		var s = sessions[data.id];
			
			if(!validSessionState(c,s)) return;
			
			s.undo(c.side);
			
		});

		socket.on('surrender', function (data) {
			  
	  		var c = clients[socket.id];
	  		var s = sessions[data.id];
			
			if(!validSessionState(c,s)) return;
			
			if(s.online) s.surrender(c.side);
			else s.surrender(data.side);

		});
		  
		socket.on('publish', function (data) {
			  
	    	// client object hasn't a session attribute yet
	    	var s = sessions[data.id];
			
			if(!s) return;
			if(!s.online) return;
			if(s.player[1].connected && s.player[2].connected) return;

			// check if name is already in use
			for(var i in publications) {
				if(publications[i].publicName == data.name) {
					socket.emit("published", {success: false});
					log(socket.id + " cannot pusblish session " + data.id + " as '" + data.name + "'");
					return;
				}
			}

	   		s.publish(data.name);
	   		publications[data.id] = s;

			socket.emit("published", {success: true});
			log(socket.id + " pusblishs session " + data.id + " as '" + data.name + "'");
				
		});

		socket.on('chat', function (data) {
			  
	  		var c = clients[socket.id];
	  		var s = sessions[data.id];
			
			if(!s) return;
			if(c.session != s) return;
			if(data.side != 0 && c.side != data.side) return; // side == 0 -> spectator
			
			if(s.online && s.player[1].connected && s.player[2].connected) {

				s.broadcast("chat",{side: data.side, msg: data.msg});
			}

		});

		socket.on('alive', function (data) {

	  		var c = clients[socket.id];
	  		var s = c.session;
			
			if(s && c.side != 0) s.player[c.side].revalidate();

		}); 
		  
		socket.on('disconnect', function () {
	  
		    var c = clients[socket.id];
	  
		    if(c) {
	     	
				var s = c.session;
				
		      	if (s) {
			  	  	
					if (s.online) {
					
						if(c.side != 0) { // player

							if(s.player[c.side].connected) { // possibly already dropped

								s.player[c.side].disconnect();

			          	  		s.broadcast('playerleft');
								log(socket.id + " (player) disconnects from session " + s.id);
			          	  	}

						}
						else { // spectator

							for(var i in s.spectators) {

								if(s.spectators[i].id == socket.id) {

									s.spectators.splice(i,1);
									log(socket.id + " (spectator) disconnects from session " + s.id);
									break;
								}

							}
						}
						
					}
					else {
						
						if(s.player[1].connected) { // possibly already dropped
							
							s.player[1].disconnect();
							s.broadcast('playerleft'); // inform spectators that there noone to spectate
							log(socket.id + " (player) disconnects from session " + s.id);
						}
					}
	         
		      	}
		      	else log(socket.id + " (uninitialized) disconnets");
	      
		      	delete c;
		    }
		    else log(socket.id + " (unknown) disconnets");

		});
	});
	
}

function validSessionState(c,s) {


	if(!s) return false;
	if(c.session != s) return false; // player in session?

	if(!s.player[c.side].connected) { // player connected?
			c.socket.disconnect();
			return false;
	}

	if(s.online) {
		if(c.side != 1 && c.side != 2) return false; // player not spectator?
		
		if (!s.player[(c.side == 1 ? 2 : 1)].connected) { // other player connected?
			c.socket.emit("otherleft");
			return false; 
		}
	}
	else {
		if (c.side != 1) return false; // player not spectator?
	}

	return true;
	
}

function validationOver(args) {

	var c = args[0]; // client
	var s = args[1]; // session

	if(s.player[1].checkDrop()) log("dropped unresponsive player 1 from session " + s.id);
	if(s.player[2].checkDrop()) log("dropped unresponsive player 2 from session " + s.id);

	var state = s.getState();
	c.socket.emit("init",state);

	if(s.online) {
		
		if(state.connections == 1) { // second to join

			if(s.player[1].connected) c.side = 2;
			else c.side = 1;

			c.session = s;
			
			s.player[c.side].connect(c.socket);

			// inform both the new and the waiting player that the session
			// is full and who's turn it is (important if the game is runnung)
			s.broadcast("full",{side: c.side, turn: s.nextTurn});


			log(c.socket.id + " inits to side " + c.side + " in session " + s.id);
			
			var publications = args[2];

			if(publications[s.id]) {

				log("session " + s.id + " (published as: '" + s.publicName + "') unpublished");
				publications[s.id].unpublish();
				delete publications[s.id];
			}
			
		}
		else if(state.connections == 2) log(c.socket.id + " inits to full online session " + s.id);
		else log(c.socket.id + " inits to empty online session " + s.id);

	}
	else {

		if(state.connections == 0) { // empty session after dropping player

			c.session = s;
			c.side = 1; 

			s.broadcast("full"); // inform spectators that there is someone to spectate again
			s.player[1].connect(c.socket);

			log(c.socket.id + " inits to local session " + s.id);

		}
		else log(c.socket.id + " inits to full local session " + s.id);

	}

}

function log(msg) {
	
	console.log((new Date()).toISOString() + " socket: " + msg);

}

exports.clients = clients;
exports.attachSocket = attachSocket;
exports.log = log;