var ControllerSystem = require("./ControllerSystem");

class ServerController extends ControllerSystem.component {
	constructor(entity) {
		super(entity);
		ControllerSystem.serverControllers[entity.id] = this;
		this.positionBuffer = [];
	}
	insertPositionWithTime(timestamp, state) {
		this.positionBuffer.push({
			time: timestamp,
			state: state
		})
	}
	update(delta) {
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) this.interpolatePlayerPose();
	}
	interpolatePlayerPose() {
		var delayedTime = Date.now() - (1000.0 / Constants.SERVER_SEND_RATE);
		var last = 0;
		var next = 1;

		var buffer = this.positionBuffer;

		while(buffer.length >= 2 && buffer[next].time <= delayedTime) {
			buffer.shift();
		}

		if (buffer.length >= 2 && buffer[last].time <= delayedTime && buffer[next].time >= delayedTime) {
			var timePercent = (delayedTime - buffer[last].time) / (buffer[next].time - buffer[last].time)
			var px = LMath.lerp(buffer[last].state.x, buffer[next].state.x, timePercent);
			var py = LMath.lerp(buffer[last].state.y, buffer[next].state.y, timePercent);
			var pz = LMath.lerp(buffer[last].state.z, buffer[next].state.z, timePercent);

			var lastRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
				buffer[last].state.rot_x,
				buffer[last].state.rot_y,
				0, "YXZ"));
			var nextRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
				buffer[next].state.rot_x,
				buffer[next].state.rot_y,
				0, "YXZ"));
			var slerpRotation = new THREE.Quaternion();
			THREE.Quaternion.slerp(lastRotation, nextRotation, slerpRotation, timePercent);
			var pRot = new THREE.Euler().setFromQuaternion(slerpRotation, "YXZ");
			this.entity.updatePlayerPose(px, py, pz, pRot.x, pRot.y);
		}
	}
}

module.exports = ServerController;
