var EntityT = require("../../common/ecs/EntityT");

var ECS = require("../../common/ecs/ECS");

var TransformComponent = require("../component/TransformComponent");

var ModelComponent = require("../component/ModelComponent");
var AnimationComponent = require("../component/AnimationComponent");
var MovementBlendComponent = require("../component/MovementBlendComponent");

var AimComponent = require("../component/AimComponent");

var StatsComponent = require("../component/StatsComponent");

class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityT.PLAYER, [
			new TransformComponent(),

			new ModelComponent(),
			new AnimationComponent(),
			new MovementBlendComponent(),

			new AimComponent(),

			new StatsComponent()
		]);
	}
}

module.exports = Player;
