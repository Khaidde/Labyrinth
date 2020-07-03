var Constants = require("../../../common/Constants");
var EntityType = require("../../../common/EntityType");

var NetPlayer = require("../../NetPlayer");

var EntityManager = require("../../EntityManager");

class ControllerComponent {
	constructor(entity) {
		this.entity = entity;

		this.position = new THREE.Vector3();
		this.rotation = new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER);

		ControllerSystem.controllers[entity.id] = this;
		console.log(ControllerSystem.controllers);
	}
	update(delta) {
		this.player.updatePlayerPose(this.position.x, this.position.y, this.position.z, this.rotation.x, this.rotation.y);
	}
}

const ControllerSystem = {
	init(world) {
		this.world = world;
		this.world.socket.on(Constants.NET_WORLD_STATE_UPDATE, function(worldInfo) {
			ControllerSystem.updateServerEntityPoses(worldInfo.entities, worldInfo.removedEntityIDs);
		});

		this.controllers = []
		this.serverControllers = []
	},
	dispose() {
		this.controllers.forEach(controller => {
			controller.dispose();
		});
		this.world.socket.off(Constants.NET_WORLD_STATE_UPDATE);
	},
	update(delta) {
		this.controllers.forEach(controller => {
			controller.update(delta);
		});
	},
	updateServerEntityPoses(entities, removedEntityIDs) {
		var entitiesOnClient = EntityManager.entities;

		entities.forEach(entityOnServer => {
			var entityOnClient = EntityManager.entities[entityOnServer.id];

			if (entityOnClient == undefined) { //Make new entity
				var newEntity;
				var sController;
				switch(entityOnServer.type) {
				case EntityType.PLAYER:
					newEntity = new NetPlayer(entityOnServer.id, this.world, entityOnServer.socketID, entityOnServer.name);
					newEntity.setPosition(entityOnServer.position);
					newEntity.setRotation(entityOnServer.rotation);

					sController = new ServerPlayerController(newEntity);
					sController.position.copy(entityOnServer.position);
					sController.rotation.set(entityOnServer.rotation.x, entityOnServer.rotation.y, entityOnServer.rotation.z);
					newEntity.withController(sController);

					this.world.addNetPlayer(newEntity);
					break;
				default:
					throw "Entity type undefined: " + entityOnServer.type;
					break;
				}
				EntityManager.addEntity(newEntity);
				if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) sController.insertPositionWithTime(Date.now(), entityOnServer);
				var newEntity = new Entity();
			} else { //Update existing entity
				var sController = this.serverControllers[entityOnClient.id];
				if (sController != undefined) { //If the entity is not "Server controlled" then don't update it
					if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
						sController.insertPositionWithTime(Date.now(), entityOnServer);
					} else {
						entityOnClient.position.set(entityOnServer.position);
						entityOnClient.rotation.set(entityOnServer.rotation);
					}
				}
			}
		});
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
			/* TODO delete
			this.world.netPlayers.forEach((nPlayer) => {
				if (nPlayer.socketID == this.world.clientSocketID) return;
				if (!players.some((player) => {return nPlayer.socketID == player.socketID;})) {
					var player = this.world.netPlayers.get(nPlayer.socketID);
					player.insertPositionWithTime(Date.now(), player.positionBuffer[player.positionBuffer.length - 1].state);
				}
			});*/

			this.serverControllers.forEach((sController) => {
				if (!entitiesOnClient.some(entityOnServer => {return sController.entity.id == entityOnServer.id;})) {
					sController.insertPositionWithTime(Date.now(), sController.positionBuffer[player.positionBuffer.length - 1].state);
				}
			});
		}
		if (removedEntityIDs != undefined) {
			removedEntityIDs.forEach(id => {
				EntityManager.removeEntity(id);
			});
		}
	}
}

module.exports = {system: ControllerSystem, component: ControllerComponent};
