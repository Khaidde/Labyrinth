const EntityManager = {
	entities: [],
	addEntity(id, entity) {
		this.entities[id] = entity;
	},
	removeEntity(id) {
		this.entities[id].dispose();
		this.entities[id] = undefined;
	},
	dispose() {
		entities.forEach(entity => {
			entity.dispose();
		});
	}
}

module.exports = EntityManager;
