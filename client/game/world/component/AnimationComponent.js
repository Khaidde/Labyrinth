var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AnimationComponent extends ECS.Component {
	constructor() {
		super(ComponentT.ANIMATION, {
			mixer: undefined,
			animations: undefined,
			transitionToActionName: Constants.NO_ANIMATION,
			currentActionName: Constants.NO_ANIMATION,
			activeAction: undefined
		});
	}
}

module.exports = AnimationComponent;
