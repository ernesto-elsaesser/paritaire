
function class_session(canvasElement,color1,color2,dimx,dimy) {

	this.canvas = canvasElement;
	
	this.ctx = this.canvas.getContext('2d');
	this.ctx.font = "20px Georgia";
	
	// canvas offset, used for mouse click mapping
	this.xoffset = this.canvas.offsetLeft + this.canvas.parentElement.offsetLeft;
	this.yoffset = this.canvas.offsetTop + this.canvas.parentElement.offsetTop;

	this.player1 = new class_player(1,color1);
	this.player2 = new class_player(2,color2);
	
	// linked loop
	this.player1.next = this.player2;
	this.player2.next = this.player1;
	
	this.currentPlayer = {};
	this.nextStarter = this.player1; // player that will start the next game
	
	this.field = new class_field(this,dimx,dimy,this.canvas.width/dimx);
	this.logic = new class_gamelogic(this.field);
	
	this.bPlaying = false; // control flag
	
	this.ctx.fillStyle = "#000";
	this.ctx.fillText("Click to play!",130,160); // TODO: relative
	
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
		alert(msg);
		
		/*
		ctx.fillStyle = "#666";
		ctx.drawRect();
		ctx.fillStyle = "#000";
		ctx.fillText("Score:",150,100);
		ctx.fillStyle = winner.color;
		ctx.fillText(winner.points, 150,150);
		ctx.fillStyle = winner.next.color;
		ctx.fillText(winner.next.points, 210,150);
		*/
		
		// swap starting player
		this.nextStarter = this.currentPlayer.next;
		
		// TODO: only display when finished loading
		this.ctx.fillStyle = "#FFF";
		this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
		this.ctx.fillStyle = "#000";
		this.ctx.fillText("Click to play!",130,160); // TODO: relative
		
		this.bPlaying = false;
	
	};
	
	this.clickHandler = function(event) {
	
		// mouse position
		var mx = event.clientX-this.xoffset+scrollX;
		var my = event.clientY-this.yoffset+scrollY;
		
		// click inside canvas?
		if(mx > 0 && mx < this.field.xsize * this.field.side && my > 0 && my < this.field.ysize * this.field.side) {
		
			if(!this.bPlaying) {
				this.startGame();
				return;
			}
				
			var x = parseInt(mx/this.field.side);
			var y = parseInt(my/this.field.side);
				
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

} // end class session

function class_player(stoneState, colorName) {

	this.color = colorName;
	this.stone = stoneState;
	this.points = 0;
	this.wins = 0;
	
	this.img = new Image();
	this.img.src = 'img/box_' + this.color + '.png';
	
	return true;
}

function class_field(refSession,columnNum,rowNum,sideLength) 
{	
	// error handling
	if(columnNum % 2 || rowNum % 2) {
		alert("field dimensions should be even");
		return false;
	}
	
	this.session = refSession;
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.side = sideLength;
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
		
			if(bCheck) return 1; // only checking, return true
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