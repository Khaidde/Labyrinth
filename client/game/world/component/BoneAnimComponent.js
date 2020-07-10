var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class BoneAnimComponent extends ECS.Component {
	constructor() {
		super(ComponentT.BONE_ANIM, {
			boneSplices: {
				/*
				elbowL: {
					mesh: undefined, //mesh
					spliced: true, //whether or not to splice the bone
					rotationOffset: new THREE.Euler(0, 0, 0, Constnats.ROTATION_ORDER),
					inverseRotation: false
				}
				*/
			} //TODO
		});
	}
}

module.exports = BoneAnimComponent;
