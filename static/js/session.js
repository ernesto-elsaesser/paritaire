function Session(ui,color1,color2) {

	this.modeHandler = new PreHandler(this); // object that handles events for local, online or spectator mode

	// GRAPHICS

	this.colorList = {blue: "#3d70b7",
				cyan: "#4bc5d0",
				green: "#459f28",
				orange: "#e18336",
				red: "#bd3434",
				violet: "#843fbd",
				yellow: "#c8b439" };

	this.ui = ui;

	this.ui.error.innerHTML = "<b>Error:</b> Browser not supported (no HTML5 canvas element).";

	this.canvas = createCanvas(this.ui.main);
	
	this.ui.notification.width = (this.canvas.width / 2) - 12;

	this.ctx = this.canvas.getContext('2d');
	this.ctx.font = Math.floor(this.canvas.width/12) + "px Verdana";

	this.resizeCanvas = function() {
	
		var w = this.ui.main.clientWidth;
		this.canvas.width = w;
		this.canvas.height = w; // TODO: change for non-square fields
		this.ctx.font = Math.floor(w/12) + "px Verdana";
		
		this.modeHandler.resize();
		 
	};
	
	window.onresize = this.resizeCanvas.bind(this);

	this.ui.error.innerHTML = "<b>Error:</b> Browser not supported (no socket connection).";
	
	// GAME
	
	if(color1 == "#1") {
		
		this.ui.share.className = "btn btn-primary disabled";
		this.canvas.drawText("Invalid session link!");
		this.ui.error.outerHTML = "";
		return;
	}

	this.player = [null,new Player(1,color1),new Player(2,color2)];
	
	this.chatIcons = null;

	this.nextStarter = 0; // player that will start the next game
	
	 // control flags
	this.bPlaying = false;
	this.bEnded = false;
	
	this.field = null;
	this.winner = null;
	
	this.sid = window.location.search.substr(4);
	
	// SOCKET
	
	this.socket = io.connect("http://paritaire.servegame.com");
	
	var that = this;
	
	this.socket.on('init', function (data) {
		
		that.ui.share.className = "btn btn-primary"; // enable share button
		
		// set game data
		that.nextStarter = data.round;
		that.field = new Field(that,data.dim,data.dim);
		that.player[1].wins = data.wins[0];
		that.player[2].wins = data.wins[1];
		that.bPlaying = data.playing;

		// init ratio bar
		that.ui.ratiocol1.style.backgroundColor = that.colorList[that.player[1].color];
		that.ui.ratiocol2.style.backgroundColor = that.colorList[that.player[2].color];
		that.updateRatioBar(false);

		if(that.bPlaying) {
			that.player[1].points = data.points[0];
			that.player[2].points = data.points[1];
			that.field.stones = data.field;
		}
		
		// create and configure mode handlers
		if(!that.modeHandler.reconnecting) {

			if(data.online) {

				if(data.connections < 2) that.modeHandler = new OnlineHandler(that);
				else that.modeHandler = new SpectatorHandler(that,true);

				// online specific event handler
				that.socket.on('full', that.modeHandler.full.bind(that.modeHandler));
				that.socket.on('playerleft', that.modeHandler.playerleft.bind(that.modeHandler));
				that.socket.on('published', that.modeHandler.published.bind(that.modeHandler));

				that.ui.publish.onclick = that.publish.bind(that);
				that.ui.msgsend.onclick = that.modeHandler.sendMessage.bind(that.modeHandler);
				that.ui.msgtext.onkeyup = function(event) { 
						if(event.keyCode == 13) session.modeHandler.sendMessage(); 
					};

				that.chatIcons = [new Image(), new Image(), new Image()];
				that.chatIcons[0].src = 'img/highlight.png'; // TODO: own icon?
				that.chatIcons[0].width = 20;
				that.chatIcons[0].height = 20;
				that.chatIcons[1].src = that.player[1].icon.src;
				that.chatIcons[1].width = 20;
				that.chatIcons[1].height = 20;
				that.chatIcons[2].src = that.player[2].icon.src;
				that.chatIcons[2].width = 20;
				that.chatIcons[2].height = 20;
			}
			else {
				if(data.connections == 0) that.modeHandler = new LocalHandler(that);
				else that.modeHandler = new SpectatorHandler(that,false);
			}

			// common event handlers
			that.socket.on('disconnect', that.modeHandler.disconnect.bind(that.modeHandler));
			that.socket.on('check', that.modeHandler.check.bind(that.modeHandler));

			that.ui.surrender.onclick = that.modeHandler.surrender.bind(that.modeHandler);
			that.ui.undo.onclick = that.undo.bind(that);
			that.ui.share.onclick = that.sessionUrl.bind(that);

		}

		that.modeHandler.init(data);
	
		that.canvas.onclick = that.clickHandler.bind(that);
		
	  });
	 
  	this.socket.on('start', function (data) {
		
		that.bEnded = false;
		
  		// change points
  		that.player[1].points = data.points[0];
  		that.player[2].points = data.points[1];
		
  		// reset field
  		that.field.clear();
  		that.field.update(data.stones);
		that.field.highlighted = null;
  		that.field.draw();
		
		that.modeHandler.start(data);

		that.bPlaying = true;
  	
	});
	  
	this.socket.on('turn', function (data) {
		
		// change points
		if(data.stones.length == 0) { // surrender turn

			that.player[data.side].points = 0;
			that.player[(data.side == 1 ? 2 : 1)].points = 1;
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
		// TODO: inform that player if he can't turn
		
	});

	this.socket.on('chat', function (data) {

		var tr = document.createElement("tr");
		var l = tr.insertCell(0);
		l.appendChild(that.chatIcons[data.side].cloneNode());
		tr.insertCell(1).innerHTML = data.msg;
		that.ui.chat.firstElementChild.firstElementChild.appendChild(tr);
		that.ui.chat.scrollTop = that.ui.chat.scrollHeight;

		if(window.innerWidth < 992) notify("New chat message.");

	});

	this.socket.on('reconnect', function () {

		that.socket.emit('init',{id: that.sid});
		that.modeHandler.reconnecting = true;

	});
	
	this.socket.emit('init', {id: this.sid});

	this.ui.error.outerHTML = "";
	
	this.canvas.drawText("Connecting ...");
	
	// CLASS FUNCTIONS
	
	this.endGame = function() {
		
		this.bEnded = true;
		this.winner = null;
		
		if(this.player[1].points > this.player[2].points) this.winner = this.player[1];
		else if(this.player[2].points > this.player[1].points) this.winner = this.player[2];
		
		if(this.winner) this.winner.wins++;
		
		this.bPlaying = false;

		// remove "Next: O" 
		var n = this.ui.info.childNodes.length;
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		
		this.updateRatioBar(true);
		
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		this.modeHandler.endGame();
		
	};
	
	
	this.undo = function() {
	
		this.socket.emit("undo",{id: this.sid});
		this.ui.undo.className = "btn btn-primary disabled";
	
	};
	
	this.publish = function() {

		var name = prompt("Choose a name:","");
		if(name && name != "") this.socket.emit("publish",{id: this.sid, name: name});
	
	};
	
	this.sessionUrl = function() {
	
		prompt("Permanent link to this session:","http://paritaire.servegame.com/play?id=" + this.sid);
	
	};

	this.updateRatioBar = function(slide) {

		var v1 = this.player[1].wins + 2;
		var v2 = this.player[2].wins + 2;
		//var d = this.player[1].wins - this.player[2].wins;
		//var w = 100 / (1 + Math.pow(Math.E, (-0.3 * d)));

		var element = this.ui.ratiocol1;
		var max = ( 100 * v1 )/( v1 + v2 );

		this.ui.wincount.innerHTML = this.player[1].wins + " : " + this.player[2].wins;

		if(!slide) {
			element.style.width = max + "%";
			return;
		}

		var now = parseInt(element.style.width.replace("%",""));

		var step = function() {

			if(Math.abs(now - max) < 0.1) return;
			now += (max < now ? -0.1 : 0.1);
			element.style.width = now + "%";
			setTimeout(step,10);

		};

		step();

	}
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.ui.main.offsetLeft-this.ui.main.offsetParent.offsetLeft+pageXOffset;
		var my = event.clientY-this.ui.main.offsetTop-this.ui.main.offsetParent.offsetTop-10+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.canvas.clientWidth && my > 0 && my < this.canvas.clientHeight) {
		
			var sideLength = this.canvas.width / this.field.xsize;
			var x = parseInt(mx/sideLength);
			var y = parseInt(my/sideLength);

			this.modeHandler.click(x,y);
			
		}
			
	};

}

