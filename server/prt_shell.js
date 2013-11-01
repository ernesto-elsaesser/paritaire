// node.js modules
var repl = require('repl');
var repl = require('net');

function createShell(port,objContext) {

	var shell;

	net.createServer(function (socket) {
	  
	  shell = repl.start({
	    prompt: "node shell> ",
	    input: socket,
	    output: socket
	  }).on('exit', function() {
	    socket.end();
	  });
	}).listen(port);

	for(var v in objContext) {
		shell.context[v] = objContext[v];
	}
	
	return shell;
	
}

exports.createShell = createShell;