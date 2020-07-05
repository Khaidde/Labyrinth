var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class SGLSettingsComponent extends ECS.Component {
	constructor() {
		super(ComponentT.SETTINGS, {
			turnSpeed: 0.001
		});
	}
}

module.exports = SGLSettingsComponent;
