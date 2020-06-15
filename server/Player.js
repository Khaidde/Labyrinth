class Player {
	constructor(name, socketID, x = 0, y = 3.5, z = 0, rot_x = 0, rot_y = 0) {
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
	}
}

module.exports = Player;
