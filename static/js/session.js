function Session(ui,color1,color2) {

	// the modeHandler handles events in game mode specific way
	// the PreHandler is necessary for canvas resizing before initialization of the session
	this.modeHandler = new PreHandler(this);

	// USER INTERFACE

	this.ui = ui; // dom element map

	this.ui.error.innerHTML = "<b>Error:</b> Browser not supported (no HTML5 canvas element).";

	this.canvas = createCanvas();
	this.chat = null; // only in multiplayer games
	this.ratiobar = null; // initialized later

	this.resizeCanvas = function() {
	
		this.canvas.resize();
		this.modeHandler.resize();
		if(this.chat) this.chat.adjustHeight(this.canvas.container);
		 
	};
	
	window.onresize = this.resizeCanvas.bind(this);

	this.ui.error.innerHTML = "<b>Error:</b> Browser not supported (no socket connection).";
	
	// GAME
	
	if(color1 == "#1") { // the server did not replace placeholders with color names
		
		this.ui.share.className = "btn btn-primary disabled";
		this.canvas.drawText("Invalid session link!");
		this.ui.error.outerHTML = "";
		return;
	}

	this.player = [null,new Player(1,color1),new Player(2,color2)];

	 // control flags
	this.playing = false;
	this.endScreen = false; // important for resize function
	this.reconnecting = false;
	
	this.field = null;
	this.winner = null;
	this.nextStarter = 0; // player that will start the next game
	
	this.sid = window.location.search.substr(4);
	
	// SOCKET
	
	this.socket = io.connect("http://paritaire.servegame.com");

	/* game protocol (incoming)

	---------------------------------------------------------------
	message 		handler					info
	---------------------------------------------------------------
	init 			Session + Handler		game state data
	full			Handler 				enough players to start
	playerleft 		Handler 				player left

	start 			Session + Handler 		starts game
	turn 			Session + Handler 		turn data
	badturn 		Session 				invalid turn request

	published 		Handler 				publication result
	spectator 		Session 				specatator joined
	chat 			Handler 				new chat message

	disconnect 		Handler 				connection lost
	reconnect 		Session 				connection reestablished

	*/

	var that = this;
	
	this.socket.on('init', function (data) {
		
		that.ui.share.className = "btn btn-primary"; // enable share button
		
		// init game data
		that.nextStarter = data.round;
		that.field = new Field(that.player,that.canvas,data.dim,data.dim);
		that.player[1].wins = data.wins[0];
		that.player[2].wins = data.wins[1];
		that.playing = data.playing;

		if(that.playing) {
			that.player[1].points = data.points[0];
			that.player[2].points = data.points[1];
			that.field.stones = data.field;
		}

		that.ratiobar = new RatioBar(that.player);
		
		// construct mode handlers, if not already done
		if(!that.reconnecting) {

			if(data.online) {

				if(data.connections < 2) that.modeHandler = new OnlineHandler(that); // online mode
				else that.modeHandler = new SpectatorHandler(that,true); // online spectator mode

				that.chat = new Chat(that.player[1].color,that.player[2].color, that.modeHandler);
			}
			else {
				if(data.connections == 0) that.modeHandler = new LocalHandler(that);
				else that.modeHandler = new SpectatorHandler(that,false); // local spectator mode
			}

			// common event handlers
			that.ui.undo.onclick = that.undo.bind(that);
			that.ui.share.onclick = that.sessionUrl.bind(that);

			// click handling
			var callback = that.clickHandler.bind(that);
			that.canvas.onclick = callback;
			that.ui.notification.onclick = callback;

		}

		that.modeHandler.init(data); // let the modeHandler do it's own initialization
		
	  });
	 
  	this.socket.on('start', function (data) {
		
		that.endScreen = false;
		
  		// change points
  		that.player[1].points = data.points[0];
  		that.player[2].points = data.points[1];
		
  		// reset field
  		that.field.clear();
  		that.field.update(data.stones);
		that.field.highlighted = null;
  		that.field.draw();
		
		that.modeHandler.start(data);

		that.playing = true;
  	
	});
	  
	this.socket.on('turn', function (data) {
		
		// change points
		if(data.stones.length == 0) { // surrender turn

			that.player[data.side].points = 0;
			that.player[(data.side == 1 ? 2 : 1)].points = that.field.xsize * that.field.ysize;
		}
		else {
			that.player[1].points += data.points[0];
			that.player[2].points += data.points[1];
		}
		
		// update field	
		that.field.update(data.stones); 
		that.field.draw();

		if(data.next == 0) that.endGame();
		else that.modeHandler.turn(data);
		
	});

	this.socket.on('chat', function (data) {

		that.chat.addMessage(data.side,data.msg);
		if(window.innerWidth < 992 && data.side != that.mySide) notify("New chat message.",2);

	});

	this.socket.on('badturn', function () {

		notify("Invalid turn!",1);

	});

	this.socket.on('spectator', function () {

		notify("Spectator joined.",2);

	});

	this.socket.on('reconnect', function () {

		that.socket.emit('init',{id: that.sid});
		that.reconnecting = true;

	});
	
	this.socket.emit('init', {id: this.sid}); // this line initiates the communication

	this.ui.error.outerHTML = "";
	
	this.canvas.drawText("Connecting ...");
	
	// CLASS FUNCTIONS
	
	this.endGame = function() {
		
		this.endScreen = true;
		this.winner = null;
		
		if(this.player[1].points > this.player[2].points) this.winner = this.player[1];
		else if(this.player[2].points > this.player[1].points) this.winner = this.player[2];
		
		if(this.winner) this.winner.wins++;
		
		this.playing = false;

		// remove "Next: O" 
		var n = this.ui.info.childNodes.length;
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		
		this.ratiobar.update(this.player[1].wins,this.player[2].wins);
		
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		this.modeHandler.endGame();
		
	};
	
	
	this.undo = function() {
	
		this.socket.emit("undo",{id: this.sid});
		this.ui.undo.className = "btn btn-primary disabled";
	
	};
	
	this.sessionUrl = function() {
	
		prompt("Permanent link to this session:","http://paritaire.servegame.com/play?id=" + this.sid);
	
	};
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.canvas.offsetX()+pageXOffset;
		var my = event.clientY-this.canvas.offsetY()+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.canvas.clientWidth && my > 0 && my < this.canvas.clientHeight) {
		
			var sideLength = this.canvas.width / this.field.xsize;
			var x = parseInt(mx/sideLength);
			var y = parseInt(my/sideLength);

			this.modeHandler.click(x,y);
			
		}
			
	};

}

