var ComponentT = require("../../common/ecs/ComponentT");

var Assets = require("../../Assets");

var ECS = require("../../common/ecs/ECS");

class RenderSystem extends ECS.System {
	constructor(scene) {
		super();
		this.scene = scene;
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.MODEL);
	}
	enter(entity) {
		var pos = entity.get(ComponentT.TRANSFORM).position;
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).modelInfo = Assets.get(entity.get(ComponentT.MODEL).assetName).createClone();
		entity.get(ComponentT.MODEL).mesh = entity.get(ComponentT.MODEL).modelInfo.mesh;
		entity.get(ComponentT.MODEL).mesh.position.set(pos.x, pos.y, pos.z);
		this.scene.add(entity.get(ComponentT.MODEL).mesh);
	}
	update(entity) {
		var transform = entity.get(ComponentT.TRANSFORM);
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).mesh.position.addVectors(transform.position, entity.get(ComponentT.MODEL).modelOffset);
		entity.get(ComponentT.MODEL).mesh.rotation.copy(transform.rotation);
	}
	exit(entity) { //Called when the entity is removed from the system
		this.scene.remove(entity.get(ComponentT.MODEL).mesh);
	}
}

module.exports = RenderSystem;
