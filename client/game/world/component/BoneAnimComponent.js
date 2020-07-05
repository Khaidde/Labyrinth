var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class BoneAnimComponent extends ECS.Component {
	constructor() {
		super(ComponentT.BONE_ANIM, {
			boneSplices: {} //TODO
		});
	}
}

module.exports = BoneAnimComponent;
