var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class SGLInputComponent extends ECS.Component {
	constructor() {
		super(ComponentT.INPUT, {
			enabled: true,

			moveForward: false,
			moveLeft: false,
			moveBackward: false,
			moveRight: false,
			moveUp: false,
			moveDown: false,
			sprint: false,
			jump: false,

			leftMouseClick: false,
			rightMouseClick: false,
			accumulatedMouseX: 0,
			accumulatedMouseY: 0,
			mouseMovementX: 0, //per 1 update tick
			mouseMovementY: 0  //per 1 update tick
		});
	}
}

module.exports = SGLInputComponent;
