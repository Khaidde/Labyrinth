const Player = require("./Player");
var MapGenerator = require("./MapGenerator");

class Room {
	constructor(roomID) {
		this.roomID = roomID;
		this.players = new Map();

		this.size = 0;
	}
	addPlayer(name, socketID) {
		if (!this.players.has(socketID)) {
			var player = new Player(name , socketID);
			this.players.set(socketID, player);
			this.size++;
		} else {
			throw "player {" + socketID + "} already exists";
		}
	}
	removePlayer(socketID) {
		if (this.players.has(socketID)) {
      	this.players.delete(socketID);
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
	update() {

	}
	render() {

	}
}

module.exports = Room;
