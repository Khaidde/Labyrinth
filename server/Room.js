var Constants = require("../client/game/common/Constants");
var Utils = require("../client/game/common/Utils");

var Player = require("./Player");

var MapGenerator = require("./MapGenerator");

class Room {
	constructor(roomID, io) {
		this.roomID = roomID;
		this.io = io;
		this.size = 0;
		this.players = new Map();

		this.entityID = 0;
		this.entities = [];
		this.changedEntities = [];
		this.removedEntityIDs = [];

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
			var player = new Player(name, socketID, this);
			player.position.set(spawnX, spawnY, spawnZ);
			player.rotation.set(spawnRotX, spawnRotY, 0);
			this.players.set(socketID, player);
			this.size++;

			socket.emit(Constants.NET_INIT_WORLD, {
				map: this.map,
				width: this.width,
				height: this.height,
				entities: this.entities.map(e => {return e.createState();})
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
			player.dispose();
      	this.players.delete(socketID);
			this.size--;
   	} else {
			throw "player {" + socketID + "} does not exist and can't be removed";
		}
	}
	addEntity(entity) {
		this.entities.push(entity);
		var id = this.entityID;
		this.entityID++;
		return id;
	}
	removeEntity(entity) {
		var index = this.entities.indexOf(entity);

    	if (index !== -1) {
      	Utils.splice(this.entities, index, 1);
    	} else {
			throw "entity {" + entity + "} does not exist and can't be removed";
		}
	}
	updatePlayerPose(position, rotation, socketID) {
		var player = this.players.get(socketID);
		player.position.copy(position);
		player.rotation.copy(rotation);
		this.changedEntities[player.id] = player;
	}
	update(delta) {
		this.totalDelta += delta;
		while (this.totalDelta >= 1000.0 / Constants.SERVER_SEND_RATE) {
			this.io.in(this.roomID).emit(Constants.NET_WORLD_STATE_UPDATE, this.createState());
			this.totalDelta -= 1000.0 / Constants.SERVER_SEND_RATE;
		}
		this.entities.forEach(() => {
			//Update entities
		})
	}
	createState() {
		var state = {
			entities: this.changedEntities.filter(e => {return e != null;}).map(e => {return e.createState();}),
			removedEntityIDs: this.removedEntityIDs
		};
		this.changedEntities = [];
		this.removedEntityIDs = [];
		return state;
	}
}

module.exports = Room;
