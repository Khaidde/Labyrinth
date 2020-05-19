var express = require("express");
var http = require("http");
var path = require("path");
var socketIO = require("socket.io");
var fs = require("fs");

var Room = require("./server/Room");

var app = express();
var server = http.Server(app);
var io = socketIO(server);

var rooms = [];

const PORT = process.env.PORT || 5000;
const FRAME_RATE = 1000.0 / 60.0;

app.set("port", PORT);
app.use("/client", express.static(__dirname + "/client"));
app.get("/", function(request, response) {
	response.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, function() {
	console.log("Starting server on port: " + PORT);
});


io.on("connection", function(socket) {
	socket.emit("hello");
	socket.on("disconnect", function() {

	});
});

setInterval(() => {
	rooms.forEach(function(room) {
		room.update();
		room.sendState();
	});
}, FRAME_RATE);
