const Player = require('./Player');

class Room {
	constructor() {
		this.players = new Map();
	}
	addPlayer(name, socketID) {
		this.players.put(socketID, player);
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
	containsUsername(username) {
		return players.values().find(function(player) {
			return player.name == username;
		}) != undefined;
	}
	update() {

	}
	render() {

	}
}

module.exports = Room;
