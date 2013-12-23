
function PreHandler(session) {

	this.s = session;
	this.initialized = false;

	this.resize = function() {

		this.s.canvas.drawText(this.s.canvas.lastText);
	};
}

function LocalHandler(session) {

	this.s = session;

	this.responsive = false;
	this.currentSide = 0;
	this.initialized = false;

	this.init = function(data) {

		this.s.ui.publish.style.display = "none";

		this.currentSide = data.turn;
		
		if(this.s.playing) {
		
			this.s.field.draw();

			this.s.ui.info.innerHTML = "";
			this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[data.turn].icon);

			this.s.ui.surrender.className = "btn btn-danger";
	
		}
		else {
		
			this.s.field.clear();
			this.s.canvas.drawText("Click to start!");
	
		}

		this.responsive = true;
		this.initialized = true;
	};
	
	this.start = function(data) {

		this.currentSide = data.next;
		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		this.s.ui.surrender.className = "btn btn-danger";
		this.s.ui.undo.className = "btn btn-primary disabled"; // nothing to undo yet
	};

	this.click = function(x,y) {

		if(!this.responsive) return;
		if(!this.s.playing) this.s.socket.emit('start', {id: this.s.sid});
		else this.s.socket.emit('turn', {id: this.s.sid, x: x, y: y});

	};

	this.turn = function(data) {


		if(data.stones.length && data.side != 0){ // no surrender and no undo turn

				this.s.ui.undo.className = "btn btn-primary";
		}

		if(data.side == data.next) notify("You can turn again.");

		this.currentSide = data.next;
		this.s.ui.info.removeChild(this.s.ui.info.childNodes[this.s.ui.info.childNodes.length-1]);
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		
	};

	this.surrender = function() {
	
		this.s.socket.emit("surrender",{id: this.s.sid, side: this.currentSide});
		this.s.ui.surrender.className = "btn btn-danger disabled";
	
	};

	this.endGame = function() {
		
		this.s.ui.undo.className = "btn btn-primary disabled";
		this.s.ui.surrender.className = "btn btn-danger disabled";

		this.drawWinner();

		this.currentSide = this.s.nextStarter;
		
	};

	this.drawWinner = function() {

		var msg = "";
		
		if(this.s.winner) msg += "        won! [";
		else msg += "Draw! [";
		
		msg += this.s.player[1].points + ":" + this.s.player[2].points + "]";
		
		this.s.canvas.drawText([msg,"Click to play!"]);
		
		if(this.s.winner) {
			var w = this.s.canvas.width;
			this.s.canvas.ctx.drawImage(this.s.winner.icon, w*0.10, w*0.27, w*0.20, w*0.20);
		}

	};

	this.disconnect = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.surrender.className = "btn btn-danger disabled";
		this.s.ui.share.className = "btn btn-primary disabled";

		this.responsive = false;
		this.s.endScreen = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(this.s.playing && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.endScreen) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.check = function() {
		this.s.socket.emit('alive');
	};

	// register event handlers

	// game protocol
	this.s.socket.on('disconnect', this.disconnect.bind(this));
	this.s.socket.on('check', this.check.bind(this));

	// surrender button
	this.s.ui.surrender.onclick = this.surrender.bind(this);

}

