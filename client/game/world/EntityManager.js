var Utils = require("../common/Utils");

const EntityManager = {
	entities: [],
	addEntity(entity) {
		this.entities[entity.id] = entity;
	},
	removeEntity(id) {
		var entity = this.entities[id];
    	if (entity != undefined) {
      	Utils.splice(this.entities, id, 1);
    	} else {
			throw "entity {" + entity + "} does not exist and can't be removed";
		}
		entity.dispose();
	},
	dispose() {
		this.entities.forEach(entity => {
			entity.dispose();
		});
	}
}

module.exports = EntityManager;
