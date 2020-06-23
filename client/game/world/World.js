var Constants = require("../Constants");

var Entity = require("./Entity");
var NetPlayer = require("./NetPlayer");
var BufferMapBlock = require("./BufferMapBlock");

var FPSController = require("./FPSController");

class World {
	constructor (socketID, socket, worldInfo) {
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

		//Initialize networking
		this.clientSocketID = socketID;
		this.socket = socket;
		this.initServerListeners();

		this.netPlayers = new Map();
		var clientPlayer = worldInfo.clientPlayer;
		this.initPlayer(worldInfo);

		this.initMap(worldInfo);

		this.worldStateBuffer = worldInfo;
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.controller.dispose();
		this.scene.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
		this.socket.off(Constants.ADD_PLAYER);
		this.socket.off(Constants.REMOVE_PLAYER);
		this.socket.off(Constants.SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION);
	}
	initServerListeners() { //TODO fix all of this
		var self = this;
		this.socket.on(Constants.WORLD_STATE_UPDATE, function(worldInfo) {
			var players = worldInfo.players;
			var world = self;
			players.forEach((player) => {
				if (player.socketID == world.clientSocketID) return;
				if (world.netPlayers.get(player.socketID) == undefined) {
					var netPlayer = new NetPlayer(player.socketID, player.name, player.x, player.y, player.z, player.rot_x, player.rot_y, world);
					world.addNetPlayer(netPlayer);
				} else {
					world.netPlayers.get(player.socketID).setPlayerPose(player.x, player.y, player.z, player.rot_x, player.rot_y);
				}
			});
			//Do the same for entities when they are included TODO
		});
	}
	initPlayer(worldInfo) {
		var self = this;
		var player = worldInfo.initialWorldState.players.find((player) => {
			return player.socketID == self.clientSocketID;
		});

		const MOVEMENT_SPEED = 0.008;
		const TURN_SPEED = 0.0004;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.controller = new FPSController(this.camera, this.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
		this.controller.initPose(player.x, player.y, player.z, player.rot_x, player.rot_y);

		this.controller.addPoseChangeListener((pos, rot) => {
			self.socket.emit(Constants.CLIENT_POSE_CHANGE, pos.x, pos.y, pos.z, rot.x, rot.y);
		});

		this.clientPlayer = new NetPlayer(player.socketID, player.name, player.x, player.y, player.z, player.rot_x, player.rot_y, this);
		this.addNetPlayer(this.clientPlayer);
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
		this.setUpMap();

		//Ambient lighting
		var ambient_light = new THREE.AmbientLight( 0xffffff, .5 ); // soft white light
		this.scene.add( ambient_light );

		this.testSphere();
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
	adjustWindowSize(screenW, screenH) {
		this.screenW = screenW;
		this.screenH = screenH;
	}
	update(delta) {
		this.controller.update(delta);
		this.netPlayers.forEach((nPlayer) => {
			if (nPlayer.socketID == this.clientSocketID) return;
			nPlayer.update(delta);
		});
	}
	render() {
		this.renderer.setClearColor(0x0a0806, 1);
      this.renderer.setPixelRatio(window.devicePixelRatio);

      this.renderer.setSize(this.screenW, this.screenH);
      this.renderer.render(this.scene, this.camera);
	}
	lightUp(x, y, z) {
		var pLight = new THREE.PointLight( 0xffffff, 0.5, Constants.MAP_BLOCK_LENGTH);
		pLight.position.set(x, y, z);
		pLight.castShadow = false;
		this.scene.add( pLight );
	}
	testSphere(){
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
	setUpMap() {
		this.bufferMapGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.positions), this.positionNumComponents));
		this.bufferMapGeom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.normals), this.normalNumComponents));
		this.bufferMapGeom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uvs), this.uvNumComponents));
		this.bufferMapGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.colors), 3, true));
		this.bufferMapGeom.setIndex(this.indices);
	}
}

module.exports = World;
