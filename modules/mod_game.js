function Session(id,proto) {
	
	this.id = id;
	this.lastTurn = null; // no undo for stored sessions
	this.spectators = [];
	
	if(proto.wins) { // restore state
		
		this.online = proto.online;
		this.dim = proto.dim;
		this.playing = proto.playing;
		this.nextRound = proto.round;
		this.nextTurn = proto.turn;
		this.expirationMonth = proto.expire;
		
		this.player = [null,new Player(1,proto.colors[0],proto.wins[0]), new Player(2,proto.colors[1],proto.wins[1])];
		
		this.field = new Field(this.dim, this.dim);
		this.logic = new GameLogic(this.field);
		
		if(this.playing) {
			this.player[1].points = proto.points[0];
			this.player[2].points = proto.points[1];
			this.field.stones = proto.field;
			this.logic.computeFuture();
		}

		if(proto.pubname) {
			this.publicName = proto.pubname;
			this.publicationDate = proto.pubdate;
		}
		else this.publicName = null;
		
	}
	else { // create new from post data

		// are both colors valid color strings and different?
		var c = 0;
		for(var i in this.validColors) if(proto.col1 == this.validColors[i] || proto.col2 == this.validColors[i]) c++;
		if( c < 2 ) return null;	
	
		// is the dimension an even number?
		this.dim = parseInt(proto.dim);
		if(isNaN(this.dim) || this.dim % 2) return null;
	
		// online flag
		if(proto.mode == "0") this.online = false;
		else if(proto.mode == "1") this.online = true;
		else return null; // TODO: solo mode!
	
		this.nextRound = 1;
		this.nextTurn = 1;
		this.player = [null,new Player(1,proto.col1,0), new Player(2,proto.col2,0)];
		this.field = new Field(this.dim, this.dim);
		this.logic = new GameLogic(this.field);
		this.playing = false;
		this.publicName = null;
		this.isUsed();

		this.valid = true; // if not set, proto was invalid
	}
}

Session.prototype.validColors = ["blue","green","orange","red","violet","yellow","cyan"];

Session.prototype.startGame = function(side) {
		
	if(this.playing) return false;
	if(this.online && side != this.nextRound) return false;

	this.logic.init();
	this.player[1].points = 2;
	this.player[2].points = 2;
	this.playing = true;
	this.nextTurn = this.nextRound;
	this.lastTurn = null;
	
	var t = {stones: this.field.getDelta(),
		points:[2,2],
		next:this.nextTurn
	};
	
	this.broadcast("start",t);

	return true;

};
   
Session.prototype.turn = function(side,x,y) {
	   
   	if(!this.playing) return false;
   
   	if(!this.online) side = this.nextTurn;
	else if(side != this.nextTurn) return false;
	
	if(isNaN(x) || isNaN(y) || x < 0 || y < 0 || x >= this.dim || y >= this.dim) return false;
	if(this.field.stones[x][y] != 0) return false;
	
	var stolenStones = this.logic.makeTurn(side,x,y);
	if(stolenStones == 0) return false;

	// put stone
	this.field.putStone(side,x,y);

	// change points
	var other = (side == 1 ? 2 : 1);
	
	this.player[side].points += stolenStones + 1;
	this.player[other].points -= stolenStones;

	var thisTurn = this.nextTurn;

	if(this.logic.canTurn(other)) this.nextTurn = other;
	else if(!this.logic.canTurn(side)) this.endRound();

	var d = this.field.getDelta();

	this.lastTurn = {stones: d,
		points: [d.length, d.length],
		side: thisTurn,
		next: this.nextTurn
	};
	
	this.lastTurn.points[(side==1?1:0)] = -(d.length-1);
	
	this.broadcast("turn",this.lastTurn);
	
	return true;
};

Session.prototype.endRound = function() {

	var winner = null;
	
	if(this.player[1].points > this.player[2].points) winner = this.player[1];
	else if(this.player[2].points > this.player[1].points) winner = this.player[2];

	if(winner) winner.wins++;
	
	this.nextTurn = 0;
	this.playing = false;

    this.nextRound = (this.nextRound == 1 ? 2 : 1);

};
   
