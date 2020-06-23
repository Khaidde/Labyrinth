class Item {
	constructor(id) {
		this.id = id;
	}
	withDisplayName(name) {
		this.name = name;
		return this;
	}
	withInventoryImage(image) {
		this.image = image;
		return this;
	}
}

module.exports = Item;
