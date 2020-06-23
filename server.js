var express = require("express");
var http = require("http");
var path = require("path");
var socketIO = require("socket.io");

var Constants = require("./client/game/Constants");
var Room = require("./server/Room");

var app = express();
var server = http.Server(app);
var io = socketIO(server);

var rooms = new Map();
var clientToRoomMap = new Map();

const PORT = process.env.PORT || 5000;
const ROOM_ID_MAX_LENGTH = 5;

app.set("port", PORT);
app.use("/client", express.static(__dirname + "/client"));
app.get("/", function(request, response) {
	response.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, function() {
	console.log("Starting server on port: " + PORT);
});

function removeSocket(socket) {
	var socketID = socket.id;
	var roomID = clientToRoomMap.get(socketID);
	var room = rooms.get(roomID);
	room.removePlayer(socket);

	clientToRoomMap.delete(socketID);
	if (room.size == 0) {
		rooms.delete(roomID);
	}
}

io.on("connection", function(socket) {
	socket.on(Constants.SOCKET_PLAYER_LOGIN, function(roomID, username) {
		if (clientToRoomMap.has(socket.id)) removeSocket(socket);

		if (roomID == "") roomID = Math.floor(Math.random() * Math.pow(10, ROOM_ID_MAX_LENGTH)) + "";
		socket.join(roomID);
		clientToRoomMap.set(socket.id, roomID);
		var room;
		if (!rooms.has(roomID)) {
			room = new Room(roomID, io);
			rooms.set(roomID, room);
		} else {
			room = rooms.get(roomID);
		}
		room.addPlayer(username, socket);
	});
	socket.on(Constants.SOCKET_PLAYER_LEAVE_ROOM, function() {
		if (clientToRoomMap.has(socket.id)) removeSocket(socket);
	})
	socket.on(Constants.CLIENT_POSE_CHANGE, function(x, y, z, rot_x, rot_y) {
		var roomID = clientToRoomMap.get(socket.id);
		var room = rooms.get(roomID);
		room.updatePlayerPose(x, y, z, rot_x, rot_y, socket.id);
	});
	socket.on("disconnect", function() {
		if (clientToRoomMap.has(socket.id)) removeSocket(socket);
	});
});

var lastUpdateTime = (new Date()).getTime();
setInterval(function() {
	var currentTime = (new Date()).getTime();
	var delta = currentTime - lastUpdateTime;
	rooms.forEach(function(room) {
		room.update(delta);
	});
	lastUpdateTime = currentTime;
}, 1000 / Constants.FPS);
