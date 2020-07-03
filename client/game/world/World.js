var Constants = require("../common/Constants");
var Utils = require("../common/Utils");
var LMath = require("../common/Math/LMath");

var Entity = require("./Entity");
var NetPlayer = require("./NetPlayer");
var BufferMapBlock = require("./BufferMapBlock");

var ControllerSystem = require("./system/controller/ControllerSystem");
var FirstPersonController = require("./system/controller/FirstPersonController");
var ServerPlayerControllerSystem = require("./system/controller/ServerController");

var EntityManager = require("./EntityManager");

class World {
	constructor(socket, worldInfo) {
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
		this.renderer.setClearColor(0x0a0806, 1);
   	this.renderer.setPixelRatio(window.devicePixelRatio);

		this.domElement = this.renderer.domElement;
		document.body.appendChild(this.domElement);

		//Init Systems
		this.systems = [
			ControllerSystem
		]
		this.systems.forEach(o => {
			o.system.init(this);
		});

		//Init Map
		this.initMap(worldInfo);

		//Initialize entities
		this.netPlayers = new Map();
		this.initPlayer(worldInfo);

		//Initialize server-player controller system
		/*
		ServerPlayerControllerSystem.init(this);
		this.socket.on(Constants.NET_WORLD_STATE_UPDATE, Utils.bind(this, function(worldInfo) {
			ServerPlayerControllerSystem.updateNetPlayers(worldInfo.players, worldInfo.removePlayerIDs);
			//Do the same for entities when they are included TODO
		}));
		ServerPlayerControllerSystem.updateNetPlayers(worldInfo.initialWorldState.players);
		*/
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.camera = null;
		this.scene.dispose();
		this.netPlayers.forEach(player => {
			player.dispose();
		});
		EntityManager.dispose();
		this.systems.forEach(o => {
			o.system.dispose();
		});
		this.domElement.parentElement.removeChild(this.domElement);
	}
	initPlayer(worldInfo) {
		var cPlayer = worldInfo.entities.find((player) => {
			return player.socketID == this.clientSocketID;
		});

		const MOVEMENT_SPEED = 0.003; //TODO move this
		const TURN_SPEED = 0.0004;

		//Client Player
		this.clientPlayer = new NetPlayer(cPlayer.id, this, cPlayer.socketID, cPlayer.name);
		this.clientPlayer.setPosition(cPlayer.position);
		this.clientPlayer.setRotation(cPlayer.rotation);

		//First Person Controller
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
		var controller = new FirstPersonController(this.camera, this.renderer.domElement, this.clientPlayer);
		controller.speed = MOVEMENT_SPEED; //TODO move this
		controller.turnSpeed = TURN_SPEED;
		controller.initPose(cPlayer.position.x, cPlayer.position.y, cPlayer.position.z, cPlayer.rotation.x, cPlayer.rotation.y, 0);
		this.clientPlayer.withController(controller);

		this.addNetPlayer(this.clientPlayer);
		EntityManager.addEntity(this.clientPlayer);
	}
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
	}
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
		ControllerSystem.system.update(delta);

		///TODO remove and replace with ECS
		this.netPlayers.forEach((nPlayer) => {
			nPlayer.update(delta);
		});
	}
	render() {
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
