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
	
	this.imgs = [new Image(), this.session.player1.img, this.session.player2.img, new Image()];
	this.imgs[0].src = 'img/box.png';
	this.imgs[3].src = 'img/highlight.png';
	
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
	
	this.load = function(data) {
	
		var points = [0,0];
		
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
			
				var stone = data[x][y];
				this.stones[x][y] = stone;
				if(stone == 1) points[0]++;
				else if(stone == 2) points[1]++;
		}
		
		return points;
	}
	
	this.draw = function() {
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.session.ctx.drawImage(this.imgs[this.stones[x][y]], x * this.side, y * this.side, this.side, this.side);
		}
	};
	this.highlight = function(x,y) {
		this.session.ctx.drawImage(this.imgs[3], x * this.side, y * this.side, this.side, this.side);
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
	
	canvas.width  = container.clientWidth - 30;
	if (canvas.width > 400) {
		canvas.width = 400;
		canvas.style.margin = "10px " + ((container.clientWidth - 430) / 2) + "px";
	}
	else {
		canvas.style.margin   = "10px 0";
	}
	
	canvas.height = canvas.width; // TODO: change for non-square fields
	
	canvas.drawText = function (text, fontsize) {
		
		var ctx = this.getContext("2d");
		
		ctx.fillStyle = "#FFF";
		ctx.fillRect(0,0,canvas.width,canvas.height);
		
		ctx.fillStyle = "#000";
		var x = (this.width / 2) - (fontsize * 0.22 * text.length);
		var y = (this.height / 2) - (fontsize / 2);
		ctx.fillText(text,x,y);
		
	};
	
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