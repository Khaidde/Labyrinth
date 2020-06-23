class ItemEntity extends Entity {
	constructor(item, x, y, z, world) {
		super(x, y, z, world);
		this.item = item;
	}
}
