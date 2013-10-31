function class_online_session(container,sock,id,color1,wins1,color2,wins2,dimx,dimy,next) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.container = container;

	this.player1 = new class_player(1,color1,wins1);
	this.player2 = new class_player(2,color2,wins2);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.nextStarter = (next == 1 ? this.player1 : this.player2); // player that will start the next game
	
	this.field = new class_field(this,dimx,dimy);
	this.logic = new class_gamelogic(this.field);
	
	this.bPlaying = false; // control flags
	this.bMyTurn = false;
	this.chosenSide = 0;
	
	// socket & connection
	this.sid = id;
	this.socket = sock;
	
	var that = this;
	
	this.socket.on('alone', function () {
	
		if(that.bPlaying) { // in game disconnect
		
      		that.bPlaying = false;
           	that.bMyTurn = false;
		
		}
		
		if(that.chosenSide != 0) that.drawText("Waiting for opponent ...");
		else {
		
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
		
	});
	
	this.socket.on('ready', function (data) {
		
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
			that.drawText("Click to start!");
		}
		else {
			that.bMyTurn = false;
			that.drawText("Opponent begins ...");
		}
		
	  });
	
	this.socket.on('start', function () {
		that.startGame();
	  });
	  
	this.socket.on('turn', function (data) {
		that.othersTurn(data);
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
		
		this.drawText(msg);
		
		this.bPlaying = false;
		
		this.bMyTurn = (this.nextStarter === this.me);
		
		if(this.bMyTurn) {
      		this.ctx.fillText("Click to play!", 100,250);
      	}	
	
	};
	
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
	
		if(!this.bMyTurn) return;
	
		// mouse position
		var mx = event.clientX-this.container.offsetLeft+this.canvas.offsetLeft+scrollX;
		var my = event.clientY-this.container.offsetTop+this.canvas.offsetTop+scrollY;
		
		// click inside canvas?
		if(mx > 0 && mx < this.field.xsize * this.field.side && my > 0 && my < this.field.ysize * this.field.side) {
		
			if(this.chosenSide == 0) {
			
     			this.bMyTurn = false;
				this.chosenSide = (mx > ((this.field.xsize / 2) * this.field.side) ? 2 : 1);
				this.socket.emit('choose', {id: this.sid, side: this.chosenSide});
				this.drawText("Waiting for opponent ...");
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
	
	this.drawText = function(text) {
		
		this.ctx.fillStyle = "#FFF";
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		
		this.ctx.fillStyle = "#000";
		var x = (this.canvas.width / 2) - (this.fontsize * 0.22 * text.length);
		var y = (this.canvas.height / 2) - (this.fontsize / 2);
		this.ctx.fillText(text,x,y);
		
	};
	
	this.publish = function() {
	
		this.socket.emit("publish",{id: this.sid});
	
	};
	
	this.inviteUrl = function() {
	
		// TODO: change! clipboard? modal dialog?
		alert("http://localhost/play?id=" + this.sid + "&side=" + this.other.stone);
	
	};
	
	this.socket.emit('init', {id: this.sid});
	
	this.canvas.onclick = this.clickHandler.bind(this);

} // end class online session

function class_local_session(container,color1,wins1,color2,wins2,dimx,dimy,next) {

	this.canvas = createCanvas(container);
	
	this.ctx = this.canvas.getContext('2d');
	this.fontsize = Math.floor(this.canvas.width/12);
	this.ctx.font =  this.fontsize + "px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.xoffset = container.offsetLeft;
	this.yoffset = container.offsetTop;

	this.player1 = new class_player(1,color1,wins1);
	this.player2 = new class_player(2,color2,wins2);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.currentPlayer = {};
	this.nextStarter = (next == 1 ? this.player1 : this.player2); // player that will start the next game
	
	this.field = new class_field(this,dimx,dimy);
	this.logic = new class_gamelogic(this.field);
	
	this.bPlaying = false; // control flag
	
	this.startGame = function() {
	
		this.field.init();
		this.field.draw();
		
		this.player1.points = 2;
		this.player2.points = 2;

		this.currentPlayer = this.nextStarter;
		this.nextStarter = this.nextStarter.next;
		this.bPlaying = true;
	};
	
	this.endGame = function() {
		
		// TODO: replace with canvas graphics
		var msg = "Color " ;
		
		if(this.currentPlayer.points > this.currentPlayer.next.points) {
			this.currentPlayer.wins++;
			msg += this.currentPlayer.color + " won! [";
		}
		else if (this.currentPlayer.points < this.currentPlayer.next.points) {
			this.currentPlayer.next.wins++;
			msg += this.currentPlayer.next.color + " won! [";
		}
		else
			msg = "Draw! ["
		
		msg += this.player1.points + ":" + this.player2.points + "]";
		
		this.drawText(msg + "\nClick to play!");
		
		this.bPlaying = false;
	
	};
	
	this.drawText = function(text) {
		
		this.ctx.fillStyle = "#FFF";
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		
		this.ctx.fillStyle = "#000";
		var x = (this.canvas.width / 2) - (this.fontsize * 0.25 * text.length);
		var y = (this.canvas.height / 2) - (this.fontsize / 2);
		this.ctx.fillText(text,x,y);
		
	};
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.xoffset+scrollX+this.canvas.offsetLeft;
		var my = event.clientY-this.yoffset+scrollY+this.canvas.offsetTop;
		
		// click inside canvas?
		if(mx > 0 && mx < this.field.xsize * this.field.side && my > 0 && my < this.field.ysize * this.field.side) {
		
			if(!this.bPlaying) {
				this.startGame();
				return;
			}
				
			var x = parseInt(mx/this.field.side);
			var y = parseInt(my/this.field.side);
				
			if(this.field.stones[x][y] != 0) return;
				
			var stolenStones = this.logic.makeTurn(this.currentPlayer,x,y);
			if(stolenStones == 0) return; // no turn
			
			// put stone
			this.field.stones[x][y] = this.currentPlayer.stone; 
			this.field.draw();
			if(this.bDebug) this.logic.drawFuture(this.ctx);
			
			// change points
			this.currentPlayer.points += stolenStones + 1;
			this.currentPlayer.next.points -= stolenStones;
			
			this.currentPlayer = this.currentPlayer.next;
			// TODO: update info text
			
			// check if next player can make a turn
			// TODO: this function should run in the background
			if(!this.logic.canTurn(this.currentPlayer)) {
				this.currentPlayer = this.currentPlayer.next;
				if(!this.logic.canTurn(this.currentPlayer)) this.endGame(); // TODO: info that no more turns are possible
			}
			
		}
			
	};
	
	this.canvas.onclick = this.clickHandler.bind(this);
	
	this.drawText("Click to play!");

} // end class local session

function class_player(stoneState, colorName, winCount) {

	this.color = colorName;
	this.stone = stoneState;
	this.points = 0;
	this.wins = winCount;
	
	this.img = new Image();
	this.img.src = 'img/box_' + this.color + '.png';
	
	return true;
}

function class_field(refSession,columnNum,rowNum) 
{	
	// error handling
	if(columnNum % 2 || rowNum % 2) {
		alert("field dimensions should be even");
		return false;
	}
	
	this.session = refSession;
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.side = this.session.canvas.width / columnNum; // TODO: non-square fields?
	this.future = []; // future turn positions
	
	this.imgs = [new Image(), this.session.player1.img, this.session.player2.img];
	this.imgs[0].src = 'img/box.png';
	
	this.stones = new Array(this.xsize); // 2 dimensional array representing the field
	for (var x = 0; x < this.xsize; x++) {
		this.stones[x] = new Array(this.ysize);
	}
	
	this.init = function() {
	
		// clear field
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
					this.stones[x][y] = 0;
		}
		
		// generate 2x2 pattern at center
		var hx = (this.xsize/2);
		var hy = (this.ysize/2);
		
		this.stones[hx][hy] = 1;
		this.stones[hx-1][hy-1] = 1;
		this.stones[hx][hy-1] = 2;
		this.stones[hx-1][hy] = 2;
	
	};
	
	this.draw = function() {
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.session.ctx.drawImage(this.imgs[this.stones[x][y]], x * this.side, y * this.side, this.side, this.side);
		}
	};
	
	return true;
}

