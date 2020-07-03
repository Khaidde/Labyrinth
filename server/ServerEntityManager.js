const ServerEntityManager = {
	entities: [],
	changedEntities: [], //Changed entities since last server tick
	removedEntityIDs: [],
	addEntity(entity) {
		for(var id = 0; id < this.entities.length; id++) {
			if (this.entities[id] == undefined) {
				this.entities[id] = entity;
				return id;
			}
		}
		this.entities.push(entity);
		return this.entities.length - 1;
	},
	removeEntity(id) {
		this.removedEntityIDs.push(id);
		this.entities[id] = undefined;
	},
	updateEntity(entity) {
		this.changedEntities[entity.id] = entity;
	},
	clearBuffers() {
		this.changedEntities = [];
		this.removeEntityIDS = [];
	}
}

module.exports = ServerEntityManager;
