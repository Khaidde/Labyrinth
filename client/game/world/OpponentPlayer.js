var Entity = require("./Entity");

class OpponentPlayer extends Entity {
	constructor(world, x, y, z, rot_x, rot_y, name, socketID) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
		this.model = new THREE.Mesh(geometry, material);
		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
		this.world.scene.add(this.model);
	}
	updatePlayerPose(x, y, z, rot_x, rot_y) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.rot_x = rot_x;
		this.rot_y = rot_y;

		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
	}
}

module.exports = OpponentPlayer;