function class_gamelogic(refField) {

	this.field = refField;
	
	var hx = (this.field.xsize/2);
	var hy = (this.field.ysize/2);
		
	// compute possible next turns
	
	/*	  X X
	*	X 1	2 X	
	*	X 2 1 X
	*	  X X
	*/
	
	this.future = [{x:hx-2,y:hy-1},{x:hx-2,y:hy},
		{x:hx-1,y:hy-2},{x:hx-1,y:hy+1},
		{x:hx,y:hy-2},{x:hx,y:hy+1},
		{x:hx+1,y:hy-1},{x:hx+1,y:hy}];
		
		
	this.dirs = [{x:0,y:-1},{x:1,y:-1},{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:-1,y:1},{x:-1,y:0},{x:-1,y:-1}];

	// if this function returns zero, the turn was invalid
	// in this case, the field is not modified
	this.makeTurn = function(player,x,y) {
	
		var stolenStones = 0;
	
		// check all directions
		for(var d in this.dirs) {

			stolenStones += this.tryPath(player,x,y,this.dirs[d].x,this.dirs[d].y,[],false);

		}
		
		if(stolenStones > 0) this.removeFuture(x,y);
		
		return stolenStones;
	
	}
	
	this.tryPath = function(player,x,y,deltax,deltay,path,bCheck) {

		var nextx = x+deltax;
		var nexty = y+deltay;

		// field borders
		if(nextx == -1 || nexty == -1 || nextx == this.field.xsize || nexty == this.field.ysize) return 0;
		
		var stone = this.field.stones[nextx][nexty];
		
		// enemy stone
		if(stone == player.next.stone) {
			path[path.length] = {x:nextx,y:nexty};
			return this.tryPath(player,nextx,nexty,deltax,deltay,path,bCheck);
		}
		// own stone
		else if (stone == player.stone) {
		
			if(path.length > 0 && bCheck) return 1; // only checking, return true
			// swap stones in path to players color
			for(var i in path) this.field.stones[path[i].x][path[i].y] = player.stone;
			return path.length; // return number of stolen stones
		}
		// no stone
		else
		{
			// if there is an empty field next to the dropped stone, try to add it to the future turn positions
			if(path.length == 0) this.addFuture(nextx,nexty);
			return 0;
		}

	};

	this.addFuture = function(x,y) {

		var f = this.future;
		for(var i in f) if(f[i].x == x && f[i].y == y) return;
		f[f.length] = {x:x,y:y};

	};

	this.removeFuture = function(x,y) {

		var f = this.future;
		for(var i in f) if(f[i].x == x && f[i].y == y) f.splice(i,1);

	};

	// TODO: not working correctly
	this.canTurn = function(player) {

		var x,y;

		// try possible future turns
		for (var t in this.future) {
				
				x = this.future[t].x;
				y = this.future[t].y;
				
				for(var d in this.dirs) {
						
						var r = this.tryPath(player,x,y,this.dirs[d].x,this.dirs[d].y,[],true);
						if(r == 1) return true;

				}
				
		}

		// no valid turns
		return false;

	};
	
	this.fimg = new Image();
	this.fimg.src = "img/future.png";
	
	// debug function
	this.drawFuture = function(refCtx) {
		var s = this.field.side;
		for (var t in this.future)
			refCtx.drawImage(this.fimg, this.future[t].x * s, this.future[t].y * s, s, s);
	};
	
}

function createCanvas(container) {

	var canvas = document.createElement('canvas');
	//this.canvas.id     = "canvas";
	canvas.width  = container.clientWidth - 20;
	canvas.style.margin   = "10px";
	if (canvas.width > 400) {
		canvas.width = 400;
		canvas.style.margin = "10px auto";
	}
	canvas.height = canvas.width; // TODO: change for non-square fields
	
	container.appendChild(canvas);
	return canvas;
	
}

/*
UNUSED, CODE DEPRECATED

var fader, faderalpha; // globals for splashText function

function splashText(msg) {
    
    faderalpha = 1.0;
    
    fader = setInterval(function () {
            field.draw();
            ctx.fillStyle = "rgba(220, 150, 100, " + faderalpha + ")";
            ctx.font = "bold 20pt Arial";
            ctx.fillText(msg, canv.width/2 - (msg.length), canv.height/2 - 10);
            faderalpha -= 0.05;
            if (faderalpha <= 0.0) {
              clearInterval(fader);
              field.draw();
            }
        }, 50); 
	
}
*/