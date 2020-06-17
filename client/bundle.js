(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var Constants = {
	FPS: 60,
	SOCKET_PLAYER_LOGIN: "socket_player_login",
	SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	INITIALIZE_MAP: "init_map",
	ADD_PLAYER: "new_player",
	REMOVE_PLAYER: "remove_player",
	CLIENT_TO_SERVER_UPDATE_PLAYER_POSITION: "client_update_player_pos",
	SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION: "server_update_player_pos"
}

module.exports = Constants;

},{}],2:[function(require,module,exports){
var screenW;
var screenH;

var Constants = require("./Constants");

var World = require("./world/World");

const socket = io();

const main = {
	init: function() {
		main.initMenu();
		main.initPause();

		socket.on(Constants.INITIALIZE_MAP, function(map, width, height) {
			main.world = new World(map, width, height, socket);
			main.world.player.controller.addPointUnlockListener(function() {
				main.world.player.controller.enabled = false;
				main.pauseMenuOpacity = 0.01;
				document.getElementById("pauseMenu").style.opacity = 1;
				document.getElementById("pauseMenu").style.pointerEvents = "auto";
			});
			main.world.player.controller.lock();
		});
	},
	initMenu: function() {
		var blocker = document.getElementById("blocker");
		var mainMenu = document.getElementById("mainMenu");

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
			blocker.style.opacity = 0;
			mainMenu.style.opacity = 0;
			main.pauseMenuOpacity = 0;

			socket.emit(Constants.SOCKET_PLAYER_LOGIN, roomIDInput.value, usernameInput.value);
			roomIDInput.value = "";
			usernameInput.value = "";
		});
	},
	initPause: function() {
		this.pauseMenuOpacity = 0;
		var blocker = document.getElementById("blocker");
		var pauseMenu = document.getElementById("pauseMenu");
		var pauseComponents = document.getElementById("pauseComponents");
		var optionsComponents = document.getElementById("optionsComponents");

		var continueBtn = document.getElementById("continueBtn")
		var optionsBtn = document.getElementById("optionsBtn")
		var exitBtn = document.getElementById("leaveBtn");

		var mouseSensitivityRange = document.getElementById("mouseSensitivityRange");
		var mouseSensitivityOutput = document.getElementById("mouseSensitivityOutput");
		var optionsBackBtn = document.getElementById("optionsBackBtn");

		continueBtn.addEventListener("click", function() {
			blocker.style.opacity = 0;
			pauseMenu.style.opacity = 0;
			main.pauseMenuOpacity = 0;

			main.world.player.controller.lock();
			main.world.player.controller.enabled = true;
		});

		optionsBtn.addEventListener("click", function() {
			pauseComponents.style.opacity = 0;
			optionsComponents.style.opacity = 1;
			optionsComponents.style.pointerEvents = "auto";
		});

		leaveBtn.addEventListener("click", function() {
			pauseMenu.style.opacity = 0;
			main.pauseMenuOpacity = 0;
			pauseMenu.style.pointerEvents = "none";

			document.getElementById("mainMenu").style.opacity = 1;
			main.world.dispose();
			main.world = null;
			socket.emit(Constants.SOCKET_PLAYER_LEAVE_ROOM);
		});

		mouseSensitivityRange.oninput = function() {
    		mouseSensitivityOutput.value = mouseSensitivityRange.value;
			main.world.player.controller.turnSpeed = mouseSensitivityRange.value / 2000; //divide to scale value
		};

		mouseSensitivityOutput.addEventListener("blur", function() {
			mouseSensitivityOutput.value = Math.min(Math.max(mouseSensitivityOutput.value, mouseSensitivityOutput.min), mouseSensitivityOutput.max);
			mouseSensitivityRange.value = mouseSensitivityOutput.value;
			main.world.player.controller.turnSpeed = mouseSensitivityOutput.value / 2000;
		});

		optionsBackBtn.addEventListener("click", function() {
			pauseComponents.style.opacity = 1;
			optionsComponents.style.opacity = 0;
			optionsComponents.style.pointerEvents = "none";
		});
	},
	update: function(delta) {
		this.updateSize();

		if (this.world != undefined) {
			this.world.adjustWindowSize(screenW, screenH);
			this.world.update(delta);
		}
	},
	render: function() {
		if (this.pauseMenuOpacity > 0 && this.pauseMenuOpacity < 1) {
			this.pauseMenuOpacity += 0.05;
			document.getElementById("blocker").style.opacity = this.pauseMenuOpacity;
		}
		if (this.world != undefined) {
			this.world.render();
		}
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

},{"./Constants":1,"./world/World":9}],3:[function(require,module,exports){
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
		var plateNum = this.world.plateNum;
		var general_term = [2+4*(plateNum-1), 3+4*(plateNum-1), 1+4*(plateNum-1), 1+4*(plateNum-1), 0+4*(plateNum-1), 2+4*(plateNum-1)];
		this.world.indices = this.world.indices.concat(general_term);

		for (const vertex of floor.points) {
			this.world.positions.push(...vertex.pos);
			this.world.normals.push(...vertex.norm);
			this.world.uvs.push(...vertex.uv);
			this.world.colors.push(...vertex.color);
		}
		if(this.south > 0){
			var south = new PlateFrame(this.centerX, length/2, this.centerY + this.south/2, this.south/2, this.centerZ+length/2, 0, 255/255, 0, 0, this.world);
			plateNum = this.world.plateNum;
			general_term = [2+4*(plateNum-1), 3+4*(plateNum-1), 1+4*(plateNum-1), 1+4*(plateNum-1), 0+4*(plateNum-1), 2+4*(plateNum-1)];
         this.world.indices = this.world.indices.concat(general_term);
			for (const vertex of south.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.north > 0){
			var north = new PlateFrame(this.centerX, length/2, this.centerY + this.north/2, this.north/2, this.centerZ-length/2, 0, 0, 255/255, 0, this.world);
			plateNum = this.world.plateNum;
			general_term = [0+4*(plateNum-1), 1+4*(plateNum-1), 2+4*(plateNum-1), 2+4*(plateNum-1), 1+4*(plateNum-1), 3+4*(plateNum-1)];
         this.world.indices = this.world.indices.concat(general_term);
			for (const vertex of north.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.east > 0){
			var east = new PlateFrame(this.centerX+length/2, 0, this.centerY + this.east/2, this.east/2, this.centerZ, length/2, 0, 0, 255/255, this.world);
			plateNum = this.world.plateNum;
			general_term = [2+4*(plateNum-1), 3+4*(plateNum-1), 1+4*(plateNum-1), 1+4*(plateNum-1), 0+4*(plateNum-1), 2+4*(plateNum-1)];
         this.world.indices = this.world.indices.concat(general_term);
			for (const vertex of east.points) {
				this.world.positions.push(...vertex.pos);
				this.world.normals.push(...vertex.norm);
				this.world.uvs.push(...vertex.uv);
				this.world.colors.push(...vertex.color);
			}
		}
		if(this.west > 0){
			var west = new PlateFrame(this.centerX-length/2, 0, this.centerY + this.west/2, this.west/2, this.centerZ, length/2, 255/255, 0, 255/255, this.world);
			plateNum = this.world.plateNum;
			general_term = [0+4*(plateNum-1), 1+4*(plateNum-1), 2+4*(plateNum-1), 2+4*(plateNum-1), 1+4*(plateNum-1), 3+4*(plateNum-1)];
			this.world.indices = this.world.indices.concat(general_term);
			//this.world.lightUp(this.centerX-length/2+length/40, this.centerY+4/5*this.west, this.centerZ);
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

},{"./PlateFrame":8}],4:[function(require,module,exports){
var Constants = require("../Constants");

var Entity = require("./Entity");
var FPSController = require("./FPSController");

class ClientPlayer extends Entity {
	constructor(world, x = 0, y = 3.5, z = 0) {
		super(x, y, z, world);

		const MOVEMENT_SPEED = 0.008;
		const TURN_SPEED = 0.0004;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.position.z = z;

		this.controller = new FPSController(this.camera, world.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;

		this.controller.addPoseChangeListener((pos, rot) => {
			world.socket.emit(Constants.CLIENT_TO_SERVER_UPDATE_PLAYER_POSITION, pos.x, pos.y, pos.z, rot.x, rot.y);
		});
	}
	update(delta) {
		this.controller.update(delta);
	}
}

module.exports = ClientPlayer;

},{"../Constants":1,"./Entity":5,"./FPSController":6}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

		this.sprinting = false;

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
	dispose() {
		this.camera = null;
		this.enabled = false;
	}
	addPoseChangeListener(callback) {
		this.onPoseChange = callback;
	}
	initEvents() {
		this.enabled = true;

		document.addEventListener("pointerlockchange", bind(this, this.onPointerlockChange), false);

		document.addEventListener('mousemove', bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', bind(this, this.onKeyUp), false);

		function bind(scope, fn) {
			return function onEvent() {
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
		if (!this.enabled) return;
		if (document.pointerLockElement === this.domElement) {
			this.lockCallback();
		} else {
			this.unlockCallback();
		}
	}
	onMouseMove(event) {
		if (!this.enabled) return;
		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		this.euler.setFromQuaternion(this.camera.quaternion);

		this.euler.y -= movementX * this.turnSpeed;
		this.euler.x -= movementY * this.turnSpeed;

		this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

		this.camera.quaternion.setFromEuler(this.euler);

		this.onPoseChange(this.camera.position, this.euler);
	}
	onKeyDown(event) {
		if (!this.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = true; break;
			case 65: /*A*/ this.moveLeft = true; break;
			case 83: /*S*/ this.moveBackward = true; break;
			case 68: /*D*/ this.moveRight = true; break;

			case 82: /*R*/ this.moveUp = true; break;
			case 70: /*F*/ this.moveDown = true; break;

			case 16: /*Shift*/ this.sprinting = true; break;
		}
	}
	onKeyUp(event) {
		if (!this.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.moveForward = false; break;
			case 65: /*A*/ this.moveLeft = false; break;
			case 83: /*S*/ this.moveBackward = false; break;
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;

			case 16: /*Shift*/ this.sprinting = false; break;
		}
	}
	moveCamForward(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.vec.crossVectors(this.camera.up, this.vec);
		this.camera.position.addScaledVector(this.vec, distance);

		this.onPoseChange(this.camera.position, this.euler);
	}
	moveCamRight(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.camera.position.addScaledVector(this.vec, distance);

		this.onPoseChange(this.camera.position, this.euler);
	}
	moveCamUp(distance) {
		this.camera.position.y += distance;

		this.onPoseChange(this.camera.position, this.euler);
	}
	update(delta) {
		const diagonalSpeedAdjustment = 0.7021;
		var forwardBackMovement = (this.moveForward && !this.moveBackward) || (this.moveBackward && !this.moveForward);
		var sideMovement = (this.moveLeft && !this.moveRight) || (this.moveRight && !this.moveLeft);

		const sprintAdjustment = 2.1;
		var adjustedSpeed = this.speed * delta;
		if (this.sprinting) adjustedSpeed *= sprintAdjustment;

		if (this.moveForward && !this.moveBackward) {
			if (sideMovement) {
				this.moveCamForward(adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamForward(adjustedSpeed);
			}
		}
		if (this.moveBackward && !this.moveForward) {
			if (sideMovement) {
				this.moveCamForward(-adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamForward(-adjustedSpeed);
			}
		}

		if (this.moveLeft && !this.moveRight) {
			if (forwardBackMovement) {
				this.moveCamRight(-adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamRight(-adjustedSpeed);
			}
		}
		if (this.moveRight && !this.moveLeft) {
			if (forwardBackMovement) {
				this.moveCamRight(adjustedSpeed * diagonalSpeedAdjustment);
			} else {
				this.moveCamRight(adjustedSpeed);
			}
		}

		if (this.moveUp && !this.moveDown) this.moveCamUp(adjustedSpeed);
		if (this.moveDown && !this.moveUp) this.moveCamUp(-adjustedSpeed);
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

module.exports = FPSController;

},{}],7:[function(require,module,exports){
var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");

class OpponentPlayer extends Entity {
	constructor(world, x, y, z, rot_x, rot_y, name, socketID) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		this.posX = x;
		this.posY = y;
		this.posZ = z;
		this.modelLoad(x, y, z);

		this.usernameLoad(this.name);
	}
	dispose() {
		this.world.scene.remove(this.model);
		this.world.scene.remove(this.textMesh);
	}
	modelLoad(){
		// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		// var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
		// this.model = new THREE.Mesh(geometry, material);
		// this.model.position.x = x;
		// this.model.position.y = y;
		// this.model.position.z = z;
		// this.world.scene.add(this.model);
		var loader = new THREE.GLTFLoader();
		var self = this;
		loader.load('client/Models/PREMADE_Helmet/DamagedHelmet.gltf', (gltf) => {
        self.model = gltf.scene.children[0];
				self.model.position.x = self.posX;
				self.model.position.y = self.posY;
				self.model.position.z = self.posZ;
				self.world.scene.add(self.model);
    });
	}
	usernameLoad(username){
   	var textLoad = new THREE.FontLoader();
      var textGeom;
		var self = this;
      textLoad.load('client/fonts/Aldo the Apache_Regular.json', function ( font ) {
      	textGeom = new THREE.TextBufferGeometry( username, {
         	font: font,
            size: BufferMapBlock.LENGTH/(3*username.length),
            height: 0.1,
            curveSegments: 12,
            bevelEnabled: false,
   		});
         var textMat = new THREE.MeshBasicMaterial( { color: 0xffffff});
			textGeom.center();
         self.textMesh = new THREE.Mesh(textGeom, textMat);

         self.textMesh.position.x = self.posX;
         self.textMesh.position.y = self.posy+BufferMapBlock.LENGTH/4;
         self.textMesh.position.z = self.posZ;

			self.textMesh.lookAt(self.world.player.camera.position);
         self.world.scene.add(self.textMesh);
   	});
	}
	updatePlayerPose(x, y, z, rot_x, rot_y) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.rot_x = rot_x;
		this.rot_y = rot_y;

		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
	}
	updatePlayerName() {
		if (this.textMesh == undefined) return; //TODO temporary fix
		this.textMesh.lookAt(this.world.player.camera.position);
		this.textMesh.position.x = this.posX;
		this.textMesh.position.y = this.posY + BufferMapBlock.LENGTH/4;
		this.textMesh.position.z = this.posZ;
	}
}

module.exports = OpponentPlayer;

},{"./BufferMapBlock":3,"./Entity":5}],8:[function(require,module,exports){
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

},{"../Constants":1,"./BufferMapBlock":3,"./ClientPlayer":4,"./Entity":5,"./OpponentPlayer":7}]},{},[2]);
