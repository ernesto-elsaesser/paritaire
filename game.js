
var canv, // HTML canvas element 
	ctx, // 2D context of canv
	bPlaying, bFirst, // control flags
	field, // model of the playing field
	xcanv, ycanv, // canvas position on client rectangle
	currentPlayer,
	img, // array to store game images: 0 - emtpy field, 1 - player 1, 2 - player 2
	fader,faderalpha; // globals used for splashText function
	//imgPaths, imgCount,
	
var dirs = [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:-1,y:0},{x:0,y:-1},{x:-1,y:-1},{x:1,y:-1},{x:-1,y:+1}];

/*
function preloadImgs() {

	img[imgCount] = new Image();
	
	if(imgCount < img.length - 1) img[imgCount].onload = preloadImgs;
	else img[imgCount].onload = startGame;
	  
	img[imgCount].src = imgPaths[imgCount]+ "?" + Math.random(); // no clue why ...
	imgCount++;
}
*/

function init(){
	
	img = [new Image(), new Image(), new Image()];
	img[0].src = 'img/boxempty.png';
	img[1].src = 'img/box1.png';
	img[2].src = 'img/box2.png';
	// TODO: src path will depend on player colors
	
	//imgPaths = ['img/boxempty.png', 'img/box1.png', 'img/box2.png'];
	//imgCount = 0;
	
	canv = document.getElementById('canvas');
	container = document.getElementById('field');
	
	canv.onclick = clickHandler;
	ctx = canv.getContext('2d');
	ctx.font="20px Georgia";
	
	xcanv = canv.offsetLeft + container.offsetLeft;
	ycanv = canv.offsetTop + container.offsetTop;
	
	field = new class_field(10,10,36);
	
	var p1 = new class_player(1,"#F00");
	var p2 = new class_player(2,"#00F");
	
	p1.next = p2;
	p2.next = p1;
	
	// TODO: switch
	currentPlayer = p1;
	
	
    ctx.fillStyle = "#000";
	ctx.fillText("Click to play!",140,150);
	
	//preloadImgs();
}

function class_player(stoneState, colorString) {

	this.color = colorString;
	this.stone = stoneState;
	this.points = 2;
	
	// TODO: dynamic field sizes
	if(stoneState == 1) {
	
		this.validTurns = [{x:3,y:5},{x:4,y:6},{x:5,y:3},{x:6,y:4}];
	}
	else {
	
		this.validTurns = [{x:3,y:4},{x:4,y:3},{x:5,y:6},{x:6,y:5}];
	
	}
	
}

function class_square(column, row, sideLength) {
	
	this.side = sideLength;
	
	//position
	this.x = column * this.side; //float
	this.y = row * this.side; //float
	
	//states
	this.state = 0; // 0,1,2
	
	this.draw = function() {
		ctx.drawImage(img[this.state], this.x, this.y, this.side, this.side);
	};
	
	return true;
}

function class_field(columnNum,rowNum,sideLength) 
{	
	//position
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.side = sideLength;
	this.squares = new Array(this.xsize); // 2 dimensional

	for (var x = 0; x < this.xsize; x++) {
		this.squares[x] = new Array(this.ysize);
		for (var y = 0; y < this.ysize; y++)
			this.squares[x][y] = new class_square(x, y, this.side);
			
	}
	
	/*
	this.add = function(direction) {
		switch(direction) {
		case 0: //up
			for(var i = 0; i < this.xsize; i++) {
				for (var j = this.ysize; j >0; j--) {
					this.squares[i][j] = this.squares[i][j-1];
					this.squares[i][j].y += this.side;
				}

				this.squares[i][0] = new class_square(i, 0, this.side);
			}
			this.ysize++;
			break;
		case 1: //right
			this.squares[this.xsize] = new Array(this.ysize);
			for(var i = 0; i < this.ysize; i++)
				this.squares[this.xsize][i] = new class_square(this.xsize, i, this.side);
			this.xsize++;
			break;
		case 2: //down		
			for(var i = 0; i < this.xsize; i++)
				this.squares[i][this.ysize] = new class_square(i, this.ysize, this.side);
			this.ysize++;
			break;
		case 3: //left
			this.squares[this.xsize] = new Array(this.ysize);
			for(var i = 0; i < this.ysize; i++) {
				for (var j = this.xsize; j > 0; j--) {
					this.squares[j][i] = this.squares[j-1][i];
					this.squares[j][i].x += this.side;
				}

				this.squares[0][i] = new class_square(0, i, this.side);
			}
			this.xsize++;
			break;
		}
	};
	
	*/
	
	this.init = function() {
	
		// x and ysize should be even
	
		var xhalf = this.xsize/2;
		var yhalf = this.ysize/2;
	
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				
				// generate 2x2 pattern at center
				if(x == xhalf && y == yhalf || x == xhalf-1 && y == yhalf-1)
					this.squares[x][y].state = 1;
				else if (x == xhalf-1 && y == yhalf || x == xhalf && y == yhalf-1)
					this.squares[x][y].state = 2;
				else
					this.squares[x][y].state = 0;
		}
	};
	
	this.draw = function() {
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.squares[x][y].draw(this.side);
		}
	};
	
	return true;
}

