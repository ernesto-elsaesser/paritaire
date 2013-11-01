// node.js modules
var socketio = require('socket.io');

var clients = [];

function attachSocket(httpServer,sessions) {
	
	var socketServer = socketio.listen(httpServer);

	socketServer.set('log level', 2);

	socketServer.sockets.on('connection', function (socket) {

  	  clients[socket.id] = {};

	  socket.on('init', function (data) {
  
	    var c = clients[socket.id];
	    c.socket = socket;
	    c.session = sessions[data.id];
    
	    if(c.session.first == null) {
    
	      	console.log("socket: init to empty session " + data.id);
	      	c.session.first = c;
	      	socket.emit('alone');
	    }
	    else {
    
	        c.session.full = true;
	      	var t = (c.session.first.side == 1 ? 2 : 1);
	      	console.log("socket: init to session " + data.id + ", assigned side " + t);
	      	c.side = t;
	      	// cross reference for disconnect event
	      	c.other = c.session.first;
	      	c.session.first.other = c;
	      	c.session.first.socket.emit('ready',{side: c.session.first.side});
	      	socket.emit('ready',{side: t});
	    }
    	
	  });
	  socket.on('choose', function (data) {
	    console.log("socket: player chose side " + data.side + " in session " + data.id);
	    clients[socket.id].side = data.side;
	  });
  		
	  socket.on('start', function (data) {
	    var t = sessions[data.id].next;
	    sessions[data.id].next = (t == 1 ? 2 : 1);
	    clients[socket.id].other.socket.emit('start');
	  });
	  socket.on('turn', function (data) {
	    clients[socket.id].other.socket.emit('turn', data);
	  });
	  socket.on('win', function (data) {
	    console.log("socket: player " + clients[socket.id].side + " in session " + data.id + " won");
	    sessions[data.id].wins[clients[socket.id].side]++;
	  });
	  socket.on('publish', function (data) {
	    publishSession(data.id);
	  });
	  socket.on('disconnect', function () {
  
	    var c = clients[socket.id];
  
	    if(c) {
     	
	      if (c.session) {
    
	        if(c.session.full) { // session was full
        
	          console.log("socket: player " + c.side + " left session " + c.session.id + ", now other is alone");
	          c.other.socket.emit('alone');
	          c.other.other = undefined;
	          if(c.session.first === c) c.session.first = c.other;
	          c.session.full = false;
           
	        }
	        else { // player was alone
      		
	          console.log("socket: player " + c.side + " left session " + c.session.id + ", now session is empty");
	          c.session.first = null;
          
	        }
	      }
	      else console.log("socket: client (side: " + c.side + ") without session disconnected");
      
	      delete c;
	    }
	    else console.log("socket: disconnect without client");

	  });
	});
	
}

exports.clients = clients;
exports.attachSocket = attachSocket;