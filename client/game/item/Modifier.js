class Modifier { //https://www.youtube.com/watch?v=JgSvuSaXs3E
	constructor(id) {
		this.id = id;
		this.displyName = "undefined";
	}
	withDisplayName(name) {
		this.displayName = name;
		return this;
	}
	createState() {
		var state = {
			id: this.id
		}
		return state;
	}
}