function startGame() {
	
	field.init();
	field.draw();

	bPlaying = true;
}

function endGame() {
	
	bPlaying = false;
	
	if(currentPlayer.points > currentPlayer.next.points)
		winner = currentPlayer;
	else if (currentPlayer.points < currentPlayer.next.points)
		winner = currentPlayer.next;
	else
		alert("draw"); // TODO: handle
	
    ctx.fillStyle = "#666";
	ctx.drawRect();
    ctx.fillStyle = "#000";
	ctx.fillText("Score:",150,100);
	ctx.fillStyle = winner.color;
	ctx.fillText(winner.points, 150,150);
	ctx.fillStyle = winner.next.color;
	ctx.fillText(winner.next.points, 210,150);
	// TODO: better
	
}

function clickHandler(event) {
	
	// mouse position
	var mx = event.clientX-xcanv+scrollX;
	var my = event.clientY-ycanv+scrollY;
	
	// click inside canvas?
	if(mx > 0 && mx < field.xsize * field.side && my > 0 && my < field.ysize * field.side) {
	
		if(!bPlaying) {
			startGame();
			return;
		}
			
		var x = parseInt(mx/field.side);
		var y = parseInt(my/field.side);
		
		/*
		// check if turn is valid
		var turn = -1;
		var turns = currentPlayer.validTurns;
		
		for(var t in turns) {
		
			if(turns[t].x == x && turns[t].y == y) {
				turn = t;
				break;
			}
		}
		
		if(turn == -1) return; // not a valid turn
		else turns.splice(turn,1); // remove turn from valid turns
		*/
			
		var stolenStones = 0;
	
		// check all directions
		for(var d in dirs) {

			stolenStones += tryPath(x,y,dirs[d].x,dirs[d].y,[]);

		}
		
		if(stolenStones == 0) return; // no turn
		
		// put stone
		field.squares[x][y].state = currentPlayer.stone; 
		field.draw();
		
		// change points
		currentPlayer.points += stolenStones + 1;
		currentPlayer.next.points -= stolenStones;
		
		currentPlayer = currentPlayer.next;
		// TODO: update info text
		
		// check if next player can make a turn
		// TODO: this function should run in the background
		checkTurns();
		
	}

}

function tryPath(x,y,deltax,deltay,path) {

	var nextx = x+deltax;
	var nexty = y+deltay;
	
	var stone = field.squares[nextx][nexty].state;
	
	// enemy stone
	if(stone == currentPlayer.next.stone) {
		path[path.length] = {x:nextx,y:nexty};
		return tryPath(nextx,nexty,deltax,deltay,path);
	}
	// own stone - steal stones in path
	else if (stone == currentPlayer.stone) {
	
		for(var i in path) {
		
			field.squares[path[i].x][path[i].y].state = currentPlayer.stone;
			// TODO: check neighbours for valid turns
		
		}
		
		return path.length;
	
	}
	
	// drop path if no stone
	return 0;

}

function checkTurns() {

	// try all turns
	for (var x = 0; x < field.xsize; x++) {
		for (var y = 0; y < field.ysize; y++)
			
			if(field.squares[x][y].state == 0) {
			
				// check all directions
				for(var d in dirs) {

					if(tryPath(x,y,dirs[d].x,dirs[d].y,[]) > 0) return;

				}
			}
			
	}

	// no valid turns
	
	currentPlayer = currentPlayer.next;
	// TODO: no turns info, change info text
	
	checkTurns();

}

// TODO: use this function
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

init();
