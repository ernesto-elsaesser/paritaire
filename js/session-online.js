function OnlineSession(socket,ui,id,color1,color2) {

	this.ui = ui;
	this.canvas = createCanvas(this.ui.main);
	
	this.ctx = this.canvas.getContext('2d');
	this.ctx.font = Math.floor(this.canvas.width/12) + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = this.ui.main.offsetLeft;
	this.offsetY = this.ui.main.offsetTop;

	this.player = [null,new Player(1,color1,0),new Player(2,color2,0)];
	
	this.nextStarter = 0; // player that will start the next game
	
	this.bPlaying = false; // control flags
	this.bMyTurn = false;
	this.bCanUndo = false;
	this.mySide = 0;
	this.field = null;
	
	// socket & connection
	this.sid = id;
	this.socket = socket;
	
	var that = this;
	
	this.socket.on('alone', function () {
	
		that.ui.info.innerHTML = "";
		that.ui.publish.className = "btn btn-primary";
	
		if(that.mySide == 0) {
		
			that.canvas.drawText("Choose your color!");
			
			var w = that.canvas.width;
			that.ctx.drawImage(that.player[1].icon, w*0.2, w*0.6, w*0.2, w*0.2);
			that.ctx.drawImage(that.player[2].icon, w*0.6, w*0.6, w*0.2, w*0.2);
			
			that.bMyTurn = true;
			
		}
		else { // opponent disconnected
		
			that.canvas.drawText("Waiting for opponent ...");
		
		}
		
	});
	
	this.socket.on('init', function (data) {
		
		that.mySide = data.side;
		
		that.ui.info.appendChild(document.createTextNode("Color:\u00A0\u00A0"));
		that.ui.info.appendChild(that.player[that.mySide].icon.cloneNode());
		
		that.player[1].wins = data.wins[0];
		that.player[2].wins = data.wins[1];
		that.nextStarter = data.round;
		
		that.field = new Field(that,data.dim,data.dim);
		
		that.bPlaying = data.playing;
		
		if(data.playing) {
			
			that.field.stones = data.field;
			that.field.draw();
			
			that.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
			that.ui.info.appendChild(that.player[data.turn].icon);
		
			if(that.mySide == data.turn) that.bMyTurn = true;
			else that.bMyTurn = false;
		
		}
		else {
			
			that.field.clear();
			
			if(that.mySide == data.round) {
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
		
  		// change points
  		that.player[1].points = data.points[0];
  		that.player[2].points = data.points[1];
		
  		that.bPlaying = true;
  		that.bCanUndo = false;
  		that.field.clear();
  		that.field.update(data.stones); 
  		that.field.draw();
		
		that.bMyTurn = (data.next == that.mySide);
		that.ui.undo.className = "btn btn-primary disabled";
		that.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
		that.ui.info.appendChild(that.player[data.next].icon);
  	
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
		
		if(l.s == that.mySide) {
			that.ui.undo.className = "btn btn-primary";
			that.bCanUndo = true;
		}
		else {
			that.ui.undo.className = "btn btn-primary disabled";
			that.bCanUndo = false;
		}
		
		if(data.next == 0) that.endGame();
		else {
			that.bMyTurn = (data.next == that.mySide);
			that.ui.info.removeChild(that.ui.info.childNodes[3]);
			that.ui.info.appendChild(that.player[data.next].icon);
		}
		// TODO: info that player if he can't turn
		
	});
	
  	this.socket.on('disconnect', function () {
		
		that.ui.info.innerHTML = "";
		that.bMyTurn = false;
		that.bPlaying = false;
  		that.canvas.drawText("Connection problems ...");
		that.socket.socket.reconnect(); // should happen automatically
		
  	});
	
	this.socket.on('reconnect', function () {
		
		that.socket.emit('init', {id: that.sid});
		
  	});
	
	this.endGame = function() {
		
		// TODO: replace with canvas graphics
		var msg = "";
		
		var winner = null;
		
		if(this.player[1].points > this.player[2].points) winner = this.player[1];
		else if(this.player[2].points > this.player[1].points) winner = this.player[2];
		
		if(winner) winner.wins++;
		
		if (!winner) msg = "Draw! [";
		else if(winner.stone == this.mySide) msg += "You won! [";
		else msg += "You lost! [";
		
		msg += this.player[1].points + ":" + this.player[2].points + "]";
		
		this.bPlaying = false;
		this.ui.info.removeChild(this.ui.info.childNodes[3]);
		this.ui.info.removeChild(this.ui.info.childNodes[2]);
		
		this.bMyTurn = (this.nextStarter == this.mySide);
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		if(this.bMyTurn) {
			this.canvas.drawText(msg,"Click to play!");
      	}
		else this.canvas.drawText(msg);
	
	};
	
	this.undo = function() {
	
		if(this.bCanUndo) this.socket.emit("undo",{id: this.sid});
	
	};
	
	this.publish = function() {
	
		if(this.mySide) this.socket.emit("publish",{id: this.sid});
	
	};
	
	this.sessionUrl = function() {
	
		window.prompt("Link to join session:","http://elsaesser.servegame.com/play?id=" + this.sid);
	
	};
	
	this.clickHandler = function(event) {
	
		if(!this.bMyTurn) return;
	
		// mouse position
		var mx = event.clientX-this.offsetX-this.canvas.offsetLeft+pageXOffset;
		var my = event.clientY-this.offsetY-this.canvas.offsetTop+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.canvas.clientWidth && my > 0 && my < this.canvas.clientHeight) {
		
			if(this.mySide == 0) {
			
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
	
	this.resizeCanvas = function() {
	
		var w = this.ui.main.clientWidth - 30;
		this.canvas.width = w;
		this.canvas.height = w; // TODO: change for non-square fields
		this.ctx.font = Math.floor(w/12) + "px Georgia";
		if(this.bPlaying) {
			this.field.draw();
		}
		else {
		
			this.canvas.drawText(this.canvas.lastText[0],this.canvas.lastText[1]);
			if(this.mySide == 0 && this.bMyTurn) { // choosing color
				var w = this.canvas.width;
				this.ctx.drawImage(this.player[1].icon, w*0.2, w*0.6, w*0.2, w*0.2);
				this.ctx.drawImage(this.player[2].icon, w*0.6, w*0.6, w*0.2, w*0.2);
			}
		}
		 
	};
	
	this.canvas.drawText("Connecting ...");
	
	this.socket.emit('init', {id: this.sid});
	
	this.canvas.onclick = this.clickHandler.bind(this);
	
	window.onresize = this.resizeCanvas.bind(this);

}