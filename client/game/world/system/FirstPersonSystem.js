var Constants = require("../../common/Constants");
var LMath = require("../../common/math/LMath");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class FirstPersonSystem extends ECS.System {
	constructor() {
		super();
		this.vec = new THREE.Vector3();
	}
	/*
	onPoseChange(position, rotation) {
		this.entity.world.socket.emit(Constants.NET_CLIENT_POSE_CHANGE, position, rotation.toVector3());
	}*/
	moveForward(entity, distance) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		this.vec.setFromMatrixColumn(camera.matrix, 0);
		this.vec.crossVectors(camera.up, this.vec);
		entity.get(ComponentT.TRANSFORM).position.addScaledVector(this.vec, distance);
	}
	moveRight(entity, distance) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		this.vec.setFromMatrixColumn(camera.matrix, 0);
		entity.get(ComponentT.TRANSFORM).position.addScaledVector(this.vec, distance);
	}
	moveUp(entity, distance) {
		entity.get(ComponentT.TRANSFORM).position.y += distance;
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.CAMERA)
			&& entity.contains(ComponentT.AIM)
			&& entity.contains(ComponentT.ANIMATION)
			&& entity.contains(ComponentT.MOVE_BLEND);
	}
	enter(entity) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		var cameraOffset = entity.get(ComponentT.CAMERA).cameraOffset;

		camera.position.addVectors(entity.get(ComponentT.TRANSFORM).position, cameraOffset);
		camera.rotation.copy(entity.get(ComponentT.AIM).aimRotation);
		entity.get(ComponentT.AIM).aimRotation.setFromQuaternion(camera.quaternion);

		var entityRotation = entity.get(ComponentT.TRANSFORM).rotation;
		entityRotation.set(entityRotation.x, entity.get(ComponentT.AIM).aimRotation.y, entityRotation.z);
	}
	update(entity, delta) {
		var entityPosition = entity.get(ComponentT.TRANSFORM).position;
		var input = this.manager.getSingleton(ComponentT.INPUT);

		//Calculate movement
		var adjustedSpeed = delta * entity.get(ComponentT.STATS).movementSpeed;
		if (input.sprint) adjustedSpeed *= Constants.SPRINT_ADJUSTMENT;
		var moveDir = new THREE.Vector3(input.moveForward - input.moveBackward, input.moveUp - input.moveDown, input.moveRight - input.moveLeft).normalize();
		var isMoving = (moveDir.length !== 0)
		this.moveForward(entity, adjustedSpeed * moveDir.x);
		this.moveUp(entity,  adjustedSpeed * moveDir.y);
		this.moveRight(entity, adjustedSpeed * moveDir.z);
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);
		moveBlend.targetDeltaForward = moveDir.x;
		moveBlend.targetDeltaRight = moveDir.z;

		//Get camera and cammera offset
		var camera = entity.get(ComponentT.CAMERA).camera;
		var cameraOffset = entity.get(ComponentT.CAMERA).cameraOffset;

		//Calculate camera rotation
		var aimRotation = entity.get(ComponentT.AIM).aimRotation;
		var previousRotX = aimRotation.x;
		var previousRotY = aimRotation.y;
		aimRotation.y -= input.mouseMovementX * this.manager.getSingleton(ComponentT.SETTINGS).turnSpeed;
		aimRotation.x -= input.mouseMovementY * this.manager.getSingleton(ComponentT.SETTINGS).turnSpeed;
		aimRotation.x = LMath.clamp(aimRotation.x, -Constants.PI_TWO, Constants.PI_TWO);
		var isTurning = previousRotX != aimRotation.x || previousRotY != aimRotation.y;

		if(isMoving || isTurning) {
			//Send state to server
		}
		if (isMoving) {
			camera.position.addVectors(entityPosition, cameraOffset);
		}
		if (isTurning) {
			camera.rotation.copy(aimRotation);
			var entityRotation = entity.get(ComponentT.TRANSFORM).rotation;
			entityRotation.set(entityRotation.x, aimRotation.y, entityRotation.z);
		}
	}
}

module.exports = FirstPersonSystem;