Session.prototype.undo = function(side) {
   	
	if(!this.playing) return false; 
	if(!this.lastTurn) return false;
	if(this.online && this.lastTurn.side != side) return false;
	
	var stones = this.logic.undoTurn(this.lastTurn.stones);
	
	var t = {stones: stones,
		points: this.lastTurn.points.map(function(a){return -a;}),
		side: 0, // indicates undo turn
		next: this.lastTurn.side
	};
	
	this.nextTurn = this.lastTurn.side;
	this.player[1].points += t.points[0];
	this.player[2].points += t.points[1];
	this.lastTurn = null;
	
	this.broadcast("turn",t);
	
	return true;

};

Session.prototype.surrender = function(side) {

	if(!this.playing) return false;

	this.player[side].points = 0;
	this.player[(side == 1 ? 2 : 1)].points = 1;

	this.endRound();

	var t = {stones: [],
		points: [0,0],
		side: side,
		next: 0
	};
	
	this.broadcast("turn",t);
	
	return true;

};

Session.prototype.broadcast = function(msg,data) {

	if(this.player[1].connected) this.player[1].socket.emit(msg,data);
	if(this.player[2].connected) this.player[2].socket.emit(msg,data);
   		
   	for(var i in this.spectators) this.spectators[i].emit(msg,data);

};

Session.prototype.publish = function(name) {

	this.publicName = name;
	this.publicationDate = (new Date()).getTime();

};

Session.prototype.unpublish = function() {

	this.publicName = null;
	this.publicationDate = 0;
};

Session.prototype.countCon = function() {

	var c = 0;
	if(this.player[1].connected) c++;
	if(this.player[2].connected) c++;
	return c;

};
   
Session.prototype.getState = function(dumping) {
		
	var state = { online: this.online,
		dim: this.dim,
		playing: this.playing,
		round: this.nextRound,
		turn: this.nextTurn,
		wins: [this.player[1].wins, this.player[2].wins]
	};
	
	if(this.playing) {
		state.field = this.field.stones;
		state.points = [this.player[1].points, this.player[2].points];
	}

	if(this.publicName) state.published = true;
	
	if(dumping) {
		delete state.connections;
		state.colors = [this.player[1].color, this.player[2].color];
		state.expire = this.expirationDate;
		if(this.publicName) {
			state.pubname = this.publicName;
			state.pubdate = this.publicationDate;
		}
	}
	else {
		state.connections = this.countCon();
	}
		
	return state;
	
};

Session.prototype.isUsed = function() {
	this.expirationMonth = (new Date()).getMonth() + 2; // sessions last 2 - 3 month, depending on day of creation
	this.expirationDate %= 11;
};

// ----------------------------------------------------------------------------------------------------
// PLAYER CLASS
// ----------------------------------------------------------------------------------------------------

function Player(stone, color, wins) {

	this.color = color;
	this.stone = stone;
	this.points = 0;
	this.wins = wins;
	this.socket = null;
	this.connected = false;
	this.alive = false;

}
	
Player.prototype.connect = function(socket) {
		
	this.socket = socket;
	this.connected = true;
	this.alive = true;
	
};

Player.prototype.disconnect = function() {
	
	this.connected = false;
	this.alive = false;

	if(this.socket) {
		this.socket.disconnect();
		this.socket = null;
	}
	
};

Player.prototype.checkDrop = function() {
	
	if(this.connected && !this.alive) {
		this.disconnect();
		return true;
	}
	
	return false;
};

Player.prototype.invalidate = function() {
	
	this.alive = false;
	
};

Player.prototype.revalidate = function() {
	
	this.alive = true;
	
};

// ----------------------------------------------------------------------------------------------------
// FIELD CLASS
// ----------------------------------------------------------------------------------------------------

function Field(columnNum,rowNum) {
		
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.delta = [];
	
	this.stones = new Array(this.xsize); // 2 dimensional array representing the field
	for (var x = 0; x < this.xsize; x++) {
		this.stones[x] = new Array(this.ysize);
	}
}
	
Field.prototype.init = function() {

	// clear field
	for (var x = 0; x < this.xsize; x++) {
		for (var y = 0; y < this.ysize; y++)
				this.stones[x][y] = 0;
	}
	
	// generate 2x2 pattern at center
	var hx = (this.xsize/2);
	var hy = (this.ysize/2);
	
	this.putStone(1,hx,hy);
	this.putStone(1,hx-1,hy-1);
	this.putStone(2,hx,hy-1);
	this.putStone(2,hx-1,hy);

};

Field.prototype.putStone = function(side,x,y) {
	
	var old = this.stones[x][y];
	this.stones[x][y] = side;
	this.delta.push({x:x,y:y,s:side,os:old});
	
};

