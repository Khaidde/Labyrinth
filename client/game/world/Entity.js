   class Entity {
	constructor(x, y, z, world) {
		this.position = new THREE.Vector3(x, y, z);
		this.world = world;

		this.positionBuffer = [];
	}
	update() {}
	render() {}
}

module.exports = Entity;
