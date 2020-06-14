var Entity = require("./Entity");
var FPSController = require("./FPSController");

class ClientPlayer extends Entity {
	constructor(world, x = 0, y = 3.5, z = 0) {
		super(x, y, z, world);

		const MOVEMENT_SPEED = 0.02;
		const TURN_SPEED = 0.001;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.position.z = z;

		this.controller = new FPSController(this.camera, world.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
	}
	update(delta) {
		this.controller.update(delta);
	}
	render() {
		//TODO if the clientPlayer is renderer, it should be rendererd here
	}
}

module.exports = ClientPlayer;
