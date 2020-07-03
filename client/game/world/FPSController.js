var Utils = require("../common/Utils");
var WorldConstants = require("../common/Constants");

//Adaptation of https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js
class FPSController {
	constructor(camera, domElement) {
		this.camera = camera;

		this.speed = 1;
		this.turnSpeed = 0.001;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;

		this.moveUp = false;
		this.moveDown = false;

		this.sprinting = false;
		this.jump = false;
		this.jumpRate = WorldConstants.MAP_BLOCK_LENGTH/30;
		this.fallInit = false;

		this.maze = [];
		this.mapWidth = 10;
		this.mapLength = 10;
		this.boundingX = WorldConstants.MAP_BLOCK_LENGTH/30;
		this.boundingZ = WorldConstants.MAP_BLOCK_LENGTH/30;
		this.boundingY = WorldConstants.PLAYER_HEIGHT_OFFSET;

		this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
		this.PI_2 = Math.PI / 2;
		this.vec = new THREE.Vector3();

		this.domElement = domElement;
		this.domElement.requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock;
		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		this.lockCallback = function(){};
		this.unlockCallback = function(){};

		this.initEvents();
	}
	dispose() {
		this.camera = null;
		this.enabled = false;
	}
	addPoseChangeListener(callback) {
		this.onPoseChange = callback;
	}
	initEvents() {
		this.enabled = true;

		document.addEventListener("pointerlockchange", Utils.bind(this, this.onPointerlockChange), false);
		document.addEventListener('mousemove', Utils.bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', Utils.bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', Utils.bind(this, this.onKeyUp), false);
	}
	initPose(x, y, z, rotX, rotY) {
		this.position = new THREE.Vector3(x, y, z);
		this.camera.position.set(x, y, z);

		this.euler.x = rotX;
		this.euler.y = rotY;
		this.camera.quaternion.setFromEuler(this.euler);

		this.onPoseChange(this.position, this.euler);
	}
	addPointLockListener(callback) {
		this.lockCallback = callback;
	}
	addPointUnlockListener(callback) {
		this.unlockCallback = callback;
	}
	onPointerlockChange() {
		if (!this.enabled) return;
		if (document.pointerLockElement === this.domElement) {
			this.lockCallback();
		} else {
			this.unlockCallback();
		}
	}
	onMouseMove(event) {
		if (!this.enabled) return;
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.euler.setFromQuaternion(this.camera.quaternion);

		this.euler.y -= movementX * this.turnSpeed;
		this.euler.x -= movementY * this.turnSpeed;

		this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

		this.camera.quaternion.setFromEuler(this.euler);

		this.isRotationChanged = true;
	}
	onKeyDown(event) {
		if (!this.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = true; break;
			case 65: /*A*/ this.moveLeft = true; break;
			case 83: /*S*/ this.moveBackward = true; break;
			case 68: /*D*/ this.moveRight = true; break;

			case 82: /*R*/ this.moveUp = true; break;
			case 70: /*F*/ this.moveDown = true; break;

			case 16: /*Shift*/ this.sprinting = true; break;
		}
	}
	onKeyUp(event) {
		if (!this.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = false; break;
			case 65: /*A*/ this.moveLeft = false; break;
			case 83: /*S*/ this.moveBackward = false; break;
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;

			case 16: /*Shift*/ this.sprinting = false; break;
		}
	}
	moveCamForward(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.vec.crossVectors(this.camera.up, this.vec);
		this.position.addScaledVector(this.vec, distance);
	}
	moveCamRight(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.position.addScaledVector(this.vec, distance);
	}
	gravity(alt, mapX, mapZ, dateTimeObj){
      var buffer1 = 0.1;
      if(alt - this.boundingY - buffer1 > this.getCellHeight(mapX,mapZ) && this.fallInit){
					if(alt - this.boundingY - buffer1 - WorldConstants.GRAVITY*(dateTimeObj.getTime()-this.fallInit) < this.getCellHeight(mapX,mapZ))
						return this.getCellHeight(mapX,mapZ)+this.boundingY;
          // console.log((dateTimeObj.getTime()));
          return alt-WorldConstants.GRAVITY*(dateTimeObj.getTime()-this.fallInit);
      }
      else if(alt - this.boundingY - buffer1 < this.getCellHeight(mapX,mapZ) && this.fallInit){
          // console.log("error");
          this.fallInit = false;
          return this.getCellHeight(mapX,mapZ)+this.boundingY;
      }
      this.fallInit = false;
      return alt;
  }
	getCellLoc(){
		var adjustedX = this.position.x+WorldConstants.MAP_BLOCK_LENGTH/2;
		var adjustedZ = this.position.z+WorldConstants.MAP_BLOCK_LENGTH/2;
		adjustedX /= WorldConstants.MAP_BLOCK_LENGTH;
		adjustedZ /= WorldConstants.MAP_BLOCK_LENGTH;
		return [Math.floor(adjustedX), Math.floor(adjustedZ)];
	}
	getCellHeight(x, z){
		return this.maze[x+z*this.mapWidth];
	}
	update(delta) {
		var previousPosition = this.position.clone();

		const diagonalSpeedAdjustment = 0.7021;
		var forwardBackMovement = (this.moveForward && !this.moveBackward) || (this.moveBackward && !this.moveForward);
		var sideMovement = (this.moveLeft && !this.moveRight) || (this.moveRight && !this.moveLeft);

		const sprintAdjustment = 2.1;
		var adjustedSpeed = this.speed * delta;
		if (this.sprinting) adjustedSpeed *= sprintAdjustment;

		if (this.moveForward && !this.moveBackward) {
			if (sideMovement) {
				this.moveCamForward(adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamForward(adjustedSpeed);
			}
		}
		if (this.moveBackward && !this.moveForward) {
			if (sideMovement) {
				this.moveCamForward(-adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamForward(-adjustedSpeed);
			}
		}

		if (this.moveLeft && !this.moveRight) {
			if (forwardBackMovement) {
				this.moveCamRight(-adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamRight(-adjustedSpeed);
			}
		}
		if (this.moveRight && !this.moveLeft) {
			if (forwardBackMovement) {
				this.moveCamRight(adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamRight(adjustedSpeed);
			}
		}

		if (this.moveUp)
			this.jump = true;

		var timer = new Date();
		var mapX = this.getCellLoc()[0];
		var mapZ = this.getCellLoc()[1];
		if(this.position.y - this.boundingY > this.getCellHeight(mapX,mapZ) && !this.fallInit){
				this.fallInit = timer.getTime();
		}
		if(this.jump){
			this.position.y += this.jumpRate;
			if(this.position.y != this.getCellHeight(mapX,mapZ)+this.boundingY)
				this.position.y += this.jumpRate;
		}
		this.position.y = this.gravity(this.position.y, mapX, mapZ, timer);
		if(this.position.y == this.boundingY+this.getCellHeight(this.getCellLoc()[0],this.getCellLoc()[1]))
			this.jump = false;



		this.isMoving = !previousPosition.equals(this.position);
		if(this.isMoving || this.isRotationChanged) {
			this.onPoseChange(this.position, this.euler);
			//if (isPositionChanged) this.camera.position.copy(this.position);
			if (this.isRotationChanged) this.isRotationChanged = false;
		}
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

module.exports = FPSController;