function OnlineHandler(session) {

	this.s = session;

	this.responsive = false;
	this.myTurn = false;

	this.initialized = false;

	this.init = function(data) {

		if(data.published) {
			this.s.ui.publish.innerHTML = "Published";
			this.s.ui.publish.className = "btn btn-success disabled";
		}
		else this.s.ui.publish.className = "btn btn-primary";

		if(this.initialized) {

			if(data.connections == 0) 
				this.s.socket.emit('choose', {id: this.s.sid, side: this.s.mySide});
			this.s.canvas.drawText(["Waiting for","opponent ..."]);
			return;
		} 
			
		if(data.connections == 0) {
			
			this.s.canvas.drawText("Choose your color!");

			var w = this.s.canvas.width;
			this.s.canvas.ctx.drawImage(this.s.player[1].icon, w*0.2, w*0.5, w*0.2, w*0.2);
			this.s.canvas.ctx.drawImage(this.s.player[2].icon, w*0.6, w*0.5, w*0.2, w*0.2);

			this.responsive = true;
		} 

		this.initialized = true;
				
		// if there is one other player connected yet, "full" message will follow
		// if the session is already full, the SpectatorDecorator intercepted the init call

	}; 

	this.full = function(data) {

		if(!this.s.mySide) this.s.mySide = data.side;
	
		this.s.ui.info.innerHTML = "";

		this.s.ui.publish.innerHTML = "Publish";
		this.s.ui.publish.className = "btn btn-primary disabled";

		this.s.chat.show();

		this.s.ui.info.appendChild(document.createTextNode("Color:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[this.s.mySide].icon.cloneNode());
	
		if(this.s.playing) {
			this.s.field.draw();
			this.myTurn = (this.s.mySide == data.turn);
			
			this.s.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[data.turn].icon);
			this.s.ui.surrender.className = "btn btn-danger";
		}
		else {

			if(this.s.mySide == this.s.nextStarter) {
				this.myTurn = true;
				this.s.canvas.drawText("Click to start!");
			}
			else {
				this.myTurn = false;
				this.s.canvas.drawText("Opponent begins ...");
			}
		}

		this.responsive = true;

	};

	this.playerleft = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.publish.className = "btn btn-primary";
		this.s.ui.surrender.className = "btn btn-danger disabled";
		this.s.chat.hide();
		this.responsive = false;
		this.s.endScreen = false;
		this.s.canvas.drawText(["Waiting for","opponent ..."]); // waiting for another init

	};

	this.start = function(data) {

		this.myTurn = (data.next == this.s.mySide);
		this.s.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		this.s.ui.surrender.className = "btn btn-danger";
		this.s.ui.undo.className = "btn btn-primary disabled"; // nothing to undo yet

	};

	this.click = function(x,y) {

		if(!this.responsive) return;

		if(!this.s.mySide) {
			
			this.s.mySide = (x > (this.s.field.xsize / 2) ? 2 : 1);
			this.s.socket.emit('choose', {id: this.s.sid, side: this.s.mySide});
			this.s.canvas.drawText(["Waiting for","opponent ..."]);
			this.responsive = false;
			return;
		
		}

		if(!this.myTurn)	{
			if(this.s.playing) notify("It's your opponents turn.",2);
			return;
		}

		if(!this.s.playing) this.s.socket.emit('start', {id: this.s.sid});
		else this.s.socket.emit('turn', {id: this.s.sid, x: x, y: y});

	};

	this.turn = function(data) {


		if(data.stones.length) { // regular turn
			
			if(data.side != this.s.mySide) {
				this.s.ui.undo.className = "btn btn-primary disabled";
			}
			else if(data.side != 0){ // if not already an undo turn
				this.s.ui.undo.className = "btn btn-primary";
			}
		}

		this.myTurn = (data.next == this.s.mySide);

		if(data.side == data.next) {

			if(data.side == this.s.mySide) notify("You can turn again.")
			else notify("No valid turns. Opponent can turn again.");
		}

		this.s.ui.info.removeChild(this.s.ui.info.childNodes[this.s.ui.info.childNodes.length-1]);
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		
	};

	this.publish = function() {

		var name = prompt("Enter a name for your session:","");
		if(name && name != "") this.s.socket.emit("publish",{id: this.s.sid, name: name});
	
	};

	this.published = function(data) {

		if(!data.success) alert("Publication failed! (Try a different name)");
		else {
			this.s.ui.publish.innerHTML = "Published";
			this.s.ui.publish.className = "btn btn-success disabled";
		}
	};

	this.surrender = function() {
	
		this.s.socket.emit("surrender",{id: this.s.sid});
		this.s.ui.surrender.className = "btn btn-danger disabled";
	
	};

	this.endGame = function() {
		
		this.s.ui.undo.className = "btn btn-primary disabled";
		this.s.ui.surrender.className = "btn btn-danger disabled";

		this.myTurn = (this.s.nextStarter == this.s.mySide);

		this.drawWinner();
		
	};

	this.drawWinner = function() {

		var msg = "";
		
		if (!this.s.winner) msg = "Draw! [";
		else if(this.s.winner.stone == this.s.mySide) msg += "You won! [";
		else msg += "You lost! [";
		
		msg += this.s.player[this.s.mySide].points + ":" + this.s.player[(this.s.mySide == 1 ? 2 : 1)].points + "]";
		
		if(this.myTurn) {
			this.s.canvas.drawText([msg,"Click to play!"]);
      	}
		else this.s.canvas.drawText([msg,"Opponent begins ..."]);

	};

	this.disconnect = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.publish.innerHTML = "Publish";
		this.s.ui.publish.className = "btn btn-primary disabled";
		this.s.ui.surrender.className = "btn btn-danger disabled";
		this.s.ui.share.className = "btn btn-primary disabled";
		this.s.chat.hide();

		this.responsive = false;
		this.s.endScreen = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(!this.s.mySide && this.myTurn) { // choosing color
			this.s.canvas.drawText("Choose your color!");

			var w = this.s.canvas.width;
		
			this.s.canvas.ctx.drawImage(this.s.player[1].icon, w*0.2, w*0.5, w*0.2, w*0.2);
			this.s.canvas.ctx.drawImage(this.s.player[2].icon, w*0.6, w*0.5, w*0.2, w*0.2);
		}
		else if(this.s.playing && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.endScreen) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.sendMessage = function(msg) {

		this.s.socket.emit('chat',{id: this.s.sid, msg: msg, side: this.s.mySide});

	};

	this.check = function() {
		this.s.socket.emit('alive');
	};

	// register event handlers

	// game protocol
	this.s.socket.on('full', this.full.bind(this));
	this.s.socket.on('playerleft', this.playerleft.bind(this));
	this.s.socket.on('disconnect', this.disconnect.bind(this));
	this.s.socket.on('check', this.check.bind(this));

	// surrender button
	this.s.ui.surrender.onclick = this.surrender.bind(this);

	// publishing
	this.s.socket.on('published', this.published.bind(this));
	this.s.ui.publish.onclick = this.publish.bind(this);

}

function SpectatorHandler(session,online) {

	this.s = session;

	this.online = online;

	this.initialized = false;

	this.init = function(data) {

		if(this.initialized) { // reinit

			if(!data.spec) { // connection problems, server doesn't know that this is a spectating client
				this.s.socket.emit("spectate",{id: this.s.sid});
				return;
			}

			this.s.ui.info.innerHTML = "";
			this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));

			if(this.online) {

				if(data.connections != 2) { // not full online session

					this.s.canvas.drawText(["Waiting for","player ..."]);
					return;
				}
				else this.s.chat.show();
			}
			else if(data.connections == 0) { // empty local session

				this.s.canvas.drawText(["Waiting for","player ..."]);
				return;
			}

			if(this.s.playing) {
			
				this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
				this.s.ui.info.appendChild(this.s.player[data.turn].icon);

				this.s.field.draw()
			}
			else this.s.canvas.drawText("Player will start ...");
			
			return;
		}

		this.s.ui.publish.style.display = "none";
		this.s.ui.info.innerHTML = "&nbsp;"; // prevent collapsing of info bar
		this.s.ui.undo.style.display = "none";
		this.s.ui.surrender.style.display = "none";

		this.s.canvas.drawText(["Session is full.","Click to spectate!"]);

		this.initialized = true;

	};

	this.playerleft = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));
		this.s.endScreen = false;
		if(this.online) this.s.chat.hide();
		this.s.canvas.drawText(["Waiting for","player ..."]);
	};

	this.full = function(data) {

		if(this.online) this.s.chat.show();

		if(this.s.playing) {
			
			this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[data.turn].icon);

			this.s.field.draw();
		}
	};

	this.start = function(data) {

		this.s.ui.info.appendChild(document.createTextNode("\u00A0Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);

	};

	this.click = function(x,y) { // switch to spectator mode

		this.s.canvas.onclick = null; // disable input
		this.s.socket.emit("spectate",{id: this.s.sid}); // this will trigger a re-initialization
		
	};

	this.turn = function(data) {

		// complete redraw of info bar as work around for bug that spectators don't receive
		// full message in local mode
		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));
		this.s.ui.info.appendChild(document.createTextNode("\u00A0Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);

	};

	this.drawWinner = function() {
		
		var msg = "";
		
		if(this.s.winner) msg += "        won! [";
		else msg += "Draw! [";
		
		msg += this.s.player[1].points + ":" + this.s.player[2].points + "]";
		
		this.s.canvas.drawText([msg,"Player will start ..."]);
		
		if(this.s.winner) {
			var w = this.s.canvas.width;
			this.s.canvas.ctx.drawImage(this.s.winner.icon, w*0.10, w*0.27, w*0.20, w*0.20);
		}
		
	};

	this.endGame = this.drawWinner;

	this.disconnect = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.share.className = "btn btn-primary disabled";
		if(this.online) this.s.chat.hide();
		this.s.endScreen = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(this.s.playing && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.endScreen) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.sendMessage = function(msg) {

		this.s.socket.emit('chat',{id: this.s.sid, msg: msg, side: 0});

	};

	// register event handlers

	// game protocol
	this.s.socket.on('full', this.full.bind(this));
	this.s.socket.on('playerleft', this.playerleft.bind(this));
	this.s.socket.on('disconnect', this.disconnect.bind(this));
	// notice that spectators don't respond to check messages

}


