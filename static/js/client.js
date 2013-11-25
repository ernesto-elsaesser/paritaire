// preload images‚
var img0 = new Image();
var img3 = new Image();
img0.src = 'img/box.png';
img3.src = 'img/highlight.png';

function Player(stone,color) {

	this.stone = stone;
	this.color = color;
	this.points = 0;
	this.wins = 0;
	
	this.img = new Image();
	this.img.src = 'img/box_' + this.color + '.png';

	this.icon = new Image();
	this.icon.src = 'img/icon_' + this.color + '.png';
	this.icon.width = 30;
	this.icon.height = 30;
}

function Field(refSession,columnNum,rowNum) 
{	
	
	this.session = refSession;
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.future = []; // future turn positions
	
	this.imgs = [img0, this.session.player[1].img, this.session.player[2].img, img3];
	
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
		
		var side = this.session.canvas.width / this.xsize;
		// TODO: non-square field?
		
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.session.ctx.drawImage(this.imgs[this.stones[x][y]], x * side, y * side, side, side);
		}
	};
	
	this.highlight = function(x,y) {
		
		var side = this.session.canvas.width / this.xsize;
		// TODO: non-square field?
		this.session.ctx.drawImage(this.imgs[3], x * side, y * side, side, side);
	};
	
	return true;
}

function createCanvas(container) {

	var canvas = document.createElement('canvas');
	
	canvas.width  = container.clientWidth - 30;
	/*
	if (canvas.width > 450) {
		canvas.width = 450;
		canvas.style.margin = "10px " + ((container.clientWidth - 480) / 2) + "px";
	}
	else {
	*/
		canvas.style.margin   = "10px 0";
	//}
	
	canvas.height = canvas.width; // TODO: change for non-square fields
	
	canvas.drawText = function (text, moretext) {
		
		var ctx = this.getContext("2d");
		var fontsize = parseInt(ctx.font.substr(0,2));

		ctx.textAlign = "center";
		
		ctx.fillStyle = "#FFF";
		ctx.fillRect(0,0,this.width,this.height);
		
		ctx.fillStyle = "#000";
		var x = (this.width / 2); // - (fontsize * 0.22 * text.length);
		var y = this.height * 0.3;
		ctx.fillText(text,x,y);
		
		if(moretext) ctx.fillText(moretext,x,y*2);
		
		this.lastText = text;
		
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