
function PreHandler(session) {

	this.s = session;

	this.resize = function() {

		this.s.canvas.drawText(this.s.canvas.lastText);
	};
}

function LocalHandler(session) {

	this.s = session;

	this.reconnecting = false;

	this.init = function(data) {

		this.s.ui.publish.style.display = "none";

		this.s.currentSide = data.turn;
		
		if(this.s.bPlaying) {
		
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
	};

	
	this.start = function(data) {

		this.s.currentSide = data.next;
		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		this.s.ui.surrender.className = "btn btn-danger";
		this.s.ui.undo.className = "btn btn-primary disabled"; // nothing to undo yet
	};

	this.click = function(x,y) {


		if(!this.s.bPlaying) this.s.socket.emit('start', {id: this.s.sid});
		else this.s.socket.emit('turn', {id: this.s.sid, x: x, y: y});

	};

	this.turn = function(data) {


		if(data.stones.length && data.side != 0){ // no surrender and no undo turn

				this.s.ui.undo.className = "btn btn-primary";
		}

		this.s.currentSide = data.next;
		this.s.ui.info.removeChild(this.s.ui.info.childNodes[this.s.ui.info.childNodes.length-1]);
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		
	};

	this.surrender = function() {
	
		this.s.socket.emit("surrender",{id: this.s.sid, side: this.s.currentSide});
		this.s.ui.surrender.className = "btn btn-danger disabled";
	
	};

	this.endGame = function() {
		
		this.s.ui.undo.className = "btn btn-primary disabled";
		this.s.ui.surrender.className = "btn btn-danger disabled";

		this.drawWinner();

		this.s.currentSide = this.s.nextStarter;
		
	};

	this.drawWinner = function() {

		var msg = "";
		
		if(this.s.winner) msg += "        won! [";
		else msg += "Draw! [";
		
		msg += this.s.player[1].points + ":" + this.s.player[2].points + "]";
		
		this.s.canvas.drawText([msg,"Click to play!"]);
		
		if(this.s.winner) {
			var w = this.s.canvas.width;
			this.s.ctx.drawImage(this.s.winner.icon, w*0.10, w*0.27, w*0.20, w*0.20);
		}

	};

	this.disconnect = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.surrender.className = "btn btn-danger disabled";
		this.s.ui.share.className = "btn btn-primary disabled";
		this.s.canvas.onclick = null;
		this.s.bEnded = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(this.s.bPlaying && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.bEnded) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.check = function() {
		this.s.socket.emit('alive');
	};

}

function OnlineHandler(session) {

	this.s = session;

	this.reconnecting = false;

	this.chatIcons = [new Image(), new Image(), new Image()];
	this.chatIcons[0].src = 'img/highlight.png'; // TODO: own icon?
	this.chatIcons[0].width = 20;
	this.chatIcons[0].height = 20;
	this.chatIcons[1].src = this.s.player[1].icon.src;
	this.chatIcons[1].width = 20;
	this.chatIcons[1].height = 20;
	this.chatIcons[2].src = this.s.player[2].icon.src;
	this.chatIcons[2].width = 20;
	this.chatIcons[2].height = 20;

	this.init = function(data) {


		if(data.published) {
			this.s.ui.publish.innerHTML = "Published";
			this.s.ui.publish.className = "btn btn-success disabled";
		}
		else this.s.ui.publish.className = "btn btn-primary";

		if(this.reconnecting) {

			this.s.bMyTurn = false;
			if(data.connections == 0) 
				this.s.socket.emit('choose', {id: this.s.sid, side: this.s.mySide});
			this.s.canvas.drawText(["Waiting for","opponent ..."]);
			return;
		} 
			
		if(data.connections == 0) {
			
			this.s.canvas.drawText("Choose your color!");

			var w = this.s.canvas.width;
			this.s.ctx.drawImage(this.s.player[1].icon, w*0.2, w*0.5, w*0.2, w*0.2);
			this.s.ctx.drawImage(this.s.player[2].icon, w*0.6, w*0.5, w*0.2, w*0.2);

			this.s.bMyTurn = true;
		} 
				
		// if there is one other player connected yet, "full" message will follow
		// if the session is already full, the SpectatorDecorator intercepted the init call

	}; 

	this.full = function(data) {

		if(!this.s.mySide) this.s.mySide = data.side;
	
		this.s.ui.info.innerHTML = "";

		this.s.ui.publish.innerHTML = "Publish";
		this.s.ui.publish.className = "btn btn-primary disabled";

		this.s.ui.chat.parentElement.parentElement.style.display = "block";

		this.s.ui.info.appendChild(document.createTextNode("Color:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[this.s.mySide].icon.cloneNode());
	
		if(this.s.bPlaying) {
			this.s.field.draw();
			this.s.bMyTurn = (this.s.mySide == data.turn);
			
			this.s.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[data.turn].icon);
			this.s.ui.surrender.className = "btn btn-danger";
		}
		else {

			if(this.s.mySide == this.s.nextStarter) {
				this.s.bMyTurn = true;
				this.s.canvas.drawText("Click to start!");
			}
			else {
				this.s.bMyTurn = false;
				this.s.canvas.drawText("Opponent begins ...");
			}
		}

	};

	this.playerleft = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.publish.className = "btn btn-primary";
		this.s.ui.surrender.className = "btn btn-danger disabled";
		this.s.ui.chat.parentElement.parentElement.style.display = "none";
		this.s.mMyTurn = false;
		this.s.bEnded = false;
		this.s.canvas.drawText(["Waiting for","opponent ..."]); // waiting for another init

	};

	this.start = function(data) {

		this.s.bMyTurn = (data.next == this.s.mySide);
		this.s.ui.info.appendChild(document.createTextNode("\u00A0\u00A0Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		this.s.ui.surrender.className = "btn btn-danger";
		this.s.ui.undo.className = "btn btn-primary disabled"; // nothing to undo yet

	};

	this.click = function(x,y) {


		if(!this.s.bMyTurn) return;

		if(!this.s.mySide) {
			
 			this.s.bMyTurn = false;
			this.s.mySide = (x > (this.s.field.xsize / 2) ? 2 : 1);
			this.s.socket.emit('choose', {id: this.s.sid, side: this.s.mySide});
			this.s.canvas.drawText(["Waiting for","opponent ..."]);
			return;
		
		}

		if(!this.s.bPlaying) this.s.socket.emit('start', {id: this.s.sid});
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

		this.s.bMyTurn = (data.next == this.s.mySide);
		this.s.ui.info.removeChild(this.s.ui.info.childNodes[this.s.ui.info.childNodes.length-1]);
		this.s.ui.info.appendChild(this.s.player[data.next].icon);
		
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

		this.s.bMyTurn = (this.s.nextStarter == this.s.mySide);

		this.drawWinner();
		
	};

	this.drawWinner = function() {

		var msg = "";
		
		if (!this.s.winner) msg = "Draw! [";
		else if(this.s.winner.stone == this.s.mySide) msg += "You won! [";
		else msg += "You lost! [";
		
		msg += this.s.player[this.s.mySide].points + ":" + this.s.player[(this.s.mySide == 1 ? 2 : 1)].points + "]";
		
		if(this.s.bMyTurn) {
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
		this.s.ui.chat.parentElement.parentElement.style.display = "none";
		this.s.canvas.onclick = null;
		this.s.bEnded = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(!this.s.mySide && this.s.bMyTurn) { // choosing color
			this.s.canvas.drawText("Choose your color!");

			var w = this.s.canvas.width;
		
			this.s.ctx.drawImage(this.s.player[1].icon, w*0.2, w*0.5, w*0.2, w*0.2);
			this.s.ctx.drawImage(this.s.player[2].icon, w*0.6, w*0.5, w*0.2, w*0.2);
		}
		else if(this.s.bPlaying && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.bEnded) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.sendMessage = function() {

		var msg = this.s.ui.msgtext.value;
		if (msg == "") return;
		this.s.socket.emit('chat',{id: this.s.sid, msg: msg, side: this.s.mySide})
		this.s.ui.msgtext.value = "";

	};

	this.receivedMessage = function(data) {

		var tr = document.createElement("tr");
		var l = tr.insertCell(0);
		l.appendChild(this.chatIcons[data.side].cloneNode());
		tr.insertCell(1).innerHTML = data.msg;
		this.s.ui.chat.firstElementChild.firstElementChild.appendChild(tr);
		this.s.ui.chat.scrollTop = this.s.ui.chat.scrollHeight;

	};

	this.check = function() {
		this.s.socket.emit('alive');
	};

}

function SpectatorDecorator(handler) {

	this.h = handler;
	this.s = handler.s;

	this.online = false;

	this.reconnecting = false;

	this.init = function(data) {

		this.tmpNext = data.turn;s

		if(this.reconnecting) {

			if(this.online) {

				if(data.connections != 2) { // not full online session

					this.s.canvas.drawText(["Waiting for","player ..."]);
					return;
				}
				else this.s.ui.chat.parentElement.parentElement.style.display = "block";
			}
			else if(data.connections == 0) { // empty local session

				this.s.canvas.drawText(["Waiting for","player ..."]);
				return;
			}

			if(this.s.bPlaying) {
			
				this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
				this.s.ui.info.appendChild(this.s.player[data.turn].icon);

				this.s.field.draw()
			}
			else this.s.canvas.drawText("Player will start ...");
			this.s.socket.emit("spectate",{id: this.s.sid});
			
			return;
		}

		this.s.ui.publish.style.display = "none";
		this.s.ui.undo.style.display = "none";
		this.s.ui.surrender.style.display = "none";

		if(this.h.published) this.online = true;

		this.s.canvas.drawText(["Session is full.","Click to spectate!"]);

	};

	this.playerleft = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));
		this.s.bEnded = false;
		this.s.ui.chat.parentElement.parentElement.style.display = "none";
		this.s.canvas.drawText(["Waiting for","player ..."]);
	};

	this.full = function(data) {

		if(this.online) this.s.ui.chat.parentElement.parentElement.style.display = "block";

		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));

		if(this.s.bPlaying) {
			
			this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[this.tmpNext].icon);

			this.s.field.draw();
		}
	};

	this.start = function(data) {

		this.s.ui.info.appendChild(document.createTextNode("\u00A0Next:\u00A0\u00A0"));
		this.s.ui.info.appendChild(this.s.player[data.next].icon);

		this.tmpNext = data.next;

	};

	this.click = function(x,y) {

		this.s.canvas.onclick = null;

		this.s.ui.info.innerHTML = "";
		this.s.ui.info.appendChild(document.createTextNode("[Spectating]\u00A0"));

		if(this.online) this.s.ui.chat.parentElement.parentElement.style.display = "block";
		if(this.s.bPlaying) {
			this.s.ui.info.appendChild(document.createTextNode("Next:\u00A0\u00A0"));
			this.s.ui.info.appendChild(this.s.player[this.tmpNext].icon);
			this.s.field.draw();
		}
		else this.s.canvas.drawText("Player will start ...");
		this.s.socket.emit("spectate",{id: this.s.sid});
		
	};

	this.turn = this.h.turn;

	this.published = function(data) {}; // only called when a waiting player succesfully publishes a spectated session
	this.surrender = function() {}; // function dummy, will not be called
	this.check = function() {}; // spectators don't emit alive messages

	this.drawWinner = function() {
		
		var msg = "";
		
		if(this.s.winner) msg += "        won! [";
		else msg += "Draw! [";
		
		msg += this.s.player[1].points + ":" + this.s.player[2].points + "]";
		
		this.s.canvas.drawText([msg,"Player will start ..."]);
		
		if(this.s.winner) {
			var w = this.s.canvas.width;
			this.s.ctx.drawImage(this.s.winner.icon, w*0.10, w*0.27, w*0.20, w*0.20);
		}
		
	};

	this.endGame = this.drawWinner;

	this.disconnect = function() {

		this.s.ui.info.innerHTML = "";
		this.s.ui.share.className = "btn btn-primary disabled";
		if(this.online) this.s.ui.chat.parentElement.parentElement.style.display = "none";
		this.s.bEnded = false;
  		this.s.canvas.drawText(["Connection","problems ..."]);
		this.s.socket.socket.reconnect(); // should happen automatically

	};

	this.resize = function() {

		if(this.s.bPlaying && !this.s.canvas.textView) this.s.field.draw();
		else if (this.s.bEnded) this.drawWinner();
		else this.s.canvas.drawText(this.s.canvas.lastText);
	};

	this.sendMessage = function() {

		var msg = this.s.ui.msgtext.value;
		if (msg == "") return;
		this.s.socket.emit('chat',{id: this.s.sid, msg: msg, side: 0})
		this.s.ui.msgtext.value = "";

	};

	this.receivedMessage = function(data) {
		this.h.receivedMessage(data);
	};
}


