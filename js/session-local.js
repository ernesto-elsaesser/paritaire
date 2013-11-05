function LocalSession(container,sock,id,color1,color2) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = container.offsetLeft;
	this.offsetY = container.offsetTop;

	this.player1 = new Player(1,color1,0);
	this.player2 = new Player(2,color2,0);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.nextStarter = 0; // player that will start the next game
	
	this.bPlaying = false; // control flags
	this.currentSide = 0;
	this.field = null;
	
	// socket & connection
	this.sid = id;
	this.socket = sock;
	
	var that = this;
	
	this.socket.on('init', function (data) {
		
		document.getElementById("session-url").style.display = "inline";
		
		that.currentSide = data.next;
		that.player1.wins = data.wins[0];
		that.player2.wins = data.wins[1];
		that.nextStarter = data.round;
		
		that.field = new Field(that,data.dim,data.dim);
		
		that.bPlaying = data.playing;
		
		if(data.playing) {
			
			that.field.stones = data.field;
			that.field.draw();
		}
		else {
			
			that.field.clear();
			that.canvas.drawText("Click to start!", that.fontsize);
		
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
		else that.currentSide = data.next;
		// TODO: info that player can't turn
		
	});
	
  	this.socket.on('disconnect', function () { // auto reconnect is on
		
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
		
		if(winner) msg += winner.color + " won! [";
		else msg = "Draw! [";
		
		msg += this.player1.points + ":" + this.player2.points + "]";
		
		this.canvas.drawText(msg, this.fontsize);
		
		this.bPlaying = false;
		
		this.currentSide = this.nextStarter;
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
		
		this.ctx.fillStyle = "#000";
		var x = (this.canvas.width / 2) - (this.fontsize * 3);
		var y = (this.canvas.height / 2) + (this.fontsize * 2);
		this.ctx.fillText("Click to play!",x,y);	
	
	};
	
	this.undo = function() {
	
		this.socket.emit("undo",{id: this.sid});
	
	};
	
	this.sessionUrl = function() {
	
		window.prompt("Permanent link to this session:","http://elsaesser.servegame.com/play?id=" + this.sid);
	
	};
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.offsetX-this.canvas.offsetLeft+pageXOffset;
		var my = event.clientY-this.offsetY-this.canvas.offsetTop+pageYOffset;
		
		// click inside canvas?
		if(mx > 0 && mx < this.canvas.clientWidth && my > 0 && my < this.canvas.clientHeight) {
		
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