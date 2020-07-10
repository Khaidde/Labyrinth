var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AnimationSystem extends ECS.System {
	setActionAnim(entity, name) {
		var animator = entity.get(ComponentT.ANIMATION);

		var previousAction = animator.activeAction;
		animator.activeAction = animator.animations.get(name);
		animator.currentActionName = name;

		this.activeAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
		previousAction.crossFadeTo(this.activeAction, duration);
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

		/*
		this.count++;
		var walk = Math.abs(Math.sin(this.count / 300));
		if (walk > 0.5) walk = 0.5;
		var left = Math.abs(Math.cos(this.count / 300));
		if (left > 0.5) left = 0.5;
		animator.animations.get("Walk").setEffectiveWeight(walk * 2);
		animator.animations.get("StrafeLeft").setEffectiveWeight(left * 2);
		*/
		/*
		if (animator.transitionToActionName !== Constants.NO_ANIMATION) {
			if (animator.currentActionName === Constants.NO_ANIMATION) {
				animator.activeAction = animator.animations.get(animator.transitionToActionName);
				animator.activeAction.play();
				animator.currentActionName = animator.transitionToActionName;
			} else {
				//Fade to new action
				var previousAction = animator.activeAction;
				animator.activeAction = animator.animations.get(animator.transitionToActionName);

				if (animator.currentActionName !== animator.transitionToActionName) {
					previousAction.fadeOut(animator.fadeDuration);
				}

				animator.activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(animator.fadeDuration);
				animator.activeAction.play();
				animator.currentActionName = animator.transitionToActionName;
			}
			animator.transitionToActionName = Constants.NO_ANIMATION;
		}*/
		animator.mixer.update(delta * 0.001); //Convert from ms to seconds
	}
}

module.exports = AnimationSystem;
