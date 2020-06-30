(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const Assets = {
	loadingPercent: 0,
	modelAssets: new Map(),
	init() {
		THREE.DefaultLoadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
			console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
		};

		THREE.DefaultLoadingManager.onLoad = function ( ) {
			console.log( 'Loading Complete!');
		};

		THREE.DefaultLoadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
			console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
			Assets.loadingPercent = itemsLoaded / itemsTotal;
		};

		THREE.DefaultLoadingManager.onError = function ( url ) {
			console.log( 'There was an error loading ' + url );
		};
		Assets.loadFont();

		//Load models:
		Assets.loadModel("Player", "client/models/Player/Player.gltf");
	},
	loadFont() {
		var textLoad = new THREE.FontLoader();
   	textLoad.load("client/fonts/Aldo the Apache_Regular.json", function ( font ) {
			Assets.DEFAULT_FONT = font;
   	});
	},
	loadModel(name, path, callback) {
		var loader = new THREE.GLTFLoader();
		loader.load(path, (object) => {
			Assets.modelAssets.set(name, object);
			if (callback != undefined) callback(object);
    	});
	},
	getGLTFModel(name) {
		return Assets.modelAssets.get(name);
	},
	getModelClone(name) {
		return clone(Assets.modelAssets.get(name).scene.children[0]);
	}
}

function clone(source) { //Copied from Three.js SkeletonUtils
	var sourceLookup = new Map();
	var cloneLookup = new Map();

	var clone = source.clone();

	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

		sourceLookup.set( clonedNode, sourceNode );
		cloneLookup.set( sourceNode, clonedNode );

	} );

	clone.traverse( function ( node ) {
		if ( ! node.isSkinnedMesh ) return;

		var clonedMesh = node;
		var sourceMesh = sourceLookup.get( node );
		var sourceBones = sourceMesh.skeleton.bones;

		clonedMesh.skeleton = sourceMesh.skeleton.clone();
		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );
		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {
			return cloneLookup.get( bone );
		} );
		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );
	} );
	return clone;
}

function parallelTraverse( a, b, callback ) {
	callback( a, b );
	for ( var i = 0; i < a.children.length; i ++ ) {
		parallelTraverse( a.children[ i ], b.children[ i ], callback );
	}
}

