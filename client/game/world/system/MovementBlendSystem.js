var Constants = require("../../common/Constants");
var LMath = require("../../common/math/LMath");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class MovementBlendSystem extends ECS.System {
	test(entity) {
		return entity.contains(ComponentT.ANIMATION)
			&& entity.contains(ComponentT.MOVE_BLEND);
	}
	enter(entity) {
		var animator = entity.get(ComponentT.ANIMATION);
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);

		moveBlend.idleAnimation = animator.animations.get(Constants.IDLE_ANIM).play();
		moveBlend.forwardAnimation = animator.animations.get(Constants.FORWARD_ANIM).play();
		moveBlend.leftAnimation = animator.animations.get(Constants.L_STRAFE_ANIM).play();
		moveBlend.rightAnimation = animator.animations.get(Constants.R_STRAFE_ANIM).play();
	}
	update(entity, delta) {
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);

		moveBlend.deltaForward = LMath.lerp(moveBlend.deltaForward, moveBlend.targetDeltaForward, 0.2);
		moveBlend.deltaRight = LMath.lerp(moveBlend.deltaRight, moveBlend.targetDeltaRight, 0.2);

		var dF = moveBlend.dF;
		var dR = moveBlend.dR;

		var combinedDelta = Math.abs(dF) + Math.abs(dR);
		var idleWeight = 1 / (combinedDelta + 1);
		moveBlend.idleAnimation.setEffectiveWeight(moveBlend.idleWeight);

		if (Math.abs(dF) + Math.abs(dR) < moveBlend.restoreRate && moveBlend.idleWeight < 1) {
			moveBlend.idleWeight = LMath.lerp(moveBlend.idleWeight, 1, moveBlend.restoreRate / 3);
		} else if (Math.abs(dF) + Math.abs(dR) >= moveBlend.restoreRate) {
			moveBlend.idleWeight = LMath.lerp(moveBlend.idleWeight, 0, moveBlend.restoreRate);
		}
		if (moveBlend.idleWeight >= 1) {
			moveBlend.forwardAnimation.time = 0;
			moveBlend.leftAnimation.time = 0;
			moveBlend.rightAnimation.time = 0;
		}

		var forwardTime = 2 / (1 + Math.pow(5, -5 * dF)) - 1;
		var notForward = Math.abs(dR);
		moveBlend.forwardAnimation.setEffectiveTimeScale(forwardTime).setEffectiveWeight((1 - moveBlend.idleWeight) * (1 - notForward * notForward * notForward) * Math.abs(dF));

		//Calibrate timing for left animation
		var leftTime = 2 / (1 + Math.pow(5, -5 * -dR)) - 1;
		if (moveBlend.targetDeltaForward > 0.1 && -moveBlend.targetDeltaRight > 0.1) { //Forward Left
			if (forwardTime > leftTime) { //leftTime is always positive
				moveBlend.leftAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.leftAnimation.time;
			}
		} else if (-moveBlend.targetDeltaForward > 0.1 && moveBlend.targetDeltaRight > 0.1) { //Backward Right
			if (forwardTime < leftTime) { //leftTime is always negative
				moveBlend.leftAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.leftAnimation.time; //Problematic
			}
		}

		//Calibrate timing for right animation
		var rightTime = 2 / (1 + Math.pow(5, -5 * dR)) - 1;
		if (moveBlend.targetDeltaForward > 0.1 && moveBlend.targetDeltaRight > 0.1) { //Forward Right
			if (forwardTime > rightTime) {
				moveBlend.rightAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.rightAnimation.time;
			}
		} else if (-moveBlend.targetDeltaForward > 0.1 && -moveBlend.targetDeltaRight > 0.1) { //Backward Left
			if (forwardTime < rightTime) {
				moveBlend.rightAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.rightAnimation.time;
			}
		}

		if (moveBlend.targetDeltaForward > -0.1) {
			moveBlend.endDeltaRight = dR;
		} else {
			moveBlend.endDeltaRight = -dR;
		}

		moveBlend.leftAnimation.setEffectiveTimeScale(leftTime).setEffectiveWeight(LMath.lerp(moveBlend.leftAnimation.weight, -moveBlend.endDeltaRight, 0.1));
		moveBlend.rightAnimation.setEffectiveTimeScale(rightTime).setEffectiveWeight(LMath.lerp(moveBlend.rightAnimation.weight, moveBlend.endDeltaRight, 0.1));
	}
}

module.exports = MovementBlendSystem;
