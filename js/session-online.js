function OnlineSession(container,sock,id,color1,color2) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = container.offsetLeft;
	this.offsetY = container.offsetTop;

	this.player1 = new Player(1,color1,0);
	this.player2 = new Player(2,color2,0);
	
	this.nextStarter = 0; // player that will start the next game
	
	this.bPlaying = false; // control flags
	this.bMyTurn = false;
	this.mySide = 0;
	this.field = null;
	
	// socket & connection
	this.sid = id;
	this.socket = sock;
	
	var that = this;
	
	this.socket.on('alone', function () {
	
		if(that.mySide == 0) {
		
			that.ctx.fillStyle = that.player1.color;
			that.ctx.fillRect(0,0,that.canvas.width / 2,that.canvas.height);
			that.ctx.fillStyle = that.player2.color;
			that.ctx.fillRect(that.canvas.width/2,0,that.canvas.width / 2,that.canvas.height);
			that.ctx.fillStyle = "#000";
			var x = (that.canvas.width / 2) - (that.fontsize * 3.96);
			var y = (that.canvas.height / 2) - (that.fontsize / 2);
			that.ctx.fillText("Choose your color!",x,y);
			that.bMyTurn = true;
			
		}
		else {
		
			that.canvas.drawText("Waiting for opponent ...", that.fontsize);
		
		}
		
	});
	
	this.socket.on('init', function (data) {
		
		document.getElementById("session-url").style.display = "none";
		document.getElementById("publish").style.display = "none";
		
		that.mySide = data.side;
		that.player1.wins = data.wins[0];
		that.player2.wins = data.wins[1];
		that.nextStarter = data.round;
		
		that.field = new Field(that,data.dim,data.dim);
		
		that.bPlaying = data.playing;
		
		if(data.playing) {
			
			that.field.stones = data.field;
			that.field.draw();
		
			if(that.mySide == data.turn) that.bMyTurn = true;
			else that.bMyTurn = false;
		
		}
		else {
			
			that.field.clear();
			
			if(that.mySide == data.round) {
				that.bMyTurn = true;
				that.canvas.drawText("Click to start!", that.fontsize);
			}
			else {
				that.bMyTurn = false;
				that.canvas.drawText("Opponent begins ...", that.fontsize);
			}
		
		}
		
	  });
	  
	this.socket.on('turn', function (data) {
		
		that.bPlaying = true;
		
		// update field
		that.field.update(data.stones); 
		that.field.draw();
		var l = data.stones[data.stones.length-1];
		that.field.highlight(l.x,l.y);
			
		// change points
		that.player1.points = data.points[0];
		that.player2.points = data.points[1];
		
		if(data.next == 0) that.endGame();
		else that.bMyTurn = (data.next == that.mySide);
		// TODO: info that player can't turn
		
	});
	
  	this.socket.on('disconnect', function () { // auto reconnect is on
		
		that.bMyTurn = false;
		that.bPlaying = false;
  		that.canvas.drawText("Connection problems ...", that.fontsize);
		
  	});
	
	this.socket.on('reconnect', function () {
		
		that.socket.emit('init', {id: that.sid});
		
  	});
	
	this.endGame = function() {
		
		// TODO: replace with canvas graphics
		var msg = "";
		
		var winner = null;
		
		if(this.player1.points > this.player2.points) winner = this.player1;
		else if(this.player1.points > this.player2.points) winner = this.player2;
		
		if(winner) winner.wins++;
		
		if (!winner) msg = "Draw! [";
		else if(winner.stone == this.mySide) msg += "You won! [";
		else msg += "You lost! [";
		
		msg += this.player1.points + ":" + this.player2.points + "]";
		
		this.canvas.drawText(msg, this.fontsize);
		
		this.bPlaying = false;
		this.field.clear();
		
		this.bMyTurn = (this.nextStarter == this.mySide);
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		if(this.bMyTurn) {
			this.ctx.fillStyle = "#000";
			var x = (this.canvas.width / 2) - (this.fontsize * 3);
			var y = (this.canvas.height / 2) + (this.fontsize * 2);
			this.ctx.fillText("Click to play!",x,y);
      	}	
	
	};
	
	this.undo = function() {
	
		this.socket.emit("undo",{id: this.sid});
	
	};
	
	this.publish = function() {
	
		this.socket.emit("publish",{id: this.sid});
	
	};
	
	this.sessionUrl = function() {
	
		window.prompt("Link for your opponent:","http://elsaesser.servegame.com/play?id=" + this.sid);
	
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
				this.canvas.drawText("Waiting for opponent ...", this.fontsize);
				
				document.getElementById("session-url").style.display = "inline";
				document.getElementById("publish").style.display = "inline";
				
				return;
			
			}
		
			if(!this.bPlaying) {
				this.socket.emit('start', {id: this.sid});
				return;
			}
				
			var x = parseInt(mx/this.field.side);
			var y = parseInt(my/this.field.side);
			
			this.socket.emit('turn', {id: this.sid, x: x, y: y});
			
		}
			
	};
	
	this.canvas.drawText("Connecting ...", this.fontsize);
	
	this.socket.emit('init', {id: this.sid});
	
	this.canvas.onclick = this.clickHandler.bind(this);

}