var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class BoneAnimSystem extends ECS.System {
	test(entity) {
		return false; //entity.contains(ComponentT.BONE_ANIM);
	}
	enter(entity) {

	}
	update(entity, delta) {

	}
}

module.exports = BoneAnimSystem;
