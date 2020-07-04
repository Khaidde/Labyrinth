var ServerEntity = require("./ServerEntity");

var EntityT = require("../client/game/common/ecs/EntityT");

class Player extends ServerEntity {
	constructor(name, socketID, room) {
		super(EntityT.PLAYER, room);
		this.name = name;
		this.socketID = socketID;
	}
	createState() {
		return{
			type: this.type,
			id: this.id,
			position: this.position,
			rotation: this.rotation,
			name: this.name,
			socketID: this.socketID
		};
	}
}

module.exports = Player;
