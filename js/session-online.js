function class_online_session(container,sock,id,color1,wins1,color2,wins2,dimx,dimy,next) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = container.offsetLeft;
	this.offsetY = container.offsetTop;

	this.player1 = new class_player(1,color1,wins1);
	this.player2 = new class_player(2,color2,wins2);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.nextStarter = (next == 1 ? this.player1 : this.player2); // player that will start the next game
	
	this.field = new class_field(this,dimx,dimy);
	this.logic = new class_gamelogic(this.field);
	
	this.bPlaying = false; // control flags
	this.bSuspended = false;
	this.bMyTurn = false;
	this.chosenSide = 0;
	
	// socket & connection
	this.sid = id;
	this.socket = sock;
	
	var that = this;
	
	this.socket.on('alone', function () {
	
		if(that.chosenSide == 0) {
		
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
			if(that.bPlaying) that.suspendGame();
		
		}
		
	});
	
	this.socket.on('ready', function (data) {
		
		document.getElementById("invite").style.display = "none";
		document.getElementById("publish").style.display = "none";
		
		if(that.bSuspended) that.bSuspended = false; // discarding old game
		
		that.chosenSide = data.side;
		
		if(that.chosenSide == 1) {
			that.me = that.player1;
			that.other = that.player2;
		}else {
			that.me = that.player2;
			that.other = that.player1;
		}
		
		if(that.me === that.nextStarter) {
			that.bMyTurn = true;
			that.canvas.drawText("Click to start!", that.fontsize);
		}
		else {
			that.bMyTurn = false;
			that.canvas.drawText("Opponent begins ...", that.fontsize);
		}
		
	  });
	
	this.socket.on('start', function () {
		that.startGame();
	  });
	  
	this.socket.on('turn', function (data) {
		that.othersTurn(data);
	  });
	
  	this.socket.on('disconnect', function () {
		that.suspendGame();
  		that.canvas.drawText("Connection problems ...", that.fontsize);
		//that.socket.socket.reconnect();
  	});
	
	this.socket.on('reconnect', function () {
		alert("reconnected");
		that.socket.emit('init', {id: that.sid, recon: that.bSuspended});
		
  	});
	
	this.socket.on('resume', function () {
		that.resumeGame();
	});
	
	this.startGame = function() {
	
		this.field.init();
		this.field.draw();
		
		this.me.points = 2;
		this.other.points = 2;

		if(this.bMyTurn)
			this.nextStarter = this.other;
		else
			this.nextStarter = this.me;
			
		this.bPlaying = true;
	};
	
	this.endGame = function() {
		
		// TODO: replace with canvas graphics
		var msg = "";
		
		if(this.me.points > this.other.points) {
      		this.socket.emit("win",{id: this.sid});
			this.me.wins++;
			msg += "You won! [";
		}
		else if (this.me.points < this.other.points) {
			this.other.wins++;
			msg += "You lost! [";
		}
		else
			msg = "Draw! ["
		
		msg += this.me.points + ":" + this.other.points + "]";
		
		this.canvas.drawText(msg, this.fontsize);
		
		this.bPlaying = false;
		
		this.bMyTurn = (this.nextStarter === this.me);
		
		if(this.bMyTurn) {
			this.ctx.fillStyle = "#000";
			var x = (this.canvas.width / 2) - (this.fontsize * 3);
			var y = (this.canvas.height / 2) + (this.fontsize * 2);
			this.ctx.fillText("Click to play!",x,y);
      	}	
	
	};
	
	this.suspendGame = function() {
	
		document.getElementById("invite").style.display = "none";
		document.getElementById("publish").style.display = "none";
		
		this.bPlaying = false;
		this.bSuspended = true;
	
	};
	
	this.resumeGame = function() {
	
		// TODO: update whos turn it is
		this.field.draw();
		this.bPlaying = true;
		this.bSuspended = false;
	}
	
	this.othersTurn = function(turn) {
	
		var stolenStones = this.logic.makeTurn(this.other,turn.x,turn.y);
			
		// put stone
		this.field.stones[turn.x][turn.y] = this.other.stone; 
		this.field.draw();
			
		// change points
		this.other.points += stolenStones + 1;
		this.me.points -= stolenStones;
		
		if(this.logic.canTurn(this.me)) this.bMyTurn = true;
		else if(!this.logic.canTurn(this.other)) this.endGame(); // TODO: info that no more turns are possible
	
	};
	
	this.undo = function() {
	
	
	};
	
	this.clickHandler = function(event) {
	
		if(this.bSuspended || !this.bMyTurn) return;
	
		// mouse position
		var mx = event.clientX-this.offsetX-this.canvas.offsetLeft+pageXOffset;
		var my = event.clientY-this.offsetY-this.canvas.offsetTop+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.field.xsize * this.field.side && my > 0 && my < this.field.ysize * this.field.side) {
		
			if(this.chosenSide == 0) {
			
     			this.bMyTurn = false;
				this.chosenSide = (mx > ((this.field.xsize / 2) * this.field.side) ? 2 : 1);
				this.socket.emit('choose', {id: this.sid, side: this.chosenSide});
				this.canvas.drawText("Waiting for opponent ...", this.fontsize);
				
				document.getElementById("invite").style.display = "inline";
				document.getElementById("publish").style.display = "inline";
				
				return;
			
			}
		
			if(!this.bPlaying) {
				this.startGame();
				this.socket.emit('start', {id: this.sid});
				return;
			}
				
			var x = parseInt(mx/this.field.side);
			var y = parseInt(my/this.field.side);
			
			if(this.field.stones[x][y] != 0) return;
				
			var stolenStones = this.logic.makeTurn(this.me,x,y);
			if(stolenStones == 0) return; // no turn
			
			// put stone
			this.field.stones[x][y] = this.me.stone; 
			this.field.draw();
			this.field.highlight(x,y);
			
			// change points
			this.me.points += stolenStones + 1;
			this.other.points -= stolenStones;
			
			// TODO: update info text
			
			this.socket.emit('turn', {id: this.sid, x: x, y: y});
			
			// TODO: this function should run in the background
			if(this.logic.canTurn(this.other)) this.bMyTurn = false;
			else if(!this.logic.canTurn(this.me)) this.endGame(); // TODO: info that no more turns are possible
			
		}
			
	};
	
	this.publish = function() {
	
		this.socket.emit("publish",{id: this.sid});
	
	};
	
	this.inviteUrl = function() {
	
		// TODO: change! clipboard? modal dialog?
		window.prompt("Link for your opponent:","http://elsaesser.servegame.com/play?id=" + this.sid);
	
	};
	
	this.canvas.drawText("Connecting ...", this.fontsize);
	
	this.socket.emit('init', {id: this.sid, recon: false});
	
	this.canvas.onclick = this.clickHandler.bind(this);

}