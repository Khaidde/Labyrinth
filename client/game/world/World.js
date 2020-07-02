var Constants = require("../common/Constants");
var LMath = require("../common/Math/LMath");

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

		//Initialize players
		this.netPlayers = new Map();
		var clientPlayer = worldInfo.clientPlayer;
		this.initPlayer(worldInfo);

		this.initMap(worldInfo);
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.controller.dispose();
		this.scene.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
		this.socket.off(Constants.NET_WORLD_STATE_UPDATE);
	}
	initServerListeners() {
		var self = this;
		this.socket.on(Constants.NET_WORLD_STATE_UPDATE, function(worldInfo) {
			self.updateNetPlayers(worldInfo.players, worldInfo.removePlayerIDs);
			//Do the same for entities when they are included TODO
		});
	}
	updateNetPlayers(players, removePlayerIDs) {
		players.forEach((player) => {
			if (player.socketID == this.clientSocketID) return;
			if (this.netPlayers.get(player.socketID) == undefined) {
				var netPlayer = new NetPlayer(player.socketID, player.name, player.x, player.y, player.z, player.rot_x, player.rot_y, this);
				this.addNetPlayer(netPlayer);
				if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) this.netPlayers.get(player.socketID).insertPositionWithTime(Date.now(), player);
			} else {
				if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
					this.netPlayers.get(player.socketID).insertPositionWithTime(Date.now(), player);
				} else {
					this.netPlayers.get(player.socketID).setPlayerPose(player.x, player.y, player.z, player.rot_x, player.rot_y);
				}
			}
		});
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) {
			this.netPlayers.forEach((nPlayer) => {
				if (nPlayer.socketID == this.clientSocketID) return;
				if (!players.some((player) => {return nPlayer.socketID == player.socketID;})) {
					var player = this.netPlayers.get(nPlayer.socketID);
					player.insertPositionWithTime(Date.now(), player.positionBuffer[player.positionBuffer.length - 1].state);
				}
			});
		}
		if (removePlayerIDs != undefined) {
			removePlayerIDs.forEach((socketID) => {
				this.removeNetPlayer(socketID);
			});
		}
	}
	initPlayer(worldInfo) {
		var self = this;
		var player = worldInfo.initialWorldState.players.find((player) => {
			return player.socketID == self.clientSocketID;
		});

		const MOVEMENT_SPEED = 0.003;
		const TURN_SPEED = 0.0004;

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
		this.controller = new FPSController(this.camera, this.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
		this.controller.addPoseChangeListener((pos, rot) => {
			self.socket.emit(Constants.NET_CLIENT_POSE_CHANGE, pos.x, pos.y - Constants.PLAYER_HEIGHT_OFFSET, pos.z, rot.x, rot.y);
		});
		this.controller.initPose(player.x, player.y + Constants.PLAYER_HEIGHT_OFFSET, player.z, player.rot_x, player.rot_y);

		this.clientPlayer = new NetPlayer(player.socketID, player.name, player.x, player.y, player.z, player.rot_x, player.rot_y, this);
		this.addNetPlayer(this.clientPlayer);
		this.updateNetPlayers(worldInfo.initialWorldState.players);
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
		this.setUpMap();

		//Ambient lighting
		var ambient_light = new THREE.AmbientLight( 0xffffff, .5 ); // soft white light
		this.scene.add( ambient_light );

		//Directional lighting
		var directional_light = new THREE.DirectionalLight( 0xffffff, .7 ); // soft white light
		directional_light.position.set(1, 1, 0);
		this.scene.add( directional_light );

		this.testSphere();
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
	adjustWindowSize(screenW, screenH) {
		this.screenW = screenW;
		this.screenH = screenH;
	}
	update(delta) {
		this.controller.update(delta);
		this.camera.position.copy(this.controller.position);
		this.clientPlayer.setPoseFromController(this.controller);
		this.netPlayers.forEach((nPlayer) => {
			nPlayer.update(delta);
		});
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) this.interpolateEntities();
	}
	interpolateEntities() {
		var delayedTime = Date.now() - (1000.0 / Constants.SERVER_SEND_RATE);
		var last = 0;
		var next = 1;

		this.netPlayers.forEach((nPlayer) => {
			if (nPlayer.socketID == this.clientSocketID) return;
			var buffer = nPlayer.positionBuffer;

			while(buffer.length >= 2 && buffer[next].time <= delayedTime) {
				buffer.shift();
			}

			if (buffer.length >= 2 && buffer[last].time <= delayedTime && buffer[next].time >= delayedTime) {
				var timePercent = (delayedTime - buffer[last].time) / (buffer[next].time - buffer[last].time)
				var px = LMath.lerp(buffer[last].state.x, buffer[next].state.x, timePercent);
				var py = LMath.lerp(buffer[last].state.y, buffer[next].state.y, timePercent);
				var pz = LMath.lerp(buffer[last].state.z, buffer[next].state.z, timePercent);

				var lastRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
					buffer[last].state.rot_x,
					buffer[last].state.rot_y,
					0, "YXZ"));
				var nextRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
					buffer[next].state.rot_x,
					buffer[next].state.rot_y,
					0, "YXZ"));
				var slerpRotation = new THREE.Quaternion();
				THREE.Quaternion.slerp(lastRotation, nextRotation, slerpRotation, timePercent);
				var pRot = new THREE.Euler().setFromQuaternion(slerpRotation, "YXZ");
				this.netPlayers.get(nPlayer.socketID).setPlayerPose(px, py, pz, pRot.x, pRot.y);
			}
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
}

module.exports = World;
