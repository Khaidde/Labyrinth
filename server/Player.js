var ServerEntity = require("./ServerEntity");

var EntityType = require("../client/game/common/EntityType");

class Player extends ServerEntity {
	constructor(name, socketID, room) {
		super(EntityType.PLAYER, room);
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
