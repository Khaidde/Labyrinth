const Constants = require("../common/Constants");
const EntityType = require("../common/EntityType");
const ComponentType = require("../common/ComponentType");

const ECS = require("./ECS");

//_______________EXAMPLE USAGE OF ECS_______________//

//========ENTITY CLASSES========//
class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityType.PLAYER);
		this.addArrayOfComponents([
			new TransformComponent(),
			new ModelComponent()
		]);
	}
}

//========COMPONENT CLASSES========//
class TransformComponent extends ECS.Component {
	constructor() {
		super(ComponentType.TRANSFORM, {
			position: new THREE.Vector3(),
			rotation: new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER)
		});
	}
}
class ModelComponent extends ECS.Component {
	constructor() {
		super(ComponentType.MODEL, {
			assetName: ""
		});
	}
}

//========SYSTEM CLASSES========//
class MovementSystem extends ECS.System {
	test(entity) { //Test whether or not the entity's components are compatible with the system
		return entity.contains(ComponentType.TRANSFORM);
	}
	enter(entity) { //Called when the entity is added to the system
		var transform = entity.get(ComponentType.TRANSFORM);
		transform.rotation.set(10, 10, 10);
	}
	update(entity, delta) {
		var transform = entity.get(ComponentType.TRANSFORM);
		transform.position.x += 5 * delta;
		transform.position.y += 5 * delta;
	}
}
class RenderSystem extends ECS.System {
	test(entity) {
		return entity.contains(ComponentType.TRANSFORM)
			&& entity.contains(ComponentType.MODEL);
	}
	update(entity) {
		var transform = entity.get(ComponentType.TRANSFORM);
		var model = entity.get(ComponentType.MODEL);

		var pos = transform.position;
		var x = pos.x;
		var y = pos.y;
		var z = pos.z;

		//"render" the model
		console.log("Model {" + model.assetName + "} has been rendered at coordinate (" + pos.x + "," + pos.y + "," + pos.z + ")");
	}
	exit(entity) { //Called when the entity is removed from the system
		entity.get(ComponentType.MODEL).assetName = "";
		console.log("Entity model has been disposed");
		console.log(entity);
	}
}

var manager = new ECS.Manager();
manager.addArrayOfSystems([
	new MovementSystem(),
	new RenderSystem()
]);

manager.addEntityArchetype(EntityType.PLAYER, Player);

var player = new Player(5); //Assign random id of 5
player.get(ComponentType.TRANSFORM).position.set(10, 20, 30);
player.get(ComponentType.MODEL).assetName = "playerModel.gltf";
manager.addEntity(player);

var player2 = manager.createEntity(EntityType.PLAYER, 11); //Use archetype to create player with random id of 11
player2.get(ComponentType.TRANSFORM).position.set(-11, -13, -15);
player2.get(ComponentType.MODEL).assetName = "playerModel2.gltf";
manager.addEntity(player2);

const TOTAL_UPDATES = 3;
const SIMULATED_ELAPSED_TIME_MS = 5;
for (var i = 0; i < TOTAL_UPDATES; i++) {
	console.log("-----------------------");

	manager.update(SIMULATED_ELAPSED_TIME_MS);

	console.log("-----------------------");
}

//ExepectedOutput:

// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (35,45,30)
// Model {playerModel2.gltf} has been rendered at coordinate (14,12,-15)
// -----------------------
// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (60,70,30)
// Model {playerModel2.gltf} has been rendered at coordinate (39,37,-15)
// -----------------------
// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (85,95,30)
// Model {playerModel2.gltf} has been rendered at coordinate (64,62,-15)
// -----------------------
