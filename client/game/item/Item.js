class Item {
	constructor(id) {
		this.id = id;
		this.displyName = "undefined";
		this.modelName = "GenericItem";

		this.modifiers = [];
	}
	withDisplayName(name) {
		this.displayName = name;
		return this;
	}
	withModelName(name) {
		this.modelName = name;
		return this;
	}
	withModifiers(modifiers) {
		modifiers.forEach(modifier => {
			this.addModifier(modifier);
		});

		return this;
	}
	addModifier(modifier) {
		this.modifiers.push(modifier);
	}
	onUse(player) {} //(Active) When the player clicks left or right mouse button
	onUpdate(player) {} //(Passive) Constantly call this function while in the player's inventory
	onRetrieved(player) {} //Called when item enters the player's inventory
	onRemoved(player) {} //Called when item is removed from the player's inventory
	createState() {
		var state = {
			id: this.id,
			modifiers: []
		}
		this.modifiers.forEach(modifier => {
			state.modifiers.push(modifier.createState());
		});
		return state;
	}
}

module.exports = Item;
