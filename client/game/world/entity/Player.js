var EntityT = require("../../common/ecs/EntityT");

var ECS = require("../../common/ecs/ECS");

var TransformComponent = require("../component/TransformComponent");
var ModelComponent = require("../component/ModelComponent");

class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityT.PLAYER);
		this.addArrayOfComponents([
			new TransformComponent(),
			new ModelComponent()
		]);
	}
}

module.exports = Player;
