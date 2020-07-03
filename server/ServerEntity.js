var ServerEntityManager = require("./ServerEntityManager");

class Vec3 {
	constructor(x = 0, y = 0, z = 0) {
		this.set(x, y, z);
	}
	set(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
	copy(vec) {
		this.x = vec.x;
		this.y = vec.y;
		this.z = vec.z;
	}
}

class ServerEntity {
	constructor(type) {
		this.type = type;
		
		this.id = ServerEntityManager.addEntity(this);

		this.position = new Vec3();
		this.rotation = new Vec3();
	}
	dispose() {
		ServerEntityManager.removeEntity(this.id);
	}
}

module.exports = ServerEntity;