module.exports = Assets;

},{}],2:[function(require,module,exports){
var screenW;
var screenH;

var Constants = require("./common/Constants");
var Assets = require("../Assets");

var World = require("./world/World");

const socket = io();

const main = {
	init: function() {
		Assets.init();
		main.initMenu();
		main.initPause();

		socket.on(Constants.NET_INIT_WORLD, function(socketID, worldInfo) {
			main.world = new World(socketID, socket, worldInfo);
			main.world.controller.addPointUnlockListener(function() {
				main.world.controller.enabled = false;
				main.pauseMenuOpacity = 0.01;
				document.getElementById("pauseMenu").style.opacity = 1;
				document.getElementById("pauseMenu").style.pointerEvents = "auto";
			});
			main.world.controller.lock();
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

			socket.emit(Constants.NET_SOCKET_PLAYER_LOGIN, roomIDInput.value, usernameInput.value);
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

			main.world.controller.lock();
			main.world.controller.enabled = true;
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
			socket.emit(Constants.NET_SOCKET_PLAYER_LEAVE_ROOM);
		});

		mouseSensitivityRange.oninput = function() {
    		mouseSensitivityOutput.value = mouseSensitivityRange.value;
			main.world.controller.turnSpeed = mouseSensitivityRange.value / 2000; //divide to scale value
		};

		mouseSensitivityOutput.addEventListener("blur", function() {
			mouseSensitivityOutput.value = Math.min(Math.max(mouseSensitivityOutput.value, mouseSensitivityOutput.min), mouseSensitivityOutput.max);
			mouseSensitivityRange.value = mouseSensitivityOutput.value;
			main.world.controller.turnSpeed = mouseSensitivityOutput.value / 2000;
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
		var prevW = screenW;
		var prevH = screenH;
		screenW = window.innerWidth ||
	   	document.documentElement.clientWidth ||
	    	document.body.clientWidth;
	  	screenH = window.innerHeight ||
	    	document.documentElement.clientHeight ||
	    	document.body.clientHeight;
		if (prevW != screenW || prevH != screenH) {
			if (main.world != undefined) {
				main.world.renderer.setSize(screenW, screenH, false);
				main.world.camera.aspect = screenW / screenH;
  				main.world.camera.updateProjectionMatrix();
				main.world.domElement = main.world.renderer.domElement;
			}
		}
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

		var lastUpdateTime = Date.now();
		setInterval(function() {
			var currentTime = Date.now();
			var delta = currentTime - lastUpdateTime;
    		main.update(delta);
    		main.render();
			lastUpdateTime = currentTime;
  		}, 1000.0 / Constants.FPS);
  	}

},{"../Assets":1,"./common/Constants":3,"./world/World":11}],3:[function(require,module,exports){
var Constants = {
	FPS: 60,
	SERVER_SEND_RATE: 20,
	MAP_BLOCK_LENGTH: 5,

	//Debug flags
	DEBUG_SHOW_ENTITY_BOUNDING_BOXES: true,
	DEBUG_DO_ENTITY_INTERPOLATION: true,

	//Networking events
	NET_SOCKET_PLAYER_LOGIN: "socket_player_login",
	NET_SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	NET_INIT_WORLD: "init_map",
	NET_WORLD_STATE_UPDATE: "state_update",
	NET_CLIENT_POSE_CHANGE: "client_pose_change",
}

module.exports = Constants;

},{}],4:[function(require,module,exports){
const LMath = {
	lerp: function(x0, x1, percent) {
		var p = LMath.clamp(percent, 0.0, 1.0);
		return x0 + (x1 - x0) * p;
	},
	clamp: function(value, min, max) {
		return Math.max(Math.min(value, max), min);
	}
}

module.exports = LMath;

},{}],5:[function(require,module,exports){
const Utils = {
	bind: function(scope, fn) {
		return function onEvent() {
			fn.apply(scope, arguments);
		};
	}
}

module.exports = Utils;

},{}],6:[function(require,module,exports){
var PlateFrame = require("./PlateFrame");
var Constants = require("../common/Constants");

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
	create() {
		var length = Constants.MAP_BLOCK_LENGTH;
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

},{"../common/Constants":3,"./PlateFrame":10}],7:[function(require,module,exports){
var Constants = require("../common/Constants");
var Assets = require("../../Assets");

class Entity {
	constructor(x, y, z, world) {
		this.position = new THREE.Vector3(x, y, z);
		this.world = world;

		this.positionBuffer = [];
	}
	withModel(assetName) {
		this.model = Assets.getModelClone(assetName);
		this.model.position.set(this.position.x, this.position.y, this.position.z);
		this.world.scene.add(this.model);
	}
	withBoundingBox(boundingGeometry, posOffset = new THREE.Vector3(0, 0, 0)) {
		this.boundingGeometry = boundingGeometry;
		this.boundingPosOffset = posOffset;

		if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) {
			var wireMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe:true } );
			this.boundingBoxDebugMesh = new THREE.Mesh( this.boundingGeometry, wireMaterial );
			this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
			this.world.scene.add( this.boundingBoxDebugMesh );
		}
	}
	dispose() {
		if (this.model != undefined) this.world.scene.remove(this.model);
		if (this.boundingBoxDebugMesh != undefined) this.world.scene.remove(this.boundingBoxDebugMesh);
	}
	insertPositionWithTime(timestamp, state) {
		this.positionBuffer.push({
			time: timestamp,
			state: state
		})
	}
	update(delta) {
		if (this.model != undefined) this.model.position.set(this.position.x, this.position.y, this.position.z);
	}
	updateBoundingBox() {
		if (this.boundingBoxDebugMesh != undefined) this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
	}
}

module.exports = Entity;

},{"../../Assets":1,"../common/Constants":3}],8:[function(require,module,exports){
var Utils = require("../common/Utils");

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

		document.addEventListener("pointerlockchange", Utils.bind(this, this.onPointerlockChange), false);
		document.addEventListener('mousemove', Utils.bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', Utils.bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', Utils.bind(this, this.onKeyUp), false);
	}
	initPose(x, y, z, rotX, rotY) {
		this.position = new THREE.Vector3(x, y, z);
		this.camera.position.set(x, y, z);

		this.euler.x = rotX;
		this.euler.y = rotY;
		this.camera.quaternion.setFromEuler(this.euler);

		this.onPoseChange(this.position, this.euler);
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

		this.isRotationChanged = true;
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
		this.position.addScaledVector(this.vec, distance);
	}
	moveCamRight(distance) {
		this.vec.setFromMatrixColumn(this.camera.matrix, 0);
		this.position.addScaledVector(this.vec, distance);
	}
	moveCamUp(distance) {
		this.position.y += distance;
	}
	update(delta) {
		var previousPosition = this.position.clone();

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

		var isPositionChanged = !previousPosition.equals(this.position);
		if(isPositionChanged || this.isRotationChanged) {
			this.onPoseChange(this.position, this.euler);
			if (isPositionChanged) this.camera.position.copy(this.position);
			if (this.isRotationChanged) this.isRotationChanged = false;
		}
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

module.exports = FPSController;

},{"../common/Utils":5}],9:[function(require,module,exports){
var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");
var Constants = require("../common/Constants");
var Assets = require("../../Assets");

class NetPlayer extends Entity {
	constructor(socketID, name, x, y, z, rot_x, rot_y, world) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		if (this.world.clientSocketID != this.socketID) {
			//Init Model Mesh
			this.withModel("Player");
			var modelMat = new THREE.MeshPhongMaterial({color: 0xffff00, side: THREE.FrontSide});
			this.model.children.forEach(child => {
				if (child.type == "SkinnedMesh") {
					child.material.color = new THREE.Color(0xff0000);
					child.material.metalness = 0.1;
				}
			});

			//Init animations
			this.mixer = new THREE.AnimationMixer(this.model);
			this.animations = new Map();
			var self = this;
			Assets.getGLTFModel("Player").animations.forEach((animation) => {
				var action = self.mixer.clipAction(animation);
				if (animation.name == "Jump") {
					action.clampWhenFinished = true;
        			action.loop = THREE.LoopOnce;
				}
				self.animations.set(animation.name, action);
			});
			this.activeAction = this.animations.get("Idle");
			this.activeAction.play();

			/*
			document.addEventListener('keydown', (event) => {
				if (event.keyCode == 32) {
					self.fadeToActionAnim("Jump", 0.2);
					function restore() {
						self.mixer.removeEventListener("finished", restore);
						self.fadeToActionAnim("Idle", 0.2);
					}
					self.mixer.addEventListener("finished", restore);
				} else if (event.keyCode == 87) {
					if (this.activeAction !== this.animations.get("Walk")) {
						self.fadeToActionAnim("Walk", 0.2);
					}
				}
			}, false);
			document.addEventListener('keyup', (event) => {
				if (event.keyCode == 87) {
					if (this.activeAction !== this.animations.get("Idle")) {
						self.fadeToActionAnim("Idle", 0.2);
					}
				}
			}, false);*/

			//Init Username Mesh
			var textGeom = new THREE.TextBufferGeometry(this.name, {
         	font: Assets.DEFAULT_FONT,
            size: Constants.MAP_BLOCK_LENGTH/(5*Math.log(this.name.length + 2)),
            height: 0.1,
            curveSegments: 12,
            bevelEnabled: false,
   		});
			var textMat = new THREE.MeshBasicMaterial( { color: 0xffffff} );
			textGeom.center();
         this.usernameMesh = new THREE.Mesh(textGeom, textMat);
         this.usernameMesh.position.set(this.position.x, this.position.y + Constants.MAP_BLOCK_LENGTH / 2, this.position.z);
			this.usernameMesh.lookAt(this.world.camera.position);
         this.world.scene.add(this.usernameMesh);

			//Init collision box
			this.withBoundingBox(new THREE.BoxGeometry(2, 2, 2), new THREE.Vector3(0, 0, -0.2));
		}
	}
	fadeToActionAnim(name, duration) {
		var previousAction = this.activeAction;
		this.activeAction = this.animations.get(name);
		this.currentActionName = name;

		if (previousAction !== this.activeAction) {
			previousAction.fadeOut(duration);
		}

		this.activeAction
			.reset()
			.setEffectiveTimeScale(1)
			.setEffectiveWeight(1)
			.fadeIn(duration)
			.play();
	}
	dispose() {
		super.dispose();
		if (this.world.clientSocketID != this.socketID) {
			this.world.scene.remove(this.usernameMesh);
		}
	}
	update(delta) {
		super.update(delta);
		if (this.world.clientSocketID != this.socketID) {
			this.updatePlayerName();
			if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) this.updateBoundingBox();
			if (this.mixer != undefined) this.mixer.update(delta * 0.001);
		}
	}
	setPlayerPose(x, y, z, rot_x, rot_y) {
		if (this.world.clientSocketID == this.socketID) throw "function can't be used by client player";
		if (this.position.x != x || this.position.y != y || this.position.z != z) {
			if (this.currentActionName != "Walk") {
				this.fadeToActionAnim("Walk", 0.2);
			}
		} else {
			if (this.currentActionName != "Idle") {
				this.fadeToActionAnim("Idle", 0.2);
			}
		}
		this.position.set(x, y, z);
		this.rot_x = rot_x;
		this.rot_y = rot_y;
		this.model.quaternion.setFromEuler(new THREE.Euler(0, this.rot_y, 0, 'YXZ'));
	}
	updatePlayerName() {
		if (this.world.clientSocketID == this.socketID) throw "function can't be used by client player";
		this.usernameMesh.position.set(this.position.x, this.position.y + Constants.MAP_BLOCK_LENGTH / 2, this.position.z);
		this.usernameMesh.lookAt(this.world.camera.position);
	}
}

module.exports = NetPlayer;

},{"../../Assets":1,"../common/Constants":3,"./BufferMapBlock":6,"./Entity":7}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

		const MOVEMENT_SPEED = 0.008;
		const TURN_SPEED = 0.0004;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.controller = new FPSController(this.camera, this.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
		this.controller.addPoseChangeListener((pos, rot) => {
			self.socket.emit(Constants.NET_CLIENT_POSE_CHANGE, pos.x, pos.y, pos.z, rot.x, rot.y);
		});
		this.controller.initPose(player.x, player.y, player.z, player.rot_x, player.rot_y);

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
		this.netPlayers.forEach((nPlayer) => {
			if (nPlayer.socketID == this.clientSocketID) return;
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

},{"../common/Constants":3,"../common/Math/LMath":4,"./BufferMapBlock":6,"./Entity":7,"./FPSController":8,"./NetPlayer":9}]},{},[2]);
