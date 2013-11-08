function Session(ui,color1,color2) {

	// GRAPHICS

	this.ui = ui;
	this.canvas = createCanvas(this.ui.main);
	
	this.ctx = this.canvas.getContext('2d');
	this.ctx.font = Math.floor(this.canvas.width/12) + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = this.ui.main.offsetLeft;
	this.offsetY = this.ui.main.offsetTop;

	this.resizeCanvas = function() {
	
		var w = this.ui.main.clientWidth - 30;
		this.canvas.width = w;
		this.canvas.height = w; // TODO: change for non-square fields
		this.ctx.font = Math.floor(w/12) + "px Georgia";
		
		if(this.bPlaying) {
			this.field.draw();
		}
		else {
		
			if(this.online && !this.mySide && this.bMyTurn) // choosing color
				this.colorPicker();
			else if (this.bEnded) { // showing winner
			
				if(this.online) this.drawOnlineWinner();
				else this.drawLocalWinner();
			}
			else
				this.canvas.drawText(this.canvas.lastText);
			
		}
		 
	};
	
	window.onresize = this.resizeCanvas.bind(this);
	
	// GAME
	
	if(color1 == "#1") {
		
		this.ui.sessionUrl.className = "btn btn-primary disabled";
		this.canvas.drawText("Invalid session link!");
		return;
	}

	this.player = [null,new Player(1,color1),new Player(2,color2)];
	
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
	
	this.socket.on('full', function () {
	
		that.ui.info.innerHTML = "";
		that.ui.sessionUrl.className = "btn btn-primary disabled";
		that.canvas.drawText("Session is full.");
		
	});
	
	this.socket.on('init', function (data) {
		
		that.ui.sessionUrl.className = "btn btn-primary";
		
		that.nextStarter = data.round;
		
		that.field = new Field(that,data.dim,data.dim);

		that.player[1].wins = data.wins[0];
		that.player[2].wins = data.wins[1];
		
		that.online = data.online;
		that.bPlaying = data.playing;
		
		if(!that.online) {
			
			that.ui.publish.style.display = "none";
			that.currentSide = data.next;
			
			if(data.playing) {
			
				that.field.stones = data.field;
				that.field.draw();
			
				that.ui.info.innerHTML = "";
				that.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
				that.ui.info.appendChild(that.player[data.turn].icon);
		
			}
			else {
			
				that.field.clear();
				that.canvas.drawText("Click to start!");
		
			}
		}
		else{
			
			if(that.bPlaying) that.field.stones = data.field;
			
			if(data.alone) {
			
				if(!that.publicName) that.ui.publish.className = "btn btn-primary";
				that.colorPicker();
			}
				
		} // if not alone, otherjoined will follow
		
	
		that.canvas.onclick = that.clickHandler.bind(that);
		
	  });
	
	this.socket.on('otherjoined', function (data) {
	
		if(!that.canvas.onclick) { // not initialized
			
			alert("uninitialized"); // TODO: change!
			return;
			
		}
		
		that.mySide = data.side;
	
		that.ui.info.innerHTML = "";
		that.ui.publish.className = "btn btn-primary disabled";
		that.ui.info.appendChild(document.createTextNode("Color:\u00A0\u00A0"));
		that.ui.info.appendChild(that.player[that.mySide].icon.cloneNode());
	
		if(that.bPlaying) {
			that.field.draw();
			that.bMyTurn = (that.mySide == data.turn);
			
			that.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
			that.ui.info.appendChild(that.player[data.turn].icon);
		}
		else {
			if(that.mySide == that.nextStarter) {
				that.bMyTurn = true;
				that.canvas.drawText("Click to start!");
			}
			else {
				that.bMyTurn = false;
				that.canvas.drawText("Opponent begins ...");
			}
		}
		
	});
	 
  	this.socket.on('start', function (data) {
		
		that.bEnded = false;
		
  		// change points
  		that.player[1].points = data.points[0];
  		that.player[2].points = data.points[1];
		
  		that.bPlaying = true;
  		that.field.clear();
  		that.field.update(data.stones); 
  		that.field.draw();
		
		if(that.online) {
			
			that.bMyTurn = (data.next == that.mySide);
			that.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
		}
		else {
			
			that.currentSide = data.next;
			that.ui.info.innerHTML = "";
			that.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
		}
		
		that.ui.info.appendChild(that.player[data.next].icon);
		that.ui.undo.className = "btn btn-primary disabled";
  	
	});
	  
	this.socket.on('turn', function (data) {
		
		// change points
		that.player[1].points = data.points[0];
		that.player[2].points = data.points[1];
		
		// update field	
		that.field.update(data.stones); 
		that.field.draw();
		
		// highlight placed stone
		var l = data.stones[data.stones.length-1];
		that.field.highlight(l.x,l.y);
		
		if(that.online && l.s != that.mySide) {
			that.ui.undo.className = "btn btn-primary disabled";
		}
		else {
			that.ui.undo.className = "btn btn-primary";
		}
		
		if(data.next == 0) that.endGame();
		else {
			that.bMyTurn = (data.next == that.mySide);
			that.ui.info.removeChild(that.ui.info.childNodes[that.ui.info.childNodes.length-1]);
			that.ui.info.appendChild(that.player[data.next].icon);
		}
		// TODO: info that player if he can't turn
		
	});
	
  	this.socket.on('disconnect', function () {
		
		that.ui.info.innerHTML = "";
		that.canvas.onclick = null;
		that.bEnded = false;
		delete that.mySide;
  		that.canvas.drawText("Connection problems ...");
		that.socket.socket.reconnect(); // should happen automatically
		
  	});
	
	this.socket.on('otherleft', function() {
		
		that.ui.info.innerHTML = "";
		that.ui.publish.className = "btn btn-primary";
		that.mMyTurn = false;
		that.bEnded = false;
		that.canvas.drawText("Waiting for opponent ..."); // waiting for another init
		
	});
	
	this.socket.on('reconnect', function () {
		
		var data = {id: that.sid};
		if(that.online && that.mySide) data.oldside = that.mySide;
		that.socket.emit('init',data);
		
  	});
	
	this.socket.on('published', function (data) {
		
		if(!data.success) alert("Pubication failed because the name is already used!");
		else {
			that.ui.publish.className = "btn btn-primary disabled";
			alert("Session published.");
		}
		
  	});
	
	this.socket.emit('init', {id: this.sid});
	
	this.canvas.drawText("Connecting ...");
	
	// CLASS FUNCTIONS
	
	this.endGame = function() {
		
		this.bEnded = true;
		this.winner = null;
		
		if(this.player[1].points > this.player[2].points) this.winner = this.player[1];
		else if(this.player[2].points > this.player[1].points) this.winner = this.player[2];
		
		if(this.winner) this.winner.wins++;
		
		this.bPlaying = false;
		var n = this.ui.info.childNodes.length;
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		this.ui.info.removeChild(this.ui.info.childNodes[--n]);
		
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		if(this.online) {
			
			this.bMyTurn = (this.nextStarter == this.mySide);
			this.drawOnlineWinner();
		}	
		else {
			
			this.currentSide = this.nextStarter;
			this.drawLocalWinner();
		}
		
	};
	
	this.drawOnlineWinner = function() {
		
		var msg = "";
		
		if (!this.winner) msg = "Draw! [";
		else if(this.winner.stone == this.mySide) msg += "You won! [";
		else msg += "You lost! [";
		
		msg += this.player[1].points + ":" + this.player[2].points + "]";
		
		if(this.bMyTurn) {
			this.canvas.drawText(msg,"Click to play!");
      	}
		else this.canvas.drawText(msg);
		
	};
	
	this.drawLocalWinner = function() {
		
		var msg = "";
		
		if(this.winner) msg += "               won! [";
		else msg += "Draw! [";
		
		msg += this.player[1].points + ":" + this.player[2].points + "]";
		
		this.canvas.drawText(msg,"Click to play!");
		
		if(this.winner) {
			var w = this.canvas.width;
			this.ctx.drawImage(this.winner.icon, w*0.10, w*0.17, w*0.20, w*0.20);
		}
		
	};
	
	this.undo = function() {
	
		// TODO: check enabled
		this.socket.emit("undo",{id: this.sid});
	
	};
	
	this.publish = function() {
	
		var name = prompt("Choose a name:","");
		if(!name || name == "") alert("Please choose a name!");
		else this.socket.emit("publish",{id: this.sid, name: name});
	
	};
	
	this.sessionUrl = function() {
	
		prompt("Permanent link to this session:","http://paritaire.servegame.com/play?id=" + this.sid);
	
	};
	
	this.colorPicker = function() {
		
		this.canvas.drawText("Choose your color!");

		var w = this.canvas.width;
		
		this.ctx.drawImage(this.player[1].icon, w*0.2, w*0.6, w*0.2, w*0.2);
		this.ctx.drawImage(this.player[2].icon, w*0.6, w*0.6, w*0.2, w*0.2);

		this.bMyTurn = true;
		
	};
	
	this.clickHandler = function(event) {
	
		if(this.online && !this.bMyTurn) return;
	
		// mouse position
		var mx = event.clientX-this.ui.main.offsetLeft-this.canvas.offsetLeft+pageXOffset;
		var my = event.clientY-this.ui.main.offsetTop-this.canvas.offsetTop+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.canvas.clientWidth && my > 0 && my < this.canvas.clientHeight) {
		
			if(this.online && !this.mySide) {
			
     			this.bMyTurn = false;
				this.mySide = (mx > (this.canvas.clientWidth / 2) ? 2 : 1);
				this.socket.emit('choose', {id: this.sid, side: this.mySide});
				this.canvas.drawText("Waiting for opponent ...");
				
				return;
			
			}
		
			if(!this.bPlaying) {
				this.socket.emit('start', {id: this.sid});
				return;
			}
				
		    var sideLength = this.canvas.width / this.field.xsize;
			var x = parseInt(mx/sideLength);
			var y = parseInt(my/sideLength);
			
			this.socket.emit('turn', {id: this.sid, x: x, y: y});
			
		}
			
	};

}

