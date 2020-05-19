
var socket = io();
socket.on("hello", function() {
	console.log("hello server!");
});
