// preload images‚
var img0 = new Image();
var img3 = new Image();
img0.src = 'img/box.png';
img3.src = 'img/highlight.png';

function Player(stoneState, colorName, winCount) {

	this.color = colorName;
	this.stone = stoneState;
	this.points = 0;
	this.wins = winCount;
	
	this.img = new Image();
	this.img.src = 'img/box_' + this.color + '.png';
	
	return true;
}

function Field(refSession,columnNum,rowNum) 
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
	
	this.imgs = [img0, this.session.player1.img, this.session.player2.img, img3];
	
	this.stones = new Array(this.xsize); // 2 dimensional array representing the field
	for (var x = 0; x < this.xsize; x++) {
		this.stones[x] = new Array(this.ysize);
	}
	
	this.clear = function() {
	
		// clear field
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
					this.stones[x][y] = 0;
		}
	
	};
	
	this.update = function(data) {
		
		for (var i in data) {
			
			var t = data[i];
			this.stones[t.x][t.y] = t.s;
		}
		
	};
	
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