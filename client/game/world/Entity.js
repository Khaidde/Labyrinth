class Entity {
	constructor(x, y, z, world) {
		this.position = new THREE.Vector3(x, y, z);
		this.world = world;

		this.positionBuffer = [];
	}
	insertPositionWithTime(timestamp, state) {
		this.positionBuffer.push({
			time: timestamp,
			state: state
		})
	}
	update() {}
	render() {}
}

module.exports = Entity;
