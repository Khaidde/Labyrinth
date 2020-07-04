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
	constructor(type, room) {
		this.type = type;
		this.room = room;

		this.id = room.addEntity(this);

		this.position = new Vec3();
		this.rotation = new Vec3();
	}
	dispose() {
		this.room.removeEntity(this);
	}
	createState() {
		return{
			type: this.type,
			id: this.id,
			position: this.position,
			rotation: this.rotation
		};
	}
}

module.exports = ServerEntity;
