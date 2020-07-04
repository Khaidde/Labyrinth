const Utils = require("../common/Utils");
const EntityType = require("../common/EntityType");

class Entity {
	constructor(id, type) {
		this.id = id;
		this.type = type ? type : EntityType.GENERIC;

		this.systemsDirty = false;

		this.components = [];
		this.systems = [];
	}
	addToManager(manager) {
		this.manager = manager;
		this.setSystemsDirty();
	}
	setSystemsDirty() {
		if (!this.systemsDirty && this.manager) {
			this.systemsDirty = true;
			this.manager.entitiesSystemsDirty.push(this);
		}
	}
	addSystem(system) {
		this.systems.push(system);
	}
	removeSystem(system) {
		var index = this.systems.indexOf(system);

		if (index !== -1) {
			Utils.splice(this.systems, index, 1);
		} else {
			throw "entity {" + this + "} does not contain system {" + system + "}";
		}
	}
	addComponent(component) {
		this.components[component.type] = component.data;
		this.setSystemsDirty();
	}
	addArrayOfComponents(components) {
		for (var i = 0, component; component = components[i]; i++) {
			this.addComponent(component);
		}
	}
	removeComponent(type) {
		if (!this.components[type]) {
			throw "entity {" + this + "} does not contain component {" + type + "}";
			return;
		}
		this.components[type] = undefined;
		this.setSystemsDirty();
	}
	dispose() {
		for (var i = 0, system; system = this.systems[0]; i++) {
      	system.removeEntity(this);
    	}
	}
	get(type) {
		return this.components[type];
	}
	contains(type) {
		return !!this.components[type];
	}
}

module.exports = Entity;
