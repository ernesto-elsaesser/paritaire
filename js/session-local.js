function LocalSession(socket,ui,id,color1,color2) {

	this.ui = ui;
	this.canvas = createCanvas(this.ui.main);
	
	this.ctx = this.canvas.getContext('2d');
	this.ctx.font =  Math.floor(this.canvas.width/12) + "px Georgia";
	
	this.ui.publish.style.display = "none";
	
	// canvas offset, used for mouse click mapping
	this.offsetX = this.ui.main.offsetLeft;
	this.offsetY = this.ui.main.offsetTop;

	this.player = [null,new Player(1,color1,0),new Player(2,color2,0)];
	
	this.nextStarter = 0; // player that will start the next game
	
	this.bPlaying = false; // control flags
	this.currentSide = 0;
	this.field = null;
	
	// socket & connection
	this.sid = id;
	this.socket = socket;
	
	var that = this;
	
	this.socket.on('init', function (data) {
		
		that.currentSide = data.next;
		that.player[1].wins = data.wins[0];
		that.player[2].wins = data.wins[1];
		that.nextStarter = data.round;
		
		that.field = new Field(that,data.dim,data.dim);
		
		that.bPlaying = data.playing;
		
		if(data.playing) {
			
			that.field.stones = data.field;
			that.field.draw();
			
			that.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
			that.ui.info.appendChild(that.player[data.turn].icon);
		}
		else {
			
			that.field.clear();
			that.canvas.drawText("Click to start!");
		
		}
		
	  });
	  
    this.socket.on('start', function (data) {
		
		// change points
		that.player[1].points = data.points[0];
		that.player[2].points = data.points[1];
	
		that.bPlaying = true;
		that.field.clear();
		that.field.update(data.stones); 
		that.field.draw();
		
		that.currentSide = data.next;
		that.ui.undo.className = "btn btn-primary disabled";
		that.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
		that.ui.info.appendChild(that.player[data.next].icon);
  	
  	});
	  
	this.socket.on('turn', function (data) {
		
		// update field
		that.field.update(data.stones); 
		that.field.draw();
		var l = data.stones[data.stones.length-1];
		that.field.highlight(l.x,l.y);
			
		// change points
		that.player[1].points = data.points[0];
		that.player[2].points = data.points[1];
		
		if(data.next == 0) that.endGame();
		else {
			that.currentSide = data.next;
			that.ui.info.removeChild(that.ui.info.childNodes[1]);
			that.ui.info.appendChild(that.player[data.next].icon);
		}
		// TODO: info that player can't turn
		that.ui.undo.className = "btn btn-primary";
		
	});
	
  	this.socket.on('disconnect', function () { // auto reconnect is on
		
		that.ui.info.innerHTML= "";
		that.bPlaying = false;
  		that.canvas.drawText("Connection problems ...");
		
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
		
		if(winner) {
			winner.wins++;
			msg += winner.color.toUpperCase() + " won! [";
		}
		else msg += "Draw! [";
		
		msg += this.player[1].points + ":" + this.player[2].points + "]";
		
		this.canvas.drawText(msg,"Click to play!");
		
		this.bPlaying = false;
		that.ui.info.innerHTML= "";
		
		this.currentSide = this.nextStarter;
		this.nextStarter = (this.nextStarter == 1 ? 2 : 1);
	
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
		
		if(this.bPlaying) this.field.draw();
		else this.canvas.drawText(this.canvas.lastText[0],this.canvas.lastText[1]);
		 
	};
	
	this.canvas.drawText("Connecting ...");
	
	this.socket.emit('init', {id: this.sid});
	
	this.canvas.onclick = this.clickHandler.bind(this);
	
	window.onresize = this.resizeCanvas.bind(this);

}