var Constants = require("../client/game/common/Constants");
var Player = require("./Player");
var MapGenerator = require("./MapGenerator");

class RoomInfo {

}

class Room {
	constructor(roomID, io) {
		this.roomID = roomID;
		this.io = io;
		this.size = 0;
		this.players = new Map();
		this.currentTickPlayerState = [];
		this.toRemovePlayerIDs = [];

		this.width = 15;
		this.height = 15;
		this.map = new MapGenerator(this.width, this.height).generate();

		this.totalDelta = 0;
	}
	addPlayer(name, socket) {
		var socketID = socket.id;
		if (!this.players.has(socketID)) {
			console.log(name + " has joined the room (" + this.roomID + ")");
			let spawnX = Math.random() * this.width * Constants.MAP_BLOCK_LENGTH;
			let spawnZ = Math.random() * this.height * Constants.MAP_BLOCK_LENGTH;
			let spawnY = Constants.MAP_BLOCK_LENGTH;
			let spawnRotX = 0;
			let spawnRotY = 0;
			var player = new Player(name, socketID, spawnX, spawnY, spawnZ, spawnRotX, spawnRotY);
			this.players.set(socketID, player);
			this.size++;

			socket.emit(Constants.INITIALIZE_MAP, socketID, {
				map: this.map,
				width: this.width,
				height: this.height,
				initialWorldState: {
					players: Array.from(this.players.values())
				}
			});
		} else {
			throw "player {" + socketID + "} already exists";
		}
	}
	removePlayer(socket) {
		var socketID = socket.id;
		if (this.players.has(socketID)) {
			console.log(this.players.get(socketID).name + " has left the room (" + this.roomID + ")");
      	this.players.delete(socketID);
			this.toRemovePlayerIDs.push(socketID);
			this.size--;
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
	updatePlayerPose(x, y, z, rot_x, rot_y, socketID) {
		var player = this.players.get(socketID);
		player.updatePlayerPose(x, y, z, rot_x, rot_y);
		this.currentTickPlayerState.push(player);
	}
	update(delta) {
		this.totalDelta += delta;
		while (this.totalDelta >= 1000.0 / Constants.SERVER_SEND_RATE) {
			this.io.in(this.roomID).emit(Constants.WORLD_STATE_UPDATE, this.createState());
			this.totalDelta -= 1000.0 / Constants.SERVER_SEND_RATE;
		}
		this.players.forEach(() => {
			//Update players
		})
	}
	createState() {
		var state = {
			players: this.currentTickPlayerState,
			removePlayerIDs: this.toRemovePlayerIDs
		}
		this.currentTickPlayerState = [];
		this.toRemovePlayerIDs = [];
		return state;
	}
}

module.exports = Room;
