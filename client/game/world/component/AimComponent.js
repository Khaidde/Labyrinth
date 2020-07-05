var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AimComponent extends ECS.Component {
	constructor(camera) {
		super(ComponentT.AIM, {
			aimRotation: new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER)
		});
	}
}

module.exports = AimComponent;
