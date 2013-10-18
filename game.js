
var canv, ctx,
	textbox,
	bFirst,
	field,
	xcanvoffset, ycanvoffset,
	currentplayer,
	winner,
	img,
	imgPaths, imgCount,
	fader,faderalpha;

function preloadImgs() {

	img[imgCount] = new Image();
	
	if(imgCount < img.length - 1) img[imgCount].onload = preloadImgs;
	else img[imgCount].onload = startGame;
	  
	img[imgCount].src = imgPaths[imgCount]+ "?" + Math.random(); // no clue why ...
	imgCount++;
}

function init(){
	
	img = new Array(3);
	imgPaths = ['img/boxempty.png', 'img/box1.png', 'img/box2.png'];
	imgCount = 0;
	
	canv = document.getElementById('canvas');
	container = document.getElementById('field');
	
	canv.onclick = myclick;
	ctx = canv.getContext('2d');
	
	xcanvoffset = canv.offsetLeft + container.offsetLeft;
	ycanvoffset = canv.offsetTop + container.offsetTop;
	
	field = new class_field(10,10,40);
	field.init();
	
	winner = 0;
	currentplayer = 1;
	
	preloadImgs();
}

function class_square(column, row, sidelength) {
	
	this.side = sidelength;
	
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

function class_field(x,y,s) 
{	
	//position
	this.xsize = x;
	this.ysize = y;
	this.side = s;
	this.squares = new Array(this.xsize); // 2 dimensional

	this.init = function() {
		for (var i = 0; i < this.xsize; i++) {
			this.squares[i] = new Array(this.ysize);
			for (var j = 0; j < this.ysize; j++)
				this.squares[i][j] = new class_square(i, j, this.side);
		}
	};
	
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
	
	this.reset = function() {
		for (var i = 0; i < this.xsize; i++) {
			for (var j = 0; j < this.ysize; j++)
				this.squares[i][j].state = 0;
		}
	};
	
	this.draw = function() {
		for (var i = 0; i < this.xsize; i++) {
			for (var j = 0; j < this.ysize; j++)
				this.squares[i][j].draw(this.side);
		}
	};
	
	return true;
}

function startGame() {
	
	field.reset();
	winner = 0;
	
	field.draw();
	
	bFirst = true;
}

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

function checkWin(player,row,column) {
	
	for(var i = 0; i < 8; i++) {
		
			var r = row;
			var c = column;
			for(var j = 0;; j++) {

				if(j == 4) return true;
				
				switch(i) {
				case 0:
					r++;
					break;
				case 1:
					c++;
					break;
				case 2:
					r--;
					break;
				case 3:
					c--;
					break;
				case 4:
					r++; c++;
					break;
				case 5:
					r++; c--;
					break;
				case 6:
					r--; c++;
					break;
				case 7:
					r--; c--;
					break;
				}
				
				if(r < 0 || r == field.ysize || c < 0 || c == field.xsize) break;
				if(field.squares[c][r].state != player) break;
			}
	}
	return false;
}

function myclick(event) {
	
	// mouse position
	var mx = event.clientX-xcanvoffset+scrollX;
	var my = event.clientY-ycanvoffset+scrollY;
	
	if(mx > 0 && mx < field.xsize * field.side && my > 0 && my < field.ysize * field.side) {
		if(winner) {
			startGame();
			return;
		}
			
		var column = parseInt(mx/field.side);
		var row = parseInt(my/field.side);
		if(!bFirst) {
			if(field.squares[column][row].state)
				return;
			
			/*
			if(row < 1) {
				field.add(0);
				canv.height += field.side;
				row++; // now the current click is one row down
			}
			else if (row > field.ysize-2) {
				field.add(2);
				canv.height += field.side;
			}
			
			if(column < 1) {
				canv.width += field.side;
				field.add(3);
				column++; // now the current click is one column left
			}
			else if (column > field.xsize-2) {
				field.add(1);
				canv.width += field.side;
			}
			*/
			
			var count = 0;
			
			if(column < (field.ysize-1) && field.squares[column+1][row].state) count++;
			if(row < (field.xsize-1) && field.squares[column][row+1].state) count++;
			if(column > 0 && field.squares[column-1][row].state) count++;
			if(row > 0 && field.squares[column][row-1].state) count++; 
			if(column < (field.ysize-1) && row < (field.xsize-1) && field.squares[column+1][row+1].state) count++;
			if(column > 0 && row > 0 && field.squares[column-1][row-1].state) count++;
			if(column < (field.ysize-1) && row > 0 && field.squares[column+1][row-1].state) count++; 
			if(column > 0 && row < (field.xsize-1) && field.squares[column-1][row+1].state) count++;
			if(count == 0) return;
		}
		else {
			if(column < 3 || column > 6 || row < 3 || row > 6) return;
			bFirst = false;
		}
		field.squares[column][row].state = currentplayer;
		field.draw();
		if(checkWin(currentplayer,row,column))
			winner = currentplayer;	
		currentplayer = (currentplayer == 1) ? 2 : 1;
		//drawText();
	}

}

