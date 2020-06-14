class Entity {
	constructor(x, y, z, world) {
		this.xpos = x;
		this.ypos = y;
		this.zpos = z;
		this.world = world;
	}
	update() {}
	render() {}
}

module.exports = Entity;
