// node.js modules
var repl = require('repl');
var net = require('net');

function createShell(port,objContext) {

	net.createServer(function (socket) {
	  
		var shell = repl.start({
	    	prompt: "node shell> ",
	    	input: socket,
	    	output: socket
	  	});
	  
	  	shell.on('exit', function() {
	    	socket.end();
	  	});
	  
  		for(var v in objContext) {
  			shell.context[v] = objContext[v];
  		} 
	  
	}).listen(port);
	
}

exports.createShell = createShell;