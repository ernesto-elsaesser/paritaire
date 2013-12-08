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
	this.highlighted = null;
	
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
		
		this.highlighted = null;
	
	};
	
	this.update = function(data) {
		
		if(data.length == 0) return;
		
		for (var i in data) {
			
			var t = data[i];
			this.stones[t.x][t.y] = t.s;
			
			if(i == (data.length-1)) 
				this.highlighted = [t.x,t.y];
		}
		
	};
	
	this.draw = function() {
		
		var side = this.session.canvas.width / this.xsize;
		// TODO: non-square field?
		
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.session.ctx.drawImage(this.imgs[this.stones[x][y]], x * side, y * side, side, side);
		}
		
		// draw highlight
		if(this.highlighted)
			this.session.ctx.drawImage(this.imgs[3], this.highlighted[0] * side, this.highlighted[1] * side, side, side);


		this.session.canvas.textView = false;
	};
	
	return true;
}

function createCanvas(container) {

	var canvas = document.createElement('canvas');
	
	canvas.width  = container.clientWidth;
	canvas.height = canvas.width; // TODO: change for non-square fields

	canvas.textView = false;
	
	canvas.drawText = function (text) {
		
		if(typeof text == "string") text = [text];

		var ctx = this.getContext("2d");
		var fontsize = parseInt(ctx.font.substr(0,2));

		ctx.textAlign = "center";
		
		ctx.fillStyle = "#FFF";
		ctx.fillRect(0,0,this.width,this.height);

		ctx.lineWidth = 5;
		ctx.strokeRect(0,0,this.width,this.height);
		ctx.lineWidth = 1;
		
		ctx.fillStyle = "#000";
		var x = (this.width / 2);
		ctx.fillText(text[0],x,this.height * 0.4);
		if(text[1]) ctx.fillText(text[1],x,this.height * 0.6);
		
		this.lastText = text;

		this.textView = true;
		
	};

	
	container.appendChild(canvas);
	return canvas;
	
}

var fading; // required globals

function notify(msg,duration) {


	if(fading) {

		setTimeout(function() {notify(msg);}, 1000);
		return;
	}

	opacity = 0;
	ui.notification.innerHTML = msg;

	fadein = function () {

        opacity += 0.05;
        ui.notification.style.opacity = opacity;

        if (Math.abs(opacity - 0.9) >= 0.05) setTimeout(fadein,50);

    }; 

    fadeout = function () {

        opacity -= 0.05;
        ui.notification.style.opacity = opacity;

        if (opacity >= 0.05) fading = setTimeout(fadeout,50);
        else {
        	ui.notification.style.opacity = 0;
        	fading = null;
        }
    };

	var out = 5000;
	if(duration) out = (duration + 1) * 1000
	fading = setTimeout(fadeout,out);

	fadein();
	
}
