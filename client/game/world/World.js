var Constants = require("../Constants");

var Entity = require("./Entity");
var ClientPlayer = require("./ClientPlayer");
var OpponentPlayer = require("./OpponentPlayer");
var BufferMapBlock = require("./BufferMapBlock");

class World {
	constructor (map, width, height, socket) {
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

		//Initilize the scene and renderer
		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: false });
		this.renderer.shadowMap.enabled = true;

		this.domElement = this.renderer.domElement;
		document.body.appendChild(this.domElement);

		this.initMap(map, width, height);

		this.socket = socket;
		var self = this;
		socket.on(Constants.ADD_PLAYER, function(x, y, z, rot_x, rot_y, name, socketID) {
			var opponentPlayer = new OpponentPlayer(self, x, y, z, rot_x, rot_y, name, socketID);
			self.addOpponentPlayer(opponentPlayer);
			console.log(name + " has joined!");
		});
		socket.on(Constants.REMOVE_PLAYER, function(socketID) {
			console.log(self.opponentPlayers.get(socketID).name + " has left!");
			self.removeOpponentPlayer(socketID);
		});
		socket.on(Constants.SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION, function(x, y, z, rot_x, rot_y, socketID) {
			if (socketID == socket.id) return;
			self.opponentPlayers.get(socketID).updatePlayerPose(x, y, z, rot_x, rot_y);
		});
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.player.controller.dispose();
		this.scene.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
		this.socket.off(Constants.ADD_PLAYER);
		this.socket.off(Constants.REMOVE_PLAYER);
		this.socket.off(Constants.SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION);
	}
	initMap(map, width, height) {
		//Map mesh
		var mat = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors, side: THREE.FrontSide});
		var mapMesh = new THREE.Mesh(this.bufferMapGeom, mat);
		mapMesh.receiveShadow = true;
		mapMesh.castShadow = false;
		this.scene.add(mapMesh);
		this.map = map;
		this.interpretMap(map, width, height);
		this.setUpMap();

		//Ambient lighting
		var ambient_light = new THREE.AmbientLight( 0xffffff, .5 ); // soft white light
		this.scene.add( ambient_light );

		//Add player
		this.player = new ClientPlayer(this);
		this.opponentPlayers = new Map();

		this.testSphere();
	}
	addOpponentPlayer(opponentPlayer) {
		var socketID = opponentPlayer.socketID;
		if (!this.opponentPlayers.has(socketID)) {
			this.opponentPlayers.set(socketID, opponentPlayer);
			this.size++;
		} else {
			throw "player {" + socketID + "} already exists";
		}
	}
	removeOpponentPlayer(socketID) {
		if (this.opponentPlayers.has(socketID)) {
			this.opponentPlayers.get(socketID).dispose();
      	this.opponentPlayers.delete(socketID);
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
		this.player.update(delta);
		this.opponentPlayers.forEach((oPlayer) => {
			oPlayer.updatePlayerName();
		});
	}
	render() {
		this.renderer.setClearColor(0x0a0806, 1);
      this.renderer.setPixelRatio(window.devicePixelRatio);

      this.renderer.setSize(this.screenW, this.screenH);
      this.renderer.render(this.scene, this.player.camera);
	}
	lightUp(x, y, z) {
		var pLight = new THREE.PointLight( 0xffffff, 0.5, BufferMapBlock.LENGTH);
		pLight.position.set(x, y, z);
		pLight.castShadow = false;
		this.scene.add( pLight );
	}
	testSphere(){
		var geometry = new THREE.SphereGeometry(BufferMapBlock.LENGTH/2, 50, 50 );
		var material = new THREE.MeshPhongMaterial( {wireframe:false} );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.material.color.setHex( 0xffff00 );
		mesh.castShadow = true;
		mesh.receiveShadow = false;
		mesh.position.y = BufferMapBlock.LENGTH*3/2;
		this.scene.add( mesh );
	}
	setUpMap() {
		this.bufferMapGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.positions), this.positionNumComponents));
		this.bufferMapGeom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.normals), this.normalNumComponents));
		this.bufferMapGeom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uvs), this.uvNumComponents));
		this.bufferMapGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.colors), 3, true));
		this.bufferMapGeom.setIndex(this.indices);
	}
	interpretMap(map, width, height) {
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var l, r, t, b;

				if (map[x + y * width] == undefined)
					continue;

				if (y == 0) {
					t = BufferMapBlock.LENGTH - map[x + y * width];
					b = map[x + (y + 1) * width] - map[x + y * width];
				} else if (y == height - 1) {
					t = map[x + (y - 1) * width] - map[x + y * width];
					b = BufferMapBlock.LENGTH - map[x + y * width];
				} else {
					t = map[x + (y - 1) * width] - map[x + y * width];
					b = map[x + (y + 1) * width] - map[x + y * width];
				}

				if (x == 0) {
					l = BufferMapBlock.LENGTH - map[x + y * width];
					r = map[(x + 1) + y * width] - map[x + y * width];
				} else if (x == width - 1) {
					l = map[(x - 1) + y * width] - map[x + y * width];
					r = BufferMapBlock.LENGTH - map[x + y * width];
				} else {
					l = map[(x - 1) + y * width] - map[x + y * width];
					r = map[(x + 1) + y * width] - map[x + y * width];
				}
				new BufferMapBlock(l, r, t, b, x*BufferMapBlock.LENGTH, y*BufferMapBlock.LENGTH, map[x + y * width], this).create();
			}
		}
	}
}

module.exports = World;
