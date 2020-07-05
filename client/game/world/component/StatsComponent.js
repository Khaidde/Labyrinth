var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class StatsComponent extends ECS.Component {
	constructor() {
		super(ComponentT.STATS, {
			health: 0,
			physicalDmg: 0,
			critChance: 0,
			attackSpeed: 0,

			stamina: 0,
			movementSpeed: 0,

			shield: 0,
			physicalDef: 0,
			techDef: 0
		});
	}
}

module.exports = StatsComponent;