Field.prototype.getDelta = function() {
	
	var t = this.delta;
	this.delta = [];
	return t;
};

// ----------------------------------------------------------------------------------------------------	
// GAME LOGIC CLASS
// ----------------------------------------------------------------------------------------------------

function GameLogic(refField) {

	this.field = refField;
	this.future = [null,[],[]]; // possible next turns

}

GameLogic.prototype.dirs = [{x:0,y:-1},{x:1,y:-1},{x:1,y:0},{x:1,y:1},{x:0,y:1},{x:-1,y:1},{x:-1,y:0},{x:-1,y:-1}];

GameLogic.prototype.init = function() {
			
	this.field.init();
	this.computeFuture();
	
};

GameLogic.prototype.computeFuture = function() {
	
	this.future = [null,[],[]];
	
	var stone;
	
	for (var x = 0; x < this.field.xsize; x++) {
		for (var y = 0; y < this.field.ysize; y++) {
			
			stone = this.field.stones[x][y];
			if(stone != 0) this.updateFuture(stone,x,y);
					
		}
	}
	
};

// if this function returns zero, the turn was invalid
// in this case, the field is not modified
GameLogic.prototype.makeTurn = function(side,x,y) {

	var stolenStones = 0;

	// check all directions
	for(var d in this.dirs) {

		stolenStones += this.tryPath(side,x,y,this.dirs[d].x,this.dirs[d].y,[],false);

	}
	
	if(stolenStones > 0) this.updateFuture(side,x,y);
	
	return stolenStones;

};
	
GameLogic.prototype.tryPath = function(side,x,y,deltax,deltay,path,bCheck) {

	var nextx = x+deltax;
	var nexty = y+deltay;

	// field borders
	if(nextx == -1 || nexty == -1 || nextx == this.field.xsize || nexty == this.field.ysize) return 0;
	
	var stone = this.field.stones[nextx][nexty];
	
	// enemy stone
	if(stone + side == 3) {
		path.push({x:nextx,y:nexty});
		return this.tryPath(side,nextx,nexty,deltax,deltay,path,bCheck);
	}
	// own stone
	else if (stone == side) {
	
		if(path.length > 0 && bCheck) return 1; // only checking, return true
		// swap stones in path to players color
		for(var i in path) this.field.putStone(side,path[i].x,path[i].y);
		return path.length; // return number of stolen stones
	}
	// no stone
	else return 0;

};

GameLogic.prototype.updateFuture = function(side,x,y) {
	
	var tx, ty;
	var other = (side == 1 ? 2 : 1);
	
	for(var d in this.dirs) {
		
		tx = x+this.dirs[d].x;
		ty = y+this.dirs[d].y;
		
		if(tx == -1 || ty == -1 || tx == this.field.xsize || ty == this.field.ysize) continue;
		
		if(this.field.stones[tx][ty] == 0)
			this.addFuture(other,tx,ty);
		
	}
	
	this.removeFuture(1,x,y);
	this.removeFuture(2,x,y);
};

GameLogic.prototype.addFuture = function(side,x,y) {

	var f = this.future[side];
	
	for(var i in f) 
		if(f[i].x == x && f[i].y == y) return;
	
	f.push({x:x,y:y});

};

GameLogic.prototype.removeFuture = function(side,x,y) {

	var f = this.future[side];
	
	for(var i in f) {
		if(f[i].x == x && f[i].y == y) {
			f.splice(i,1);
			return;
		}
	}

};

GameLogic.prototype.canTurn = function(side) {

	var x,y;
	var f = this.future[side];

	// try possible future turns
	for (var t in f) {
			
			x = f[t].x;
			y = f[t].y;
			
			for(var d in this.dirs) {
					
					var r = this.tryPath(side,x,y,this.dirs[d].x,this.dirs[d].y,[],true);
					if(r == 1) return true;

			}
			
	}

	// no valid turns
	return false;
	
};

GameLogic.prototype.undoTurn = function(stones) {

	var delta = [];
	
	for(var i in stones) {
		
		this.field.stones[stones[i].x][stones[i].y] = stones[i].os;
		delta.push({x:stones[i].x,y:stones[i].y,s:stones[i].os});
		
	}

	var turn = stones[stones.length-1];

	this.addFuture(1,turn.x,turn.y);
	this.addFuture(2,turn.x,turn.y);

	return delta;
};

exports.Session = Session;
exports.Player = Player;
exports.Field = Field;
exports.GameLogic = GameLogic;