var Constants = require("../common/Constants");
var Utils = require("../common/Utils");
var LMath = require("../common/Math/LMath");

var BufferMapBlock = require("./BufferMapBlock");

//var test = require("../common/ecs/ECSDemo");
var ECS = require("../common/ecs/ECS");
var EntityT = require("../common/ecs/EntityT");
var ComponentT = require("../common/ecs/ComponentT");

var Player = require("./entity/Player");

//Systems
var RenderSystem = require("./system/RenderSystem");

class World {
	constructor (socket, worldInfo) {
		//Initialize networking
		this.clientSocketID = socket.id;
		this.socket = socket;

		//Initialize the map mesh of points
		this.bufferMapGeom = new THREE.BufferGeometry();
		this.positions = [];
		this.normals = [];
		this.uvs = [];
		this.colors = [];
		this.positionNumComponents = 3;
		this.normalNumComponents = 3;
		this.uvNumComponents = 2;
		this.plateNum = 0;
		this.indices = [];

		//Initialize the scene and renderer
		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: false });
		this.renderer.shadowMap.enabled = true;

		this.domElement = this.renderer.domElement;
		document.body.appendChild(this.domElement);

		//Temporary camera instantiation
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
		this.camera.position.set(0, 10, 0);
		this.camera.rotation.set(0, -(Math.PI * 3 / 4), 0);
		this.scene.add(this.camera);

		this.entityManager = new ECS.Manager();
		this.entityManager.addArrayOfSystems([
			new RenderSystem(this.scene)
		]);

		this.entityManager.addEntityArchetype(EntityT.PLAYER, Player);
		var player = this.entityManager.createEntity(EntityT.PLAYER, 0);
		player.get(ComponentT.MODEL).assetName = "Player";
		player.get(ComponentT.TRANSFORM).position.set(10, 10, 5);

		//Initialize server listeners
		//this.initServerListeners();

		//Initialize players
		//this.netPlayers = new Map();
		//this.initPlayer(worldInfo);

		this.initMap(worldInfo);
	}
	dispose() {
		this.bufferMapGeom.dispose();
		//this.controller.dispose();
		this.scene.dispose();
		this.socket.off(Constants.NET_WORLD_STATE_UPDATE);

		EntityManager.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
	}
	/*
	initServerListeners() {
		this.socket.on(Constants.NET_WORLD_STATE_UPDATE, Utils.bind(this, worldInfo => {
			//this.updateNetPlayers(worldInfo.entities, worldInfo.removedEntityIDs);
			//Do the same for entities when they are included TODO
		}));
	}
	updateNetPlayers(entities, removedEntityIDs) {
		var entitiesOnClient = EntityManager.entities;

		entities.forEach(entityOnServer => {
			var entityOnClient = EntityManager.entities[entityOnServer.id];

			if (entityOnClient == undefined) { //Make new entity
				var newEntity;
				switch(entityOnServer.type) {
				case EntityT.PLAYER:
					newEntity = new NetPlayer(entityOnServer.id, this, entityOnServer.socketID, entityOnServer.name);
					newEntity.setPosition(entityOnServer.position);
					newEntity.setRotation(entityOnServer.rotation);

					this.addNetPlayer(newEntity);
					break;
				default:
					throw "Entity type undefined: " + entityOnServer.type;
					break;
				}
				if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) newEntity.insertPositionWithTime(Date.now(), entityOnServer);
			} else { //Update existing entity
				if (entityOnClient.type == EntityT.PLAYER && entityOnClient.socketID == this.clientPlayer.socketID) return;
				if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
					entityOnClient.insertPositionWithTime(Date.now(), entityOnServer);
				} else {
					entityOnClient.setPosition(entityOnServer.position);
					entityOnClient.setRotation(entityOnServer.rotation);
				}
			}
		});
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
			entitiesOnClient.forEach(entityOnClient => {
				if (entityOnClient.type == EntityT.PLAYER && entityOnClient.socketID == this.clientPlayer.socketID) return;
				if (!entities.some(entityOnServer => {return entityOnClient.id == entityOnServer.id;})) {
					entityOnClient.insertPositionWithTime(Date.now(), entityOnClient.positionBuffer[entityOnClient.positionBuffer.length - 1].state);
				}
			});
		}
		if (removedEntityIDs != undefined) {
			removedEntityIDs.forEach(id => {
				EntityManager.removeEntity(id);
			});
		}
	}
	*/
	/*
	initPlayer(worldInfo) {
		var cPlayer = worldInfo.entities.find((player) => {
			return player.socketID == this.clientSocketID;
		});

		const MOVEMENT_SPEED = 0.003;
		const TURN_SPEED = 0.0004;

		//Client Player
		this.clientPlayer = new NetPlayer(cPlayer.id, this, cPlayer.socketID, cPlayer.name);
		this.clientPlayer.setPosition(cPlayer.position);
		this.clientPlayer.setRotation(cPlayer.rotation);

		//First Person Controller
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
		this.controller = new FirstPersonController(this.camera, this.renderer.domElement, this.clientPlayer);
		this.controller.speed = MOVEMENT_SPEED; //TODO move this
		this.controller.turnSpeed = TURN_SPEED;
		this.controller.initPose(cPlayer.position.x, cPlayer.position.y, cPlayer.position.z, cPlayer.rotation.x, cPlayer.rotation.y, 0);

		this.addNetPlayer(this.clientPlayer);
	}*/
	/*
	addNetPlayer(netPlayer) {
		var socketID = netPlayer.socketID;
		if (!this.netPlayers.has(socketID)) {
			this.netPlayers.set(socketID, netPlayer);
			this.size++;
		} else {
			throw "player {" + socketID + "} already exists";
		}
	}
	removeNetPlayer(socketID) {
		if (this.netPlayers.has(socketID)) {
			this.netPlayers.get(socketID).dispose();
   		this.netPlayers.delete(socketID);
			this.size--;
   	} else {
			throw "player {" + socketID + "} does not exist and can't be removed";
		}
	}*/
	initMap(worldInfo) {
		//Map mesh
		var mat = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors, side: THREE.FrontSide});
		var mapMesh = new THREE.Mesh(this.bufferMapGeom, mat);
		mapMesh.receiveShadow = true;
		mapMesh.castShadow = false;
		this.scene.add(mapMesh);
		this.map = worldInfo.map;
		this.interpretMap(worldInfo.map, worldInfo.width, worldInfo.height);

		this.bufferMapGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.positions), this.positionNumComponents));
		this.bufferMapGeom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.normals), this.normalNumComponents));
		this.bufferMapGeom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uvs), this.uvNumComponents));
		this.bufferMapGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.colors), 3, true));
		this.bufferMapGeom.setIndex(this.indices);

		//Ambient lighting
		var ambient_light = new THREE.AmbientLight( 0xffffff, .5 ); // soft white light
		this.scene.add( ambient_light );

		//Directional lighting
		var directional_light = new THREE.DirectionalLight( 0xffffff, .7 ); // soft white light
		directional_light.position.set(1, 1, 0);
		this.scene.add( directional_light );

		//Test sphere
		var geometry = new THREE.SphereGeometry(Constants.MAP_BLOCK_LENGTH/2, 50, 50 );
		var material = new THREE.MeshPhongMaterial( {wireframe:false} );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.material.color.setHex( 0xffff00 );
		mesh.castShadow = true;
		mesh.receiveShadow = false;
		mesh.position.y = Constants.MAP_BLOCK_LENGTH*3/2;
		this.scene.add( mesh );
	}
	interpretMap(map, width, height) {
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var l, r, t, b;

				if (map[x + y * width] == undefined)
					continue;

				if (y == 0) {
					t = Constants.MAP_BLOCK_LENGTH - map[x + y * width];
					b = map[x + (y + 1) * width] - map[x + y * width];
				} else if (y == height - 1) {
					t = map[x + (y - 1) * width] - map[x + y * width];
					b = Constants.MAP_BLOCK_LENGTH - map[x + y * width];
				} else {
					t = map[x + (y - 1) * width] - map[x + y * width];
					b = map[x + (y + 1) * width] - map[x + y * width];
				}

				if (x == 0) {
					l = Constants.MAP_BLOCK_LENGTH - map[x + y * width];
					r = map[(x + 1) + y * width] - map[x + y * width];
				} else if (x == width - 1) {
					l = map[(x - 1) + y * width] - map[x + y * width];
					r = Constants.MAP_BLOCK_LENGTH - map[x + y * width];
				} else {
					l = map[(x - 1) + y * width] - map[x + y * width];
					r = map[(x + 1) + y * width] - map[x + y * width];
				}
				new BufferMapBlock(l, r, t, b, x*Constants.MAP_BLOCK_LENGTH, y*Constants.MAP_BLOCK_LENGTH, map[x + y * width], this).create();
			}
		}
	}
	updateSize(screenW, screenH) {
		this.renderer.setSize(screenW, screenH, false);
		this.camera.aspect = screenW / screenH;
		this.camera.updateProjectionMatrix();
		this.domElement = this.renderer.domElement;
	}
	update(delta) {
		this.entityManager.update(delta);
		//this.controller.update(delta);

		//if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) this.interpolateEntities();
	}
	/*
	interpolateEntities() {
		var delayedTime = Date.now() - (1000.0 / Constants.SERVER_SEND_RATE);
		var last = 0;
		var next = 1;

		EntityManager.entities.forEach(entity => {
			if (entity.type == EntityT.PLAYER && entity.socketID == this.clientPlayer.socketID) return;
			var buffer = entity.positionBuffer;

			while(buffer.length >= 2 && buffer[next].time <= delayedTime) {
				buffer.shift();
			}

			if (buffer.length >= 2 && buffer[last].time <= delayedTime && buffer[next].time >= delayedTime) {
				var timePercent = (delayedTime - buffer[last].time) / (buffer[next].time - buffer[last].time)
				var px = LMath.lerp(buffer[last].state.position.x, buffer[next].state.position.x, timePercent);
				var py = LMath.lerp(buffer[last].state.position.y, buffer[next].state.position.y, timePercent);
				var pz = LMath.lerp(buffer[last].state.position.z, buffer[next].state.position.z, timePercent);

				var lastRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
					buffer[last].state.rotation.x,
					buffer[last].state.rotation.y,
					buffer[last].state.rotation.z, "YXZ"));
				var nextRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
					buffer[next].state.rotation.x,
					buffer[next].state.rotation.y,
					buffer[next].state.rotation.z, "YXZ"));
				var slerpRotation = new THREE.Quaternion();
				THREE.Quaternion.slerp(lastRotation, nextRotation, slerpRotation, timePercent);
				var pRot = new THREE.Euler().setFromQuaternion(slerpRotation, "YXZ");
				entity.position.set(px, py, pz);
				entity.rotation.set(pRot.x, pRot.y, pRot.z);
			}
		});
	}
	*/
	render() {
		this.renderer.setClearColor(0x0a0806, 1);
   	this.renderer.setPixelRatio(window.devicePixelRatio);
   	this.renderer.render(this.scene, this.camera);
	}
	lightUp(x, y, z) {
		var pLight = new THREE.PointLight( 0xffffff, 0.5, Constants.MAP_BLOCK_LENGTH);
		pLight.position.set(x, y, z);
		pLight.castShadow = false;
		this.scene.add( pLight );
	}
}

module.exports = World;
