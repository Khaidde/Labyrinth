var Constants = require("../client/game/Constants");
var Player = require("./Player");
var MapGenerator = require("./MapGenerator");

class Room {
	constructor(roomID, io) {
		this.roomID = roomID;
		this.size = 0;
		this.players = new Map();

		this.width = 15;
		this.height = 15;
		this.map = new MapGenerator(this.width, this.height).generate();

		this.io = io;
	}
	addPlayer(name, socket) {
		var socketID = socket.id;
		if (!this.players.has(socketID)) {
			console.log(name + " has joined the room (" + this.roomID + ")");
			socket.emit(Constants.INITIALIZE_MAP, {
				map: this.map,
				width: this.width,
				height: this.height,
				spawnX: Math.random() * this.width * Constants.MAP_BLOCK_LENGTH,
				spawnZ: Math.random() * this.height * Constants.MAP_BLOCK_LENGTH,
				spawnY: Constants.MAP_BLOCK_LENGTH
			});
			this.players.forEach((oPlayer) => {
				socket.emit(Constants.ADD_PLAYER, oPlayer.x, oPlayer.y, oPlayer.z, oPlayer.rot_x, oPlayer.rot_y, oPlayer.name, oPlayer.socketID);
			});

			var player = new Player(name, socketID);
			this.players.set(socketID, player);
			this.size++;

			socket.to(this.roomID).emit(Constants.ADD_PLAYER, player.x, player.y, player.z, player.rot_x, player.rot_y, name, socketID);
		} else {
			throw "player {" + socketID + "} already exists";
		}
		console.log(this.createState());
	}
	removePlayer(socket) {
		var socketID = socket.id;
		if (this.players.has(socketID)) {
			console.log(this.players.get(socketID).name + " has left the room (" + this.roomID + ")");
      	this.players.delete(socketID);
			this.size--;
			socket.to(this.roomID).emit(Constants.REMOVE_PLAYER, socketID);
   	} else {
			throw "player {" + socketID + "} does not exist and can't be removed";
		}
	}
	getPlayerBySocketID(socketID) {
		if (this.players.has(socketID)) {
			return this.players.get(socketID);
		}
	}
	getPlayerByUsername(username) {
		return players.values().find(function(player) {
			return player.name == username;
		});
	}
	updatePlayerPosition(x, y, z, rot_x, rot_y, socketID) {
		var player = this.players.get(socketID);
		player.updatePlayerPose(x, y, z, rot_x, rot_y);
		this.io.in(this.roomID).emit(Constants.SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION, x, y, z, rot_x, rot_y, socketID);
	}
	update() {
		this.players.forEach(() => {

		})
	}
	createState() {
		var state = {
			players: Array.from(this.players.values())
		}
		return state;
	}
}

module.exports = Room;
