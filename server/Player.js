var ServerEntity = require("./ServerEntity");

var EntityType = require("../client/game/common/EntityType");

class Player extends ServerEntity {
	constructor(name, socketID) {
		super(EntityType.PLAYER);
		this.name = name;
		this.socketID = socketID;
	}
	/*
	constructor(name, socketID, x, y, z, rot_x, rot_y) {
		this.name = name;
		this.socketID = socketID;

		this.updatePlayerPose(x, y, z, rot_x, rot_y);
	}
	updatePlayerPose(x, y, z, rot_x, rot_y) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.rot_x = rot_x;
		this.rot_y = rot_y;
	}*/
}

module.exports = Player;
