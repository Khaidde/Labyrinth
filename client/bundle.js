(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Constants = {
	FPS: 60,
	SOCKET_PLAYER_LOGIN: "socket_player_login"
}

module.exports = Constants;

},{}],2:[function(require,module,exports){
class MapGenerator {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.cellW = (width - 1) / 2;
		this.cellH = (width - 1) / 2;
	}
	static get WALL_HEIGHT() { return 5; }
	static get FLOOR_HEIGHT() { return 0; }
	generate() {
		this.randH = Math.random() * MapGenerator.WALL_HEIGHT;


		if (this.width % 2 == 0 || this.height % 2 == 0) {
			throw "width and height of map must be odd";
		}
		this.map = [];
		for (var y = 0; y < this.height; y++) {
			for (var x = 0; x < this.width; x++) {
				this.randH = Math.random() * MapGenerator.WALL_HEIGHT;
				this.setMap(x, y, this.randH);
			}
		}
		var randX = Math.floor(Math.random() * this.cellW);
		var randY = Math.floor(Math.random() * this.cellH);
		this.iterateMazeGeneration(randX, randY, []);

		/*
		var rX;
		var rY;
		for (var i = 0; i < 10; i++) {
			rX = Math.floor(Math.random() * this.cellW);
			rY = Math.floor(Math.random() * this.cellH) + (rX + 1) % 2;
			this.setMap(rX * 2 + 1, rY * 2, MapGenerator.FLOOR_HEIGHT);
		}

		for (var yi = 0; yi < this.height; yi++) {
			for (var xi = 0; xi < this.width; xi++) {
				if (this.getMap(xi, yi) == MapGenerator.WALL_HEIGHT) {
					if (this.getMap(xi + 1, yi) == MapGenerator.FLOOR_HEIGHT) {
						if (this.getMap(xi - 1, yi) == MapGenerator.FLOOR_HEIGHT) {
							if (this.getMap(xi, yi + 1) == MapGenerator.FLOOR_HEIGHT) {
								if (this.getMap(xi, yi - 1) == MapGenerator.FLOOR_HEIGHT) {
									this.setMap(xi, yi, MapGenerator.FLOOR_HEIGHT);
								}
							}
						}
					}
				}
			}
		}

		this.createRoom(11, 11, 7, 7);
		*/

		return this.map;
	}
	iterateMazeGeneration(cellX, cellY, adjacentMap) {
		this.setMap(cellX * 2 + 1, cellY * 2 + 1, MapGenerator.FLOOR_HEIGHT);

		if (cellX - 1 >= 0 && !adjacentMap.includes(cellX - 1 + cellY * this.cellW)
			&& this.getMap((cellX - 1) * 2 + 1, cellY * 2 + 1,) != MapGenerator.FLOOR_HEIGHT) adjacentMap.push(cellX - 1 + cellY * this.cellW);
		if (cellX + 1 < this.cellW && !adjacentMap.includes(cellX + 1 + cellY * this.cellW)
			&& this.getMap((cellX + 1) * 2 + 1, cellY * 2 + 1,) != MapGenerator.FLOOR_HEIGHT) adjacentMap.push(cellX + 1 + cellY * this.cellW);
		if (cellY - 1 >= 0 && !adjacentMap.includes(cellX + (cellY - 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY - 1) * 2 + 1,) != MapGenerator.FLOOR_HEIGHT) adjacentMap.push(cellX + (cellY - 1) * this.cellW);
		if (cellY + 1 < this.cellH && !adjacentMap.includes(cellX + (cellY + 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY + 1) * 2 + 1,) != MapGenerator.FLOOR_HEIGHT) adjacentMap.push(cellX + (cellY + 1) * this.cellW);

		if (adjacentMap.length == 0) return;

		var randNewMark = adjacentMap.splice(Math.floor(Math.random() * adjacentMap.length), 1)[0];
		var newMarkX = randNewMark % this.cellW;
		var newMarkY = Math.floor(randNewMark / this.cellW);

		var neighbors = this.findOpenNeighbors(newMarkX, newMarkY);
		var randNeighbor = neighbors.splice(Math.floor(Math.random() * neighbors.length), 1)[0];
		this.setMap(((randNeighbor % this.cellW) + newMarkX) + 1, ((Math.floor(randNeighbor / this.cellW)) + newMarkY) + 1, MapGenerator.FLOOR_HEIGHT);

		this.iterateMazeGeneration(newMarkX, newMarkY, adjacentMap);
	}
	findOpenNeighbors(cellX, cellY) {
		var neighbors = [];
		if (cellX - 1 >= 0
			&& this.map[((cellX - 1) * 2 + 1) + (cellY * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX - 1 + cellY * this.cellW);
		if (cellX + 1 < this.cellW
			&& this.map[((cellX + 1) * 2 + 1) + (cellY * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + 1 + cellY * this.cellW);
		if (cellY - 1 >= 0
			&& this.map[(cellX * 2 + 1) + ((cellY - 1) * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + (cellY - 1) * this.cellW);
		if (cellY + 1 < this.cellH
			&& this.map[(cellX * 2 + 1) + ((cellY + 1) * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + (cellY + 1) * this.cellW);
		return neighbors;
	}
	createRoom(x, y, roomWidth, roomHeight) {
		if (x < 0 || x + roomWidth >= this.width || y < 0 || y + roomHeight >= this.height) {
			throw "invalid room creation of position (" + x + "," + y + ") with width: " + roomWidth + ", height: " + roomHeight;
		}
		for (var yo = 0; yo < roomHeight; yo++) {
			for (var xo = 0; xo < roomWidth; xo++) {
				this.setMap(x + xo, y + yo, MapGenerator.FLOOR_HEIGHT);
			}
		}
	}
	setMap(x, y, value) {
		this.map[x + y * this.width] = value;
	}
	getMap(x, y) {
		return this.map[x + y * this.width];
	}
}

module.exports = MapGenerator;

},{}],3:[function(require,module,exports){
var screenW;
var screenH;

var Constants = require("./Constants");

var World = require("./world/World");

var MapGenerator = require("./MapGenerator");

const socket = io();
socket.on("test", function(username, room) {
	console.log(username); //TODO remove
	console.log(room); //TODO remove
});

const main = {
	init: function() {
		this.world = new World();
		main.initMenu();
	},
	initMenu: function() {
		this.menuOpacity = 1;
		var blocker = document.getElementById("blocker");
		var login = document.getElementById("login");

		var roomIDInput = document.getElementById("roomIDInput")
		var usernameInput = document.getElementById("usernameInput");
		var btn = document.getElementById("playBtn");

		//https://stackoverflow.com/questions/469357/html-text-input-allow-only-numeric-input
		function setInputFilter(textbox, inputFilter) {
			["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
			 	textbox.addEventListener(event, function() {
			   	if (inputFilter(this.value)) {
			   		this.oldValue = this.value;
			     		this.oldSelectionStart = this.selectionStart;
			     		this.oldSelectionEnd = this.selectionEnd;
			   	} else if (this.hasOwnProperty("oldValue")) {
			     		this.value = this.oldValue;
			     		this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
			   	} else {
			     		this.value = "";
			   	}
			 	});
			});
		}
		setInputFilter(roomIDInput, function(value) {return /^\d*\.?\d*$/.test(value);});

		btn.addEventListener("click", function() {
			if (usernameInput.value.length < 1) return;
			main.world.player.controller.lock();
			document.getElementById("blocker").style.opacity = 0;
			main.menuOpacity = 1;

			socket.emit(Constants.SOCKET_PLAYER_LOGIN, roomIDInput.value, usernameInput.value);
			roomIDInput.value = "";
			usernameInput.value = "";
		});

		this.world.player.controller.addPointUnlockListener(function() {
			main.menuOpacity = 0;
			console.log("?");
		});
	},
	update: function(delta) {
		this.updateSize();

		this.world.adjustWindowSize(screenW, screenH);
		this.world.update(delta);
	},
	render: function() {
		if (this.menuOpacity < 1) {
			this.menuOpacity += 0.01;
			document.getElementById("blocker").style.opacity = this.menuOpacity;
		}
		this.world.render();
	},
	updateSize: function() {
		screenW = window.innerWidth ||
	   	document.documentElement.clientWidth ||
	    	document.body.clientWidth;
	  	screenH = window.innerHeight ||
	    	document.documentElement.clientHeight ||
	    	document.body.clientHeight;
	}
}

window.onload =
	function Game() {
		document.body.style.marginTop = 0;
    	document.body.style.marginLeft = 0;
    	document.body.style.marginBottom = 0;
    	document.body.style.marginUp = 0;

		main.updateSize();
		main.init();

		var lastUpdateTime = (new Date()).getTime();
		setInterval(function() {
			var currentTime = (new Date()).getTime();
			var delta = currentTime - lastUpdateTime;
    		main.update(delta);
    		main.render();
			lastUpdateTime = currentTime;
  		}, 1000 / Constants.FPS);
  	}

},{"./Constants":1,"./MapGenerator":2,"./world/World":9}],4:[function(require,module,exports){
var PlateFrame = require("./PlateFrame");

class BufferMapBlock {
	constructor(w, e, n, s, x, y, alt, world){
		this.west = w;
		this.east = e;
		this.north = n;
		this.south = s;
		this.centerX = x;
		this.centerY = alt;
		this.centerZ = y;

		this.world = world;
	}
	static get LENGTH() {return 5;}
	create() {
		var length = BufferMapBlock.LENGTH;
		var floor = new PlateFrame(this.centerX, length/2, this.centerY, 0, this.centerZ, length/2, 2 * (1 - (length - this.centerY)/length), 255/255, 255/255, this.world);

		for (const vertex of floor.points) {
			this.world.positions.push(...vertex.pos);
			this.world.normals.push(...vertex.norm);
			this.world.uvs.push(...vertex.uv);
			this.world.colors.push(...vertex.color);
		}
		if(this.south > 0){
			var south = new PlateFrame(this.centerX, length/2, this.centerY + this.south/2, this.south/2, this.centerZ+length/2, 0, 255/255, 0, 0, this.world);
			for (const vertex of south.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.north > 0){
			var north = new PlateFrame(this.centerX, length/2, this.centerY + this.north/2, this.north/2, this.centerZ-length/2, 0, 0, 255/255, 0, this.world);
			for (const vertex of north.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.east > 0){
			var east = new PlateFrame(this.centerX+length/2, 0, this.centerY + this.east/2, this.east/2, this.centerZ, length/2, 0, 0, 255/255, this.world);
			for (const vertex of east.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.west > 0){
			var west = new PlateFrame(this.centerX-length/2, 0, this.centerY + this.west/2, this.west/2, this.centerZ, length/2, 255/255, 0, 255/255, this.world);
			this.world.lightUp(this.centerX-length/2+length/40, this.centerY+4/5*this.west, this.centerZ);
			for (const vertex of west.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
	}
}

module.exports = BufferMapBlock;

},{"./PlateFrame":8}],5:[function(require,module,exports){
var Entity = require("./Entity");
var FPSController = require("./FPSController");

class ClientPlayer extends Entity {
	constructor(world, x = 0, y = 3.5, z = 0) {
		super(x, y, z, world);

		const MOVEMENT_SPEED = 0.02;
		const TURN_SPEED = 0.001;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.position.z = z;

		this.controller = new FPSController(this.camera, world.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
	}
	update(delta) {
		this.controller.update(delta);
	}
	render() {
		//TODO if the clientPlayer is renderer, it should be rendererd here
	}
}

module.exports = ClientPlayer;

},{"./Entity":6,"./FPSController":7}],6:[function(require,module,exports){
class Entity {
	constructor(x, y, z, world) {
		this.xpos = x;
		this.ypos = y;
		this.zpos = z;
		this.world = world;
	}
	update() {}
	render() {}
}

module.exports = Entity;

},{}],7:[function(require,module,exports){
//Adaptation of https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js
class FPSController {
	constructor(camera, domElement) {
		this.camera = camera;

		this.speed = 5;
		this.turnSpeed = 0.001;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;

		this.moveUp = false;
		this.moveDown = false;

		this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
		this.PI_2 = Math.PI / 2;
		this.vec = new THREE.Vector3();

		this.domElement = domElement;
		this.domElement.requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock;
		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		this.lockCallback = function(){};
		this.unlockCallback = function(){};

		this.initEvents();
	}
	initEvents() {
		document.addEventListener("pointerlockchange", bind(this, this.onPointerlockChange), false);

		document.addEventListener('mousemove', bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', bind(this, this.onKeyUp), false);

		function bind(scope, fn) {
			return function() {
				fn.apply(scope, arguments);
			};
		};
	}
	addPointLockListener(callback) {
		this.lockCallback = callback;
	}
	addPointUnlockListener(callback) {
		this.unlockCallback = callback;
	}
	onPointerlockChange() {
		if (document.pointerLockElement === this.domElement) {
			this.lockCallback();
		} else {
			this.unlockCallback();
		}
	}
	onMouseMove(event) {
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.euler.setFromQuaternion(this.camera.quaternion);

		this.euler.y -= movementX * this.turnSpeed;
		this.euler.x -= movementY * this.turnSpeed;

		this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

		this.camera.quaternion.setFromEuler(this.euler);
	}
	onKeyDown(event) {
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = true; break;
			case 65: /*A*/ this.moveLeft = true; break;
			case 83: /*S*/ this.moveBackward = true; break;
			case 68: /*D*/ this.moveRight = true; break;

			case 82: /*R*/ this.moveUp = true; break;
			case 70: /*F*/ this.moveDown = true; break;
		}
	}
	onKeyUp(event) {
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = false; break;
			case 65: /*A*/ this.moveLeft = false; break;
			case 83: /*S*/ this.moveBackward = false; break;
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;
		}
	}
	moveCamForward(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.vec.crossVectors(this.camera.up, this.vec);
		this.camera.position.addScaledVector(this.vec, distance);
	}
	moveCamRight(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.camera.position.addScaledVector(this.vec, distance);
	}
	moveCamUp(distance) {
		this.camera.position.y += distance;
	}
	update(delta) {
		if (this.moveForward && !this.moveBackward) this.moveCamForward(this.speed * delta);
		if (this.moveBackward && !this.moveForward) this.moveCamForward(-this.speed * delta);

		if (this.moveLeft && !this.moveRight) this.moveCamRight(-this.speed * delta);
		if (this.moveRight && !this.moveLeft) this.moveCamRight(this.speed * delta);

		if (this.moveUp && !this.moveDown) this.moveCamUp(this.speed * delta);
		if (this.moveDown && !this.moveUp) this.moveCamUp(-this.speed * delta);
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

module.exports = FPSController;

},{}],8:[function(require,module,exports){
class PlateFrame{
	constructor(cenX,halflX, cenY,halflY, cenZ,halflZ, R, G, B, world) {
		world.plateNum++;
		if(halflX == 0){ // all same x coordinate
			this.points = [
				{ pos: [cenX, cenY-halflY,  cenZ-halflZ], norm: [ -1,  0,  0], uv: [0, 1], color: [R, G, B]},
				{ pos: [cenX, cenY+halflY,  cenZ-halflZ], norm: [ -1,  0,  0], uv: [1, 1], color: [R, G, B]},
				{ pos: [cenX, cenY-halflY,  cenZ+halflZ], norm: [ -1,  0,  0], uv: [0, 0], color: [R, G, B]},
				{ pos: [cenX, cenY+halflY,  cenZ+halflZ], norm: [ -1,  0,  0], uv: [1, 0], color: [R, G, B]}
			];
		}
		else if(halflY == 0){ // all same y coordinate
			this.points = [
				{ pos: [cenX-halflX, cenY,  cenZ-halflZ], norm: [ 0,  1,  0], uv: [0, 1], color: [R, G, B]},
				{ pos: [cenX+halflX, cenY,  cenZ-halflZ], norm: [ 0,  1,  0], uv: [1, 1], color: [R, G, B]},
				{ pos: [cenX-halflX, cenY,  cenZ+halflZ], norm: [ 0,  1,  0], uv: [0, 0], color: [R, G, B]},
				{ pos: [cenX+halflX, cenY,  cenZ+halflZ], norm: [ 0,  1,  0], uv: [1, 0], color: [R, G, B]}
			];
		}
		else if(halflZ ==0) { // all same z coordinate
			this.points = [
				{ pos: [cenX-halflX, cenY-halflY,  cenZ], norm: [ 0,  0,  -1], uv: [0, 1], color: [R, G, B]},
				{ pos: [cenX+halflX, cenY-halflY,  cenZ], norm: [ 0,  0,  -1], uv: [1, 1], color: [R, G, B]},
				{ pos: [cenX-halflX, cenY+halflY,  cenZ], norm: [ 0,  0,  -1], uv: [0, 0], color: [R, G, B]},
				{ pos: [cenX+halflX, cenY+halflY,  cenZ], norm: [ 0,  0,  -1], uv: [1, 0], color: [R, G, B]}
			];
		}
		else{
			console.log("improper plate");
		}
	}
}

module.exports = PlateFrame;

},{}],9:[function(require,module,exports){
var Entity = require("./Entity");
var ClientPlayer = require("./ClientPlayer");
var BufferMapBlock = require("./BufferMapBlock");

var MapGenerator = require("../MapGenerator");

class World {
	constructor () {
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

		document.body.appendChild(this.renderer.domElement);

		this.domElement = this.renderer.domElement;

		this.initMap();
		this.initGame();
	}
	initMap() {
		var mat = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors, side: THREE.DoubleSide});
		var mapMesh = new THREE.Mesh(this.bufferMapGeom, mat);
		mapMesh.receiveShadow = true;
		mapMesh.castShadow = false;
		this.scene.add(mapMesh);

		var ambient_light = new THREE.AmbientLight( 0xffffff, .5 ); // soft white light
		this.scene.add( ambient_light );
	}
	initGame() {
		this.player = new ClientPlayer(this);

		// sphere existence is good for testing
		this.testSphere();

		this.mapSize = 11;
		this.mapGenerator = new MapGenerator(this.mapSize, this.mapSize);
		this.map = this.mapGenerator.generate();
		this.interpretMap(this.map, this.mapSize, this.mapSize);

		this.setUpMap();
	}
	adjustWindowSize(screenW, screenH) {
		this.screenW = screenW;
		this.screenH = screenH;
	}
	update(delta) {
		this.player.update(delta);
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
	setIndices(numPlates){
		for(var k=0; k<numPlates; k++){
//    	//var general_term = [0+4*k, 1+4*k, 2+4*k, 2+4*k, 1+4*k, 3+4*k];
			var general_term = [2+4*k, 3+4*k, 1+4*k, 1+4*k, 0+4*k, 2+4*k];
			this.indices = this.indices.concat(general_term);
		}
	}
	setUpMap() {
		this.setIndices(this.plateNum);
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

},{"../MapGenerator":2,"./BufferMapBlock":4,"./ClientPlayer":5,"./Entity":6}]},{},[3]);
