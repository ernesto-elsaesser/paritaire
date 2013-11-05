var validColors = ["blue","green","orange","red","violet","yellow"];

function Session(id,proto) {
	
	if(proto == undefined) return null;

	// are both colors valid color strings and different?
	var c = 0;
	for(var i in validColors) if(proto.col1 == validColors[i] || proto.col2 == validColors[i]) c++;
	if( c < 2 ) return null;	
	
	// is the dimension an even number?
	this.dim = parseInt(proto.dim);
	if(isNaN(this.dim) || this.dim % 2) return null;
	
	// online flag
	if(proto.online == "true") this.online = true;
	else if(proto.online == "false") this.online = false;
	else return null;
	
	this.id = id;
	this.nextRound = 1;
	this.nextTurn = 1;
	this.players = [null,new Player(1,proto.col1,0), new Player(2,proto.col2,0)];
	this.field = new Field(this.dim, this.dim);
	this.logic = new GameLogic(this.field);
	this.playing = false;
	
	this.startGame = function() {
		
		this.field.init();
		this.players[1].points = 2;
		this.players[2].points = 2;
		this.playing = true;
		this.nextTurn = this.nextRound;
		
		var t = {stones: this.field.getDelta(),
			points:[2,2],
			next:this.nextTurn
		};
		
		this.players[1].send("turn",t);
		
	   	if(this.online) this.players[2].send("turn",t);

	    this.nextRound = (this.nextRound == 1 ? 2 : 1);
   }
   
   this.turn = function(side,x,y) {
	   
	   	if(side != this.nextTurn) return;
		if(this.field.stones[x][y] != 0) return;
		
		var stolenStones = this.logic.makeTurn(side,x,y);
		if(stolenStones == 0) return;
	
		// put stone
		this.field.putStone(side,x,y);
	
		// change points
		var other = (side == 1 ? 2 : 1);
		
		this.players[side].points += stolenStones + 1;
		this.players[other].points -= stolenStones;
	
		if(this.logic.canTurn(other)) this.nextTurn = other;
		else if(!this.logic.canTurn(side)) { // end of game
			
			var winner = null;
		
			if(this.players[1].points > this.players[2].points) winner = this.players[1];
			else if(this.players[2].points > this.players[1].points) winner = this.players[2];
		
			if(winner) winner.wins++;
			
			this.nextTurn = 0;
			this.playing = false;
		}

		var t = {stones: this.field.getDelta(),
			points: [this.players[1].points,this.players[2].points],
			next:this.nextTurn
		};
    	
		this.players[1].send("turn",t);
		
	   	if(this.online) this.players[2].send("turn",t);
	
   };
   
   this.getState = function() {
		
		var state = { dim: this.dim,
			playing: this.playing,
			round: this.nextRound,
			wins: [this.players[1].wins, this.players[2].wins]
		};
		
		if(this.playing) {
			state.field = this.field.stones;
			state.turn = this.nextTurn;
		}
			
		return state;
	};
	
}

function Player(stone, color, wins) {

	this.color = color;
	this.stone = stone;
	this.points = 0;
	this.wins = wins;
	this.socket = null;
	this.connected = false;
	
	this.connect = function(socket) {
		
		this.socket = socket;
		this.connected = true;
		
	};
	
	this.disconnect = function() {
		
		this.socket = null;
		this.connected = false;
		
	};
	
	this.send = function(msg,data) {
		
		this.socket.emit(msg,data);
		
	};

}

function Field(columnNum,rowNum) 
{	
	// error handling
	if(columnNum % 2 || rowNum % 2) {
		console.log("uneven field dimensions!");
		return false;
	}
	
	this.xsize = columnNum;
	this.ysize = rowNum;
	this.future = []; // future turn positions
	this.delta = [];
	
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
		
		this.putStone(1,hx,hy);
		this.putStone(1,hx-1,hy-1);
		this.putStone(2,hx,hy-1);
		this.putStone(2,hx-1,hy);
	
	};
	
	this.putStone = function(side,x,y) {
		
		this.stones[x][y] = side;
		this.delta.push({x:x,y:y,s:side});
		
	};
	
	this.getDelta = function() {
		
		var t = this.delta;
		this.delta = [];
		return t;
	}
	
}

function GameLogic(refField) {

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
	this.makeTurn = function(side,x,y) {
	
		var stolenStones = 0;
	
		// check all directions
		for(var d in this.dirs) {

			stolenStones += this.tryPath(side,x,y,this.dirs[d].x,this.dirs[d].y,[],false);

		}
		
		if(stolenStones > 0) this.removeFuture(x,y);
		
		return stolenStones;
	
	}
	
	this.tryPath = function(side,x,y,deltax,deltay,path,bCheck) {

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
		f.push({x:x,y:y});

	};

	this.removeFuture = function(x,y) {

		var f = this.future;
		for(var i in f) if(f[i].x == x && f[i].y == y) f.splice(i,1);

	};

	this.canTurn = function(side) {

		var x,y;

		// try possible future turns
		for (var t in this.future) {
				
				x = this.future[t].x;
				y = this.future[t].y;
				
				for(var d in this.dirs) {
						
						var r = this.tryPath(side,x,y,this.dirs[d].x,this.dirs[d].y,[],true);
						if(r == 1) return true;

				}
				
		}

		// no valid turns
		return false;
		
	};
	
}

exports.Session = Session;
exports.Player = Player;
exports.Field = Field;
exports.GameLogic = GameLogic;