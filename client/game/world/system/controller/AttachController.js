var Controller = require("./Controller");

class AttachController extends ControllerSystem.component {
	constructor(attachedTo, entity) {
		super(entity);
		this.attachedTo = attachedTo;
	}
	withLockRot(rotX, rotY, rotZ) {
		this.lockRotX = rotX;
		this.lockRotY = rotY;
		this.lockRotZ = rotZ;
		return this;
	}
	update(delta) {
		var rotation = this.attachedTo.rotation.clone();
		if (this.lockRotX) rotation.x = this.entity.rotation.x;
		if (this.lockRotY) rotation.y = this.entity.rotation.y;
		if (this.lockRotZ) rotation.z = this.entity.rotation.z;
		this.entity.withPose(
			this.attachedTo.position.x,
			this.attachedTo.position.y,
			this.attachedTo.position.z,
			rotation.x,
			rotation.y,
			rotation.z);
	}
}
