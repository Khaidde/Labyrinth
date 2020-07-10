var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class MovementBlendComponent extends ECS.Component {
	constructor() {
		super(ComponentT.MOVE_BLEND, {
			deltaForward: 0,
			deltaRight: 0,
			targetDeltaForward: 0,
			targetDeltaRight: 0,
			idleWeight: 1,
			restoreRate: 0.08,
			endDeltaRight : 0,
			idleAnimation: undefined,
			forwardAnimation: undefined,
			leftStrafeAnimation: undefined,
			rightStrafeAnimation: undefined
		});
	}
}

module.exports = MovementBlendComponent;
