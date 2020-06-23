class PlayerInventory {
	constructor() {
		this.inventory = [];
	}
	addItem(item, slot) {
		this.inventory[slot] = item;
	}
}

module.exports = PlayerInventory;
