var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class CameraComponent extends ECS.Component {
	constructor(camera) {
		super(ComponentT.CAMERA, {
			camera: camera,
			cameraOffset: new THREE.Vector3(0, 0, 0)
		});
	}
}

module.exports = CameraComponent;
