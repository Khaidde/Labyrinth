const Utils = require("../Utils");

class System {
	constructor() {
		this.entities = [];
	}
	addToManager(manager) {
		this.manager = manager;
	}
	addEntity(entity) {
		entity.addSystem(this);
		this.entities.push(entity);

		this.enter(entity);
	}
	removeEntity(entity) {
		var index = this.entities.indexOf(entity);

		if (index !== -1) {
			entity.removeSystem(this);
			Utils.splice(this.entities, index, 1);

			this.exit(entity);
		}
	}
	dispose() {
		for (let i = 0, entity; entity = this.entities[i]; i++) {
      	entity.removeSystem(this);
      	this.exit(entity);
   	}
	}
	enter(entity) {}
	test(entity) {
		console.log(this);
		throw "System requires a /'test/' function overload";
		return false;
	}
	exit(entity) {}
	postUpdate(delta) {}
	updateAll(delta) {
		this.preUpdate(delta);
    	for (let i = 0, entity; entity = this.entities[i]; i++) {
      	this.update(entity, delta);
    	}
    	this.postUpdate(delta);
	}
	update(entity) {}
	preUpdate(delta) {}
}

module.exports = System;