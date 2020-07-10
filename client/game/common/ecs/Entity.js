const Utils = require("../Utils");
const EntityT = require("./EntityT");

class Entity {
	constructor(id, type, components=[]) {
		this.id = id;
		this.type = type ? type : EntityT.GENERIC;

		this.systemsDirty = false;

		this.systems = [];
		this.components = {};
		for (var i = 0, component; component = components[i]; i++) {
			this.components[component.type] = component.data;
		}
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
			console.log(system);
			throw "entity {" + this.id + "," + this.type + "} does not contain system {" + system + "}";
		}
	}
	addComponent(component) {
		this.components[component.type] = component.data;
		this.setSystemsDirty();
	}
	addArrayOfComponents(components) {
		for (var i = 0, component; component = components[i]; i++) {
			this.components[component.type] = component.data;
		}
		this.setSystemsDirty();
	}
	removeComponent(type) {
		if (!this.components[type]) {
			throw "entity {" + this.id + "," + this.type + "} does not contain component {" + type + "}";
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