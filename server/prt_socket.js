// node.js modules
var socketio = require('socket.io');
// custom modules
var game = require('./prt_game_obj');

var clients = {};

function attachSocket(httpServer,sessions) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 0);

	socketServer.sockets.on('connection', function (socket) {

		log("CONNECTION " + socket.id);

		clients[socket.id] = {};

		socket.on('init', function (data) {
  
			var c = clients[socket.id];
			//c.socket = socket;
			var s = sessions[data.id];
			
			if(s == undefined) {
				log("INIT invalid session (" + data.id + ") id from " + socket.id);
				return;
			}
			
			if(!s.online) {
			
				log("INIT to local session " + data.id + " from " + socket.id);
				c.session = s;
				s.player[1].connect(socket);
				s.player[1].send("init",s.getState());
				return;
			}
		
			if(!s.player[1].connected && !s.player[2].connected) {
			
				log("INIT to empty session " + data.id + " from " + socket.id);
				socket.emit('alone');
				
			} 
			else {
			
				c.session = s;
			
				if(s.player[1].connected) c.side = 2;
				else c.side = 1;

				log("INIT to session " + data.id + ", assigned side " + c.side + " to " + socket.id);
				s.player[c.side].connect(socket);
				
				var state = s.getState();
				state.side = 1;
				s.player[1].send("init",state);
				state.side = 2;
				s.player[2].send("init",state);
				
			}
    	
		});
	  socket.on('choose', function (data) {
		
		var s = sessions[data.id];
		var c = clients[socket.id];
		
		log("CHOOSE side " + data.side + " in session " + data.id + " from " + socket.id);
		
		s.players[data.side].connect(socket);
	    c.session = s;
		c.side = data.side;
		
	  });
  		
	  socket.on('start', function (data) {
		
		var s = sessions[data.id];
		var c = clients[socket.id];
		
		if(c.session != s) return;
	
		if(s.online && c.side == s.nextRound) {
		
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
		
		if(s.playing) s.turn(c.side,data.x,data.y);
		
	  });
	  
	  socket.on('undo', function (data) {
		  
  		var c = clients[socket.id];
  		var s = sessions[data.id];
		
		if(c.session != s) return;
		// TODO!
		if(s.playing) ;
		
	  });
	  
	  socket.on('publish', function (data) {
		  
    	var c = clients[socket.id];
    	var s = sessions[data.id];
		
  		if(c.session != s) return;
		
		if(!s.playing) {
			log("PUBLISH session " + data.id + " from " + socket.id);
	   		s.publish();
		}
			
	  });
	  
	  socket.on('disconnect', function () {
  
	    var c = clients[socket.id];
  
	    if(c) {
     	
			var s = c.session;
			
	      	if (s) {
		  	  	
				if(s.online) {
				
					s.player[c.side].disconnect();
    
					var other = s.player[(c.side == 1 ? 2 : 1)];
				
	        		if(other.connected) { // session was full
        
	          			log("DISCONNECT side " + c.side + " in session " + s.id + " (was full) from " + socket.id);
	          	  		other.send('alone');
           
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