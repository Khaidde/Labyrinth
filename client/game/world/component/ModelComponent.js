var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class ModelComponent extends ECS.Component {
	constructor() {
		super(ComponentT.MODEL, {
			assetName: "",
			modelInfo: undefined,
			mesh: undefined,
			isVisible: true,
			modelOffset: new THREE.Vector3(0, 0, 0)
		});
	}
}

module.exports = ModelComponent;
