const Utils = require("../Utils");

const Entity = require("./Entity");
const Component = require("./Component");
const System = require("./System");

//Adaption of https://github.com/yagl/ecs
class Manager {
	constructor() {
		this.entities = [];
		this.systems = [];

		this.archetypes = [];

		this.entitiesSystemsDirty = [];
	}
	getEntityById(id) {
   	for (var i = 0, entity; entity = this.entities[i]; i++) {
      	if (entity.id === id) {
        		return entity;
      	}
    	}
    	return null;
	}
  	addEntity(entity) {
   	this.entities.push(entity);
    	entity.addToManager(this);
  	}
	removeEntityById(id) {
		for (var i = 0, entity; entity = this.entities[i]; i++) {
			if (entity.id === entityId) {
      		entity.dispose();
        		this.removeEntityFromDirty(entity);
        		Utils.splice(this.entities, i, 1);
      		return entity;
   		}
		}
	}
  	removeEntity(entity) {
   	var index = this.entities.indexOf(entity);
    	var entityRemoved = null;

    	if (index !== -1) {
      	entityRemoved = this.entities[index];

      	entity.dispose();
      	this.removeEntityFromDirty(entityRemoved);
      	Utils.splice(this.entities, index, 1);
    	}

    	return entityRemoved;
	}
	removeEntityFromDirty(entity) {
    	var index = this.entitiesSystemsDirty.indexOf(entity);

    	if (index !== -1) {
	      Utils.splice(this.entities, index, 1);
   	}
  	}
	addSystem(system) {
		this.systems.push(system);

		for (var i = 0, entity; entity = this.entities[i]; i++) {
   		if (system.test(entity)) {
      		system.addEntity(entity);
      	}
    	}
	}
	addArrayOfSystems(systems) {
		for (var i = 0, system; system = systems[i]; i++) {
			this.addSystem(system);
		}
	}
	removeSystem(system) {
		var index = this.systems.indexOf(system);

		if (index !== -1) {
			Utils.splice(this.systems, index, 1);
			system.dispose();
		}
	}
	createEntity(typeName, id) {
		var constructor = this.archetypes[typeName];
		var entity = new constructor(id);
		this.addEntity(entity);
		return entity;
	}
	addEntityArchetype(typeName, archetype) {
		this.archetypes[typeName] = archetype;
	}
	removeEntityArchetype(typeName) {
		if (!this.archetypes[typeName]) {
			throw "archetype {" + typeName + "} does not exist";
			return;
		}
		this.archetypes[typeName] = undefined;
	}
	dispose() {
		for (var i = 0, system; system = this.systems[0]; i++) {
      	this.removeSystem(system);
    	}
		for (var i = 0, entity; entity = this.entities[0]; i++) {
      	this.removeEntity(entity);
    	}
	}
	update(delta) {
		for (var i = 0, system; system = this.systems[i]; i++) {
			if (this.entitiesSystemsDirty.length) {
				this.cleanEntitySystems();
			}
			system.updateAll(delta);
		}
	}
	cleanEntitySystems() {
		for (let i = 0, entity; entity = this.entitiesSystemsDirty[i]; i++) {
      	for (let s = 0, system; system = this.systems[s]; s++) {
        		var index = entity.systems.indexOf(system);
        		var entityTest = system.test(entity);

				if (index === -1 && entityTest) {
					system.addEntity(entity);
				} else if (index !== -1 && !entityTest) {
					system.removeEntity(entity);
				}
			}
			entity.systemsDirty = false;
   	}
    	this.entitiesSystemsDirty = [];
	}
}

module.exports = {
	Manager: Manager,
	Entity: Entity,
	Component: Component,
	System: System
}
