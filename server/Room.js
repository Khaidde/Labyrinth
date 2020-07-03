var Constants = require("../client/game/common/Constants");

var Player = require("./Player");

var MapGenerator = require("./MapGenerator");

var ServerEntityManager = require("./ServerEntityManager");

class Room {
	constructor(roomID, io) {
		this.roomID = roomID;
		this.io = io;
		this.size = 0;
		this.players = new Map();

		this.width = 5;
		this.height = 5;
		this.map = new MapGenerator(this.width, this.height).generate();

		this.totalDelta = 0;
	}
	addPlayer(name, socket) {
		var socketID = socket.id;
		if (!this.players.has(socketID)) {
			console.log(name + " has joined the room (" + this.roomID + ")");
			let spawnX = Math.random() * this.width * Constants.MAP_BLOCK_LENGTH;
			let spawnZ = Math.random() * this.height * Constants.MAP_BLOCK_LENGTH;
			let spawnY = 0;
			let spawnRotX = 0;
			let spawnRotY = 0;
			var player = new Player(name, socketID);
			player.position.set(spawnX, spawnY, spawnZ);
			player.rotation.set(spawnRotX, spawnRotY, 0);
			this.players.set(socketID, player);
			this.size++;

			socket.emit(Constants.NET_INIT_WORLD, {
				map: this.map,
				width: this.width,
				height: this.height,
				entities: ServerEntityManager.entities
				/* TODO remove
				initialWorldState: {
					players: Array.from(this.players.values()),
				}*/
			});
		} else {
			throw "player {" + socketID + "} already exists";
		}
	}
	removePlayer(socket) {
		var socketID = socket.id;
		if (this.players.has(socketID)) {
			var player = this.players.get(socketID);
			console.log(player.name + " has left the room (" + this.roomID + ")");
			ServerEntityManager.removedEntityIDs.push(socketID);
			player.dispose();
      	this.players.delete(socketID);
			this.size--;
   	} else {
			throw "player {" + socketID + "} does not exist and can't be removed";
		}
	}
	/* TODO remove because unused
	getPlayerBySocketID(socketID) {
		if (this.players.has(socketID)) {
			return this.players.get(socketID);
		}
	}
	getPlayerByUsername(username) {
		return players.values().find(function(player) {
			return player.name == username;
		});
	}*/
	updatePlayerPose(position, rotation, socketID) {
		var player = this.players.get(socketID);
		player.position.copy(position);
		player.rotation.copy(rotation);
		ServerEntityManager.updateEntity(player);
	}
	update(delta) {
		this.totalDelta += delta;
		while (this.totalDelta >= 1000.0 / Constants.SERVER_SEND_RATE) {
			this.io.in(this.roomID).emit(Constants.NET_WORLD_STATE_UPDATE, this.createState());
			this.totalDelta -= 1000.0 / Constants.SERVER_SEND_RATE;
		}
		this.players.forEach(() => {
			//Update players
		})
	}
	createState() {
		var state = {
			entities: ServerEntityManager.changedEntities,
			removedEntityIDs: ServerEntityManager.removedEntityIDs
		}
		ServerEntityManager.clearBuffers();
		return state;
	}
}

module.exports = Room;
