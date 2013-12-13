// preload images
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

function createCanvas() {

	var container = document.getElementById('canvas-container');
	var canvas = document.createElement('canvas');
	
	canvas.width  = container.clientWidth;
	canvas.height = canvas.width; // TODO: change for non-square fields
	canvas.ctx = canvas.getContext('2d');
	canvas.ctx.font = Math.floor(canvas.width/12) + "px Verdana";

	document.getElementById("notification").maxWidth = (canvas.width * 0.66) + "px";

	canvas.textView = false;
	
	canvas.drawText = function (text) {
		
		if(typeof text == "string") text = [text];

		var fontsize = parseInt(this.ctx.font.substr(0,2));

		this.ctx.textAlign = "center";
		
		this.ctx.fillStyle = "#FFF";
		this.ctx.fillRect(0,0,this.width,this.height);

		this.ctx.lineWidth = 5;
		this.ctx.strokeRect(0,0,this.width,this.height);
		this.ctx.lineWidth = 1;
		
		this.ctx.fillStyle = "#000";
		var x = (this.width / 2);
		this.ctx.fillText(text[0],x,this.height * 0.4);
		if(text[1]) this.ctx.fillText(text[1],x,this.height * 0.6);
		
		this.lastText = text;

		this.textView = true;
		
	};

	canvas.resize = function() {

		var w = container.clientWidth; // TODO: working?

		this.width = w;
		this.height = w; // TODO: change for non-square fields
		this.ctx.font = Math.floor(w/12) + "px Verdana";
	};

	canvas.offsetX = function() {
		return container.offsetLeft+container.offsetParent.offsetLeft;
	};

	canvas.offsetY = function() {
		return container.offsetTop+container.offsetParent.offsetTop+10;
	};

	container.appendChild(canvas);

	return canvas;
	
}

function Field(arrPlayer,canvas,columnNum,rowNum) 
{	
	
	this.canvas = canvas;
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.highlighted = null;
	
	this.imgs = [img0, arrPlayer[1].img, arrPlayer[2].img, img3];
	
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
		
		var side = this.canvas.width / this.xsize;
		// TODO: non-square field?
		
		for (var x = 0; x < this.xsize; x++) {
			for (var y = 0; y < this.ysize; y++)
				this.canvas.ctx.drawImage(this.imgs[this.stones[x][y]], x * side, y * side, side, side);
		}
		
		// draw highlight
		if(this.highlighted)
			this.canvas.ctx.drawImage(this.imgs[3], this.highlighted[0] * side, this.highlighted[1] * side, side, side);


		this.canvas.textView = false;
	};

}

function RatioBar(arrPlayers) {

	var colorList = {blue: "#3d70b7",
				cyan: "#4bc5d0",
				green: "#459f28",
				orange: "#e18336",
				red: "#bd3434",
				violet: "#843fbd",
				yellow: "#c8b439" };

	this.wincount = document.getElementById('win-counter');
	this.pl1 = document.getElementById('pl1-ratio');

	// initial update
	this.wincount.innerHTML = arrPlayers[1].wins + " : " + arrPlayers[2].wins;
	this.pl1.style.backgroundColor = colorList[arrPlayers[1].color];
	this.pl1.style.width = ( 100 * (arrPlayers[1].wins + 2))/( arrPlayers[1].wins + arrPlayers[2].wins + 4 ) + "%";
	document.getElementById('pl2-ratio').style.backgroundColor = colorList[arrPlayers[2].color];


	this.update = function(w1,w2) {

		var max = ( 100 * (w1 + 2))/( w1 + w2 + 4 );
		var now = parseInt(this.pl1.style.width.replace("%",""));
		var element = this.pl1;

		var step = function() { // closure that stores max,now,element internally

			if(Math.abs(now - max) < 0.1) return;
			now += (max < now ? -0.1 : 0.1);
			element.style.width = now + "%";
			setTimeout(step,10);

		};

		this.wincount.innerHTML = w1 + " : " + w2;
		step();

	};

}

function Chat(c1,c2,handler) {

	this.chatIcons = [new Image(), new Image(), new Image()];
	this.chatIcons[0].src = 'img/highlight.png';
	this.chatIcons[0].width = 20;
	this.chatIcons[0].height = 20;
	this.chatIcons[1].src = 'img/icon_' + c1 + '.png';
	this.chatIcons[1].width = 20;
	this.chatIcons[1].height = 20;
	this.chatIcons[2].src = 'img/icon_' + c2 + '.png';
	this.chatIcons[2].width = 20;
	this.chatIcons[2].height = 20;

	this.panel = document.getElementById('chat-panel');
	this.frame = document.getElementById("chat-iframe");
	this.text = document.getElementById('message-text');
	this.handler = handler;

	this.messages = this.frame.contentDocument.getElementById("chat-messages");
	
	this.show = function() {
		this.panel.style.display = "block";
	};

	this.hide = function() {
		this.panel.style.display = "none";
	};
	
	this.adjustHeight = function() {
		if(window.innerWidth > 991)
			this.frame.style.height = document.getElementById("play-main").clientHeight - 268 + "px";
		else
			this.frame.style.height = "120px";
	};

	this.sendMessage = function() { 

		var msg = this.text.value;
		this.text.value = "";

		if (msg == "") return;
		
		this.handler.sendMessage(msg);
	};

	this.addMessage = function(side,msg) {

		// create dom node in chat panel
		var tr = document.createElement("tr");
		var l = tr.insertCell(0);
		l.appendChild(this.chatIcons[side].cloneNode());
		tr.insertCell(1).innerHTML = msg;
		this.messages.firstElementChild.appendChild(tr);
		this.frame.contentDocument.body.scrollTop = this.frame.contentDocument.body.scrollHeight;

	};

	this.refresh = function() {

		this.frame.src = "chat.html";
		this.messages = this.frame.contentDocument.getElementById("chat-messages");
	};

	// event handlers
	document.getElementById('chat-refresh').onclick = this.refresh.bind(this);
	var callback = this.sendMessage.bind(this);
	document.getElementById('message-send').onclick = callback;

	this.text.onkeyup = function(event) { // send by hitting enter in text field
			if(event.keyCode == 13) callback();
		};
		
		
	this.adjustHeight();

}

var fader; // timeout id, has to be global

function notify(msg,duration) {

	if(fader) {

		setTimeout(function() {notify(msg);}, 1000);
		return;
	}

	var element = document.getElementById("notification");
	var opacity = 0;
	var delay = 3000; // by default, message stays for 3 seconds
	if(duration) delay = duration * 1000;


	element.innerHTML = msg;

    fadeout = function () {

        opacity -= 0.05;
        element.style.opacity = opacity;

        if (opacity >= 0.05) fader = setTimeout(fadeout,15);
        else {
        	element.style.opacity = 0;
        	fader = null;
        }
    };

    fadein = function () {

        opacity += 0.05;
        element.style.opacity = opacity;

        if (Math.abs(opacity - 0.9) >= 0.05) fader = setTimeout(fadein,15);
        else fader = setTimeout(fadeout,delay);

    }; 

	fadein();
	
}
