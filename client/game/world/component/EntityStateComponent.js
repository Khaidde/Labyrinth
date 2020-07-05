var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class EntityStateComponent extends ECS.Component { //TODO Think about whether or not this component is necessary
	constructor() {
		super(ComponentT.ENTITY_STATE, {
			isMoving: false,
			isTurning: false,

			//TODO potential data points which don't seem too good...
			isAttacking: false,
			isTakingDamage: false //not very useful...
		});
	}
}

module.exports = EntityStateComponent;
