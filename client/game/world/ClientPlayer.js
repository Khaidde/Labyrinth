var Constants = require("../Constants");

var Entity = require("./Entity");
var FPSController = require("./FPSController");

class ClientPlayer extends Entity {
	constructor(world, x = 0, y = 3.5, z = 0) {
		super(x, y, z, world);

		const MOVEMENT_SPEED = 0.008;
		const TURN_SPEED = 0.0004;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.position.z = z;

		this.controller = new FPSController(this.camera, world.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;

		this.controller.addPoseChangeListener((pos, rot) => {
			world.socket.emit(Constants.CLIENT_TO_SERVER_UPDATE_PLAYER_POSITION, pos.x, pos.y, pos.z, rot.x, rot.y);
			world.opponentPlayers.forEach((oPlayer) => {
          oPlayer.updatePlayerName();
      });
		});
	}
	update(delta) {
		this.controller.update(delta);
	}
}

module.exports = ClientPlayer;
