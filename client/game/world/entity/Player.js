var EntityT = require("../../common/ecs/EntityT");

var ECS = require("../../common/ecs/ECS");

var StatsComponent = require("../component/StatsComponent");

var TransformComponent = require("../component/TransformComponent");
var ModelComponent = require("../component/ModelComponent");
var AnimationComponent = require("../component/AnimationComponent");

var AimComponent = require("../component/AimComponent");

class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityT.PLAYER, [
			new TransformComponent(),

			new ModelComponent(),
			new AnimationComponent(),

			new AimComponent(),
			
			new StatsComponent()
		]);
	}
}

module.exports = Player;
