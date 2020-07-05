var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AnimationSystem extends ECS.System {
	constructor(scene) {
		super();
		this.scene = scene;
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.MODEL)
			&& entity.contains(ComponentT.ANIMATION);
	}
	enter(entity) {
		var animator = entity.get(ComponentT.ANIMATION);
		var modelInfo = entity.get(ComponentT.MODEL).modelInfo;

		animator.mixer = modelInfo.mixer;
		animator.animations = modelInfo.animations;
		modelInfo.compileClips();
	}
	update(entity, delta) {
		var animator = entity.get(ComponentT.ANIMATION);
		if (animator.transitionToActionName !== Constants.NO_ANIMATION) {
			if (animator.currentActionName === Constants.NO_ANIMATION) {
				animator.activeAction = animator.animations.get(animator.transitionToActionName);
				animator.activeAction.play();
			} else {
				//Fade to action
			}
			animator.transitionToActionName = Constants.NO_ANIMATION;
		}
		animator.mixer.update(delta * 0.001); //Convert from ms to seconds
	}
}

module.exports = AnimationSystem;
