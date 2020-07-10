(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class ModelInfo {
	constructor(name, path, callback) {
		var loader = new THREE.GLTFLoader();
		loader.load(path, (object) => {
			this.gltfObject = object;
			this.mesh = getMeshFromGLTF(object);
			if (callback != undefined) callback(object);
    	});
	}
	createAnimationMixer() {
		return new THREE.AnimationMixer(this.mesh);
	}
	createModel() {
		return clone(this.mesh);
	}
	createClone() {
		var modelClone = {
			gltfObject: this.gltfObject,
			mesh: clone(this.mesh),
			animations: new Map(),
			compileClips: function() {
				this.gltfObject.animations.forEach(animation => {
					var action = modelClone.mixer.clipAction(animation);
					modelClone.animations.set(animation.name, action);
				});
			},
			setOneShot: function(animationName) {
				var action = modelClone.animations.get(animationName);
				action.clampWhenFinished = true;
				action.loop = THREE.LoopOnce;
			},
			spliceBones: function(animationName, boneNames) {
				var clip = this.gltfObject.animations.find((item) => {
					return item.name == animationName;
				});
				for (var i = 0; i < clip.tracks.length; i++) {
					var track = clip.tracks[i];
					var possibleBoneName = track.name.split('.')[0];
					boneNames.forEach((name) => {
						if (possibleBoneName === name) {
							clip.tracks.splice(i, 3)
							i -= 3;
						}
					})
				}
				modelClone.mixer.uncacheAction(modelClone.animations.get(animationName));
				modelClone.mixer.clipAction(clip);
			}
		}
		modelClone.mixer = new THREE.AnimationMixer(modelClone.mesh);

		return modelClone;
	}
}

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
		Assets.loadModel("Player", "client/models/Player/Player.gltf", object => {
			getMeshFromGLTF(object).children.forEach(child => {
				if (child.isMesh) {
					child.material.color = new THREE.Color(0xff0000);
					child.material.metalness = 0.1;
					child.material.frustumCulled = false;
					child.frustumCulled = false;
				}
			});
		});

		Assets.loadModel("Pistol", "client/models/Pistol/Pistol.gltf", object => {
			getMeshFromGLTF(object).traverse(o => {
				if (o.isMesh) {
					o.material.color = new THREE.Color(0x544c4a);
					o.scale.set(2,2,2);
				}
			})
		});

		Assets.loadModel("GenericItem", "client/models/Pistol/Pistol.gltf", object => {
			getMeshFromGLTF(object).traverse(o => {
				if (o.isMesh) {
					o.material.color = new THREE.Color(0xffffff);
					o.scale.set(2,2,2);
				}
			})
		});
	},
	loadFont() {
		var textLoad = new THREE.FontLoader();
   	textLoad.load("client/fonts/Aldo the Apache_Regular.json", function ( font ) {
			Assets.DEFAULT_FONT = font;
   	});
	},
	loadModel(name, path, callback) {
		Assets.modelAssets.set(name, new ModelInfo(name, path, callback));
	},
	get(name) {
		return Assets.modelAssets.get(name);
	}
}

function getMeshFromGLTF(gltfObj) {
	return gltfObj.scene.children[0];
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
var Assets = require("./Assets");

var ComponentT = require("./common/ecs/ComponentT");

var World = require("./world/World");

const socket = io();

const main = {
	init: function() {
		Assets.init();
		main.initMenu();
		main.initPause();

		function onPointerlockChange() {
			if (document.pointerLockElement !== main.world.domElement) {
				main.world.entityManager.getSingleton(ComponentT.INPUT).enabled = false;
				main.pauseMenuOpacity = 0.01;
				document.getElementById("pauseMenu").style.opacity = 1;
				document.getElementById("pauseMenu").style.pointerEvents = "auto";
			}
		}
		socket.on(Constants.NET_INIT_WORLD, function(worldInfo) {
			main.world = new World(socket, worldInfo);
			document.addEventListener("pointerlockchange", onPointerlockChange, false);
			main.world.domElement.requestPointerLock();
			main.world.updateWindowSize(screenW, screenH);
		});

		socket.on(Constants.NET_SERVER_TO_CLIENT_FORCE_DISCONNECT, function() {
			main.stopGame();
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

			main.world.domElement.requestPointerLock();
			main.world.entityManager.getSingleton(ComponentT.INPUT).enabled = true;
		});

		optionsBtn.addEventListener("click", function() {
			pauseComponents.style.opacity = 0;
			optionsComponents.style.opacity = 1;
			optionsComponents.style.pointerEvents = "auto";
		});

		leaveBtn.addEventListener("click", function() {
			main.stopGame();
		});

		mouseSensitivityRange.oninput = function() {
    		mouseSensitivityOutput.value = mouseSensitivityRange.value;
			main.world.entityManager.getSingleton(ComponentT.SETTINGS).turnSpeed = mouseSensitivityOutput.value * Constants.TURN_SPEED_ADJUST_RATIO;
		};

		mouseSensitivityOutput.addEventListener("blur", function() {
			mouseSensitivityOutput.value = Math.min(Math.max(mouseSensitivityOutput.value, mouseSensitivityOutput.min), mouseSensitivityOutput.max);
			mouseSensitivityRange.value = mouseSensitivityOutput.value;
			main.world.entityManager.getSingleton(ComponentT.SETTINGS).turnSpeed = mouseSensitivityOutput.value * Constants.TURN_SPEED_ADJUST_RATIO;
		});

		optionsBackBtn.addEventListener("click", function() {
			pauseComponents.style.opacity = 1;
			optionsComponents.style.opacity = 0;
			optionsComponents.style.pointerEvents = "none";
		});
	},
	stopGame: function() {
		if (main.world != undefined) {
			blocker.style.opacity = 1;
			pauseMenu.style.opacity = 0;
			main.pauseMenuOpacity = 0;
			pauseMenu.style.pointerEvents = "none";

			document.getElementById("mainMenu").style.opacity = 1;
			main.world.dispose();
			main.world = null;
			socket.emit(Constants.NET_SOCKET_PLAYER_LEAVE_ROOM);
		}
	},
	update: function(delta) {
		this.updateSize();

		if (this.world != undefined) {
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
				main.world.updateWindowSize(screenW, screenH);
			}
		}
	}
}

window.onload = () => {
	document.body.style.marginTop = 0;
 	document.body.style.marginLeft = 0;
 	document.body.style.marginBottom = 0;
 	document.body.style.marginUp = 0;

	main.updateSize();
	main.init();

	var displayedFPS = Constants.FPS;
	var lastUpdateTime = Date.now();
	setInterval(function() {
		var currentTime = Date.now();
		var delta = currentTime - lastUpdateTime;
		var actualFPS = 1000 / delta;

		displayedFPS = actualFPS * (1.0 - Constants.FPS_SMOOTHING_WEIGHT_RATIO) + displayedFPS * Constants.FPS_SMOOTHING_WEIGHT_RATIO;
		//console.log(displayedFPS); TODO this doesn't work?

 		main.update(delta);
 		main.render();
		lastUpdateTime = currentTime;
	}, 1000.0 / Constants.FPS);
}

},{"./Assets":1,"./common/Constants":3,"./common/ecs/ComponentT":7,"./world/World":15}],3:[function(require,module,exports){
const Constants = {
	//Performance
	FPS: 60,
	FPS_SMOOTHING_WEIGHT_RATIO: 0.9,
	SERVER_SEND_RATE: 20,

	//Animation
	IDLE_ANIM: "Idle",
	FORWARD_ANIM: "Forward",
	L_STRAFE_ANIM: "StrafeLeft",
	R_STRAFE_ANIM: "StrafeRight",
	JUMP_ANIM: "Jump",

	//Math
	ROTATION_ORDER: "YXZ",
	PI_TWO: Math.PI / 2,

	//Movement
	DIAGONAL_SPEED_ADJUSTMENT: 0.7021,
	SPRINT_ADJUSTMENT: 2.1,

	//World measurements
	MAP_BLOCK_LENGTH: 5,
	PLAYER_HEIGHT_OFFSET: 1.8,

	//Debug flags
	DEBUG_SHOW_ENTITY_BOUNDING_BOXES: true,
	DEBUG_DO_ENTITY_INTERPOLATION: true,

	//Miscellaneous
	PRESSED: 1,
	RELEASED: 0,
	TURN_SPEED_ADJUST_RATIO: 0.0005,
	NO_ANIMATION: "no_anim",

	//Networking events
	NET_SOCKET_PLAYER_LOGIN: "socket_player_login",
	NET_SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	NET_SERVER_TO_CLIENT_FORCE_DISCONNECT: "force_disconnect",
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
	},
	splice: function(array, startIndex, removeCount) {
	  var len = array.length;
	  var removeLen = 0;

	  if (startIndex >= len || removeCount === 0) {
	    return;
	  }

	  removeCount = startIndex + removeCount > len ? (len - startIndex) : removeCount;
	  removeLen = len - removeCount;

	  for (var i = startIndex; i < len; i += 1) {
	    array[i] = array[i + removeCount];
	  }

	  array.length = removeLen;
  }
}

module.exports = Utils;

},{}],6:[function(require,module,exports){
class Component {
	constructor(type, data) {
		this.type = type;
		this.data = data;
	}
}

module.exports = Component;

},{}],7:[function(require,module,exports){
const ComponentT = {
	INPUT: "input",
	SETTINGS: "settings",

	TRANSFORM: "transform",

	MODEL: "model",
	ANIMATION: "anim",
	BONE_ANIM: "bone_anim",
	MOVE_BLEND: "move_blend",

	CAMERA: "camera",
	AIM: "aim",

	STATS: "stats",
}

module.exports = ComponentT;

},{}],8:[function(require,module,exports){
const Utils = require("../Utils");
const EntityT = require("./EntityT");

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

		this.adminEntity = new Entity(0, EntityT.ADMIN);
		this.addEntity(this.adminEntity);
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
	addSingletonComponent(component) {
		this.adminEntity.addComponent(component);
	}
	removeSingletonComponent(type) {
		this.adminEntity.removeComponent(type);
	}
	addSystem(system) {
		this.systems.push(system);
		system.addToManager(this);

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
		return entity;
	}
	createAndAddEntity(typeName, id) {
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
	getSingleton(type) {
		return this.adminEntity.get(type);
	}
}

module.exports = {
	Manager: Manager,
	Entity: Entity,
	Component: Component,
	System: System
}

},{"../Utils":5,"./Component":6,"./Entity":9,"./EntityT":10,"./System":11}],9:[function(require,module,exports){
const Utils = require("../Utils");
const EntityT = require("./EntityT");

class Entity {
	constructor(id, type, components=[]) {
		this.id = id;
		this.type = type ? type : EntityT.GENERIC;

		this.systemsDirty = false;

		this.systems = [];
		this.components = {};
		for (var i = 0, component; component = components[i]; i++) {
			this.components[component.type] = component.data;
		}
	}
	addToManager(manager) {
		this.manager = manager;
		this.setSystemsDirty();
	}
	setSystemsDirty() {
		if (!this.systemsDirty && this.manager) {
			this.systemsDirty = true;
			this.manager.entitiesSystemsDirty.push(this);
		}
	}
	addSystem(system) {
		this.systems.push(system);
	}
	removeSystem(system) {
		var index = this.systems.indexOf(system);

		if (index !== -1) {
			Utils.splice(this.systems, index, 1);
		} else {
			console.log(system);
			throw "entity {" + this.id + "," + this.type + "} does not contain system {" + system + "}";
		}
	}
	addComponent(component) {
		this.components[component.type] = component.data;
		this.setSystemsDirty();
	}
	addArrayOfComponents(components) {
		for (var i = 0, component; component = components[i]; i++) {
			this.components[component.type] = component.data;
		}
		this.setSystemsDirty();
	}
	removeComponent(type) {
		if (!this.components[type]) {
			throw "entity {" + this.id + "," + this.type + "} does not contain component {" + type + "}";
			return;
		}
		this.components[type] = undefined;
		this.setSystemsDirty();
	}
	dispose() {
		for (var i = 0, system; system = this.systems[0]; i++) {
      	system.removeEntity(this);
    	}
	}
	get(type) {
		return this.components[type];
	}
	contains(type) {
		return !!this.components[type];
	}
}

module.exports = Entity;

},{"../Utils":5,"./EntityT":10}],10:[function(require,module,exports){
const EntityT = {
	ADMIN: "admin",
	GENERIC: "none",
	PLAYER: "player"
}

module.exports = EntityT;

},{}],11:[function(require,module,exports){
const Utils = require("../Utils");

class System {
	constructor() {
		this.entities = [];
	}
	addToManager(manager) {
		this.manager = manager;
	}
	addEntity(entity) {
		entity.addSystem(this);
		this.entities.push(entity);

		this.enter(entity);
	}
	removeEntity(entity) {
		var index = this.entities.indexOf(entity);

		if (index !== -1) {
			entity.removeSystem(this);
			Utils.splice(this.entities, index, 1);

			this.exit(entity);
		}
	}
	dispose() {
		for (let i = 0, entity; entity = this.entities[i]; i++) {
      	entity.removeSystem(this);
      	this.exit(entity);
   	}
	}
	enter(entity) {}
	test(entity) {
		console.log(this);
		throw "System requires a /'test/' function overload";
		return false;
	}
	exit(entity) {}
	postUpdate(delta) {}
	updateAll(delta) {
		this.preUpdate(delta);
    	for (let i = 0, entity; entity = this.entities[i]; i++) {
      	this.update(entity, delta);
    	}
    	this.postUpdate(delta);
	}
	update(entity) {}
	preUpdate(delta) {}
}

module.exports = System;

},{"../Utils":5}],12:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],13:[function(require,module,exports){
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

},{"../common/Constants":3,"./PlateFrame":14}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
var Constants = require("../common/Constants");
var Utils = require("../common/Utils");
var LMath = require("../common/Math/LMath");

var BufferMapBlock = require("./BufferMapBlock");

//var test = require("../common/ecs/ECSDemo");
var ECS = require("../common/ecs/ECS");
var EntityT = require("../common/ecs/EntityT");
var ComponentT = require("../common/ecs/ComponentT");

var Player = require("./entity/Player");

//Components
var SGLInputComponent = require("./component/SGLInputComponent");
var SGLSettingsComponent = require("./component/SGLSettingsComponent");

var CameraComponent = require("./component/CameraComponent");

//Systems
var InputSystem = require("./system/InputSystem");

var FirstPersonSystem = require("./system/FirstPersonSystem");
var AnimationSystem = require("./system/AnimationSystem");
var MovementBlendSystem = require("./system/MovementBlendSystem");
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

		//Init domElement and pointer lock API
		this.domElement = this.renderer.domElement;
		document.body.appendChild(this.domElement);
		this.domElement.requestPointerLock = this.domElement.requestPointerLock || this.domElement.mozRequestPointerLock;
		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		//Temporary camera instantiation? TODO
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
		this.scene.add(this.camera);

		this.entityManager = new ECS.Manager();
		this.entityManager.addSingletonComponent(new SGLInputComponent());
		this.entityManager.addSingletonComponent(new SGLSettingsComponent());
		this.entityManager.addArrayOfSystems([
			new InputSystem(),

			new FirstPersonSystem(),
			
			new AnimationSystem(),
			new MovementBlendSystem(),
			new RenderSystem(this.scene)
		]);

		this.entityManager.addEntityArchetype(EntityT.PLAYER, Player);

		this.initClientPlayer(worldInfo);

		//Initialize server listeners
		//this.initServerListeners();

		//Initialize players
		//this.netPlayers = new Map();
		//this.initPlayer(worldInfo);

		this.initMap(worldInfo);
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.entityManager.getSingleton(ComponentT.INPUT).enabled = false;
		this.scene.dispose();

		this.socket.off(Constants.NET_WORLD_STATE_UPDATE);

		this.entityManager.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
	}
	initClientPlayer(worldInfo) { //TODO move this into a "server system" related class
		this.clientPlayer = this.entityManager.createEntity(EntityT.PLAYER, 0);
		this.clientPlayer.get(ComponentT.TRANSFORM).position.set(10, 0, 10);
		this.clientPlayer.get(ComponentT.AIM).aimRotation.set(0, - Math.PI * 3 / 4, 0);
		this.clientPlayer.get(ComponentT.STATS).movementSpeed = 0.003;

		RenderSystem.initModel(this.clientPlayer, "Player");
		this.clientPlayer.get(ComponentT.MODEL).mesh.visible = true;

		var camComponent = new CameraComponent(this.camera);
		camComponent.data.cameraOffset = new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET, 0);//2 * Constants.PLAYER_HEIGHT_OFFSET);
		this.clientPlayer.addComponent(camComponent);

		this.entityManager.addEntity(this.clientPlayer);

		//TODO Delete: Dummy Player
		var dummyPlayer = this.entityManager.createEntity(EntityT.PLAYER, 1);
		dummyPlayer.get(ComponentT.TRANSFORM).position.set(5, 0, 5);
		dummyPlayer.get(ComponentT.AIM).aimRotation.set(0, Math.PI * 3 / 4, 0);
		dummyPlayer.get(ComponentT.STATS).movementSpeed = 0.003;

		RenderSystem.initModel(dummyPlayer, "Player");
		dummyPlayer.get(ComponentT.MODEL).mesh.visible = true;

		dummyPlayer.get(ComponentT.ANIMATION).transitionToActionName = Constants.IDLE_ANIM;

		//this.entityManager.addEntity(dummyPlayer);
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
	updateWindowSize(screenW, screenH) {
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

},{"../common/Constants":3,"../common/Math/LMath":4,"../common/Utils":5,"../common/ecs/ComponentT":7,"../common/ecs/ECS":8,"../common/ecs/EntityT":10,"./BufferMapBlock":13,"./component/CameraComponent":18,"./component/SGLInputComponent":21,"./component/SGLSettingsComponent":22,"./entity/Player":25,"./system/AnimationSystem":26,"./system/FirstPersonSystem":27,"./system/InputSystem":28,"./system/MovementBlendSystem":29,"./system/RenderSystem":30}],16:[function(require,module,exports){
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AimComponent extends ECS.Component {
	constructor(camera) {
		super(ComponentT.AIM, {
			aimRotation: new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER)
		});
	}
}

module.exports = AimComponent;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],17:[function(require,module,exports){
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AnimationComponent extends ECS.Component {
	constructor() {
		super(ComponentT.ANIMATION, {
			mixer: undefined,
			animations: undefined,
			transitionToActionName: Constants.NO_ANIMATION,
			currentActionName: Constants.NO_ANIMATION,
			activeAction: undefined,
			fadeDuration: 0.2 //Amount of time it takes to fade into a new animation
		});
	}
}

module.exports = AnimationComponent;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],18:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class CameraComponent extends ECS.Component {
	constructor(camera) {
		super(ComponentT.CAMERA, {
			camera: camera,
			cameraOffset: new THREE.Vector3(0, 0, 0)
		});
	}
}

module.exports = CameraComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],19:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class ModelComponent extends ECS.Component {
	constructor() {
		super(ComponentT.MODEL, {
			modelInfo: undefined,
			mesh: undefined,
			modelOffset: new THREE.Vector3(0, 0, 0)
		});
	}
}

module.exports = ModelComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],20:[function(require,module,exports){
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class MovementBlendComponent extends ECS.Component {
	constructor() {
		super(ComponentT.MOVE_BLEND, {
			deltaForward: 0,
			deltaRight: 0,
			targetDeltaForward: 0,
			targetDeltaRight: 0,
			idleWeight: 1,
			restoreRate: 0.08,
			endDeltaRight : 0,
			idleAnimation: undefined,
			forwardAnimation: undefined,
			leftStrafeAnimation: undefined,
			rightStrafeAnimation: undefined
		});
	}
}

module.exports = MovementBlendComponent;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],21:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class SGLInputComponent extends ECS.Component {
	constructor() {
		super(ComponentT.INPUT, {
			enabled: true,

			moveForward: false,
			moveLeft: false,
			moveBackward: false,
			moveRight: false,
			moveUp: false,
			moveDown: false,
			sprint: false,
			jump: false,

			leftMouseClick: false,
			rightMouseClick: false,
			accumulatedMouseX: 0,
			accumulatedMouseY: 0,
			mouseMovementX: 0, //per 1 update tick
			mouseMovementY: 0  //per 1 update tick
		});
	}
}

module.exports = SGLInputComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],22:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class SGLSettingsComponent extends ECS.Component {
	constructor() {
		super(ComponentT.SETTINGS, {
			turnSpeed: 0.001
		});
	}
}

module.exports = SGLSettingsComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],23:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class StatsComponent extends ECS.Component {
	constructor() {
		super(ComponentT.STATS, {
			health: 0,
			physicalDmg: 0,
			critChance: 0,
			attackSpeed: 0,

			stamina: 0,
			movementSpeed: 0,

			shield: 0,
			physicalDef: 0,
			techDef: 0
		});
	}
}

module.exports = StatsComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],24:[function(require,module,exports){
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class TransformComponent extends ECS.Component {
	constructor() {
		super(ComponentT.TRANSFORM, {
			position: new THREE.Vector3(),
			rotation: new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER)
		});
	}
}

module.exports = TransformComponent;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],25:[function(require,module,exports){
var EntityT = require("../../common/ecs/EntityT");

var ECS = require("../../common/ecs/ECS");

var TransformComponent = require("../component/TransformComponent");

var ModelComponent = require("../component/ModelComponent");
var AnimationComponent = require("../component/AnimationComponent");
var MovementBlendComponent = require("../component/MovementBlendComponent");

var AimComponent = require("../component/AimComponent");

var StatsComponent = require("../component/StatsComponent");

class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityT.PLAYER, [
			new TransformComponent(),

			new ModelComponent(),
			new AnimationComponent(),
			new MovementBlendComponent(),

			new AimComponent(),

			new StatsComponent()
		]);
	}
}

module.exports = Player;

},{"../../common/ecs/ECS":8,"../../common/ecs/EntityT":10,"../component/AimComponent":16,"../component/AnimationComponent":17,"../component/ModelComponent":19,"../component/MovementBlendComponent":20,"../component/StatsComponent":23,"../component/TransformComponent":24}],26:[function(require,module,exports){
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class AnimationSystem extends ECS.System {
	setActionAnim(entity, name) {
		var animator = entity.get(ComponentT.ANIMATION);

		var previousAction = animator.activeAction;
		animator.activeAction = animator.animations.get(name);
		animator.currentActionName = name;

		this.activeAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
		previousAction.crossFadeTo(this.activeAction, duration);
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.MODEL)
			&& entity.contains(ComponentT.ANIMATION);
	}
	enter(entity) {
		var animator = entity.get(ComponentT.ANIMATION);
		var modelInfo = entity.get(ComponentT.MODEL).modelInfo;

		animator.mixer = modelInfo.mixer;
		animator.animations = modelInfo.animations;
		modelInfo.compileClips();
	}
	update(entity, delta) {
		var animator = entity.get(ComponentT.ANIMATION);

		/*
		this.count++;
		var walk = Math.abs(Math.sin(this.count / 300));
		if (walk > 0.5) walk = 0.5;
		var left = Math.abs(Math.cos(this.count / 300));
		if (left > 0.5) left = 0.5;
		animator.animations.get("Walk").setEffectiveWeight(walk * 2);
		animator.animations.get("StrafeLeft").setEffectiveWeight(left * 2);
		*/
		/*
		if (animator.transitionToActionName !== Constants.NO_ANIMATION) {
			if (animator.currentActionName === Constants.NO_ANIMATION) {
				animator.activeAction = animator.animations.get(animator.transitionToActionName);
				animator.activeAction.play();
				animator.currentActionName = animator.transitionToActionName;
			} else {
				//Fade to new action
				var previousAction = animator.activeAction;
				animator.activeAction = animator.animations.get(animator.transitionToActionName);

				if (animator.currentActionName !== animator.transitionToActionName) {
					previousAction.fadeOut(animator.fadeDuration);
				}

				animator.activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(animator.fadeDuration);
				animator.activeAction.play();
				animator.currentActionName = animator.transitionToActionName;
			}
			animator.transitionToActionName = Constants.NO_ANIMATION;
		}*/
		animator.mixer.update(delta * 0.001); //Convert from ms to seconds
	}
}

module.exports = AnimationSystem;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],27:[function(require,module,exports){
var Constants = require("../../common/Constants");
var LMath = require("../../common/math/LMath");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class FirstPersonSystem extends ECS.System {
	constructor() {
		super();
		this.vec = new THREE.Vector3();
	}
	/*
	onPoseChange(position, rotation) {
		this.entity.world.socket.emit(Constants.NET_CLIENT_POSE_CHANGE, position, rotation.toVector3());
	}*/
	moveForward(entity, distance) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		this.vec.setFromMatrixColumn(camera.matrix, 0);
		this.vec.crossVectors(camera.up, this.vec);
		entity.get(ComponentT.TRANSFORM).position.addScaledVector(this.vec, distance);
	}
	moveRight(entity, distance) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		this.vec.setFromMatrixColumn(camera.matrix, 0);
		entity.get(ComponentT.TRANSFORM).position.addScaledVector(this.vec, distance);
	}
	moveUp(entity, distance) {
		entity.get(ComponentT.TRANSFORM).position.y += distance;
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.CAMERA)
			&& entity.contains(ComponentT.AIM)
			&& entity.contains(ComponentT.ANIMATION)
			&& entity.contains(ComponentT.MOVE_BLEND);
	}
	enter(entity) {
		var camera = entity.get(ComponentT.CAMERA).camera;
		var cameraOffset = entity.get(ComponentT.CAMERA).cameraOffset;

		camera.position.addVectors(entity.get(ComponentT.TRANSFORM).position, cameraOffset);
		camera.rotation.copy(entity.get(ComponentT.AIM).aimRotation);
		entity.get(ComponentT.AIM).aimRotation.setFromQuaternion(camera.quaternion);

		var entityRotation = entity.get(ComponentT.TRANSFORM).rotation;
		entityRotation.set(entityRotation.x, entity.get(ComponentT.AIM).aimRotation.y, entityRotation.z);
	}
	update(entity, delta) {
		var entityPosition = entity.get(ComponentT.TRANSFORM).position;
		var input = this.manager.getSingleton(ComponentT.INPUT);

		//Calculate movement
		var adjustedSpeed = delta * entity.get(ComponentT.STATS).movementSpeed;
		if (input.sprint) adjustedSpeed *= Constants.SPRINT_ADJUSTMENT;
		var moveDir = new THREE.Vector3(input.moveForward - input.moveBackward, input.moveUp - input.moveDown, input.moveRight - input.moveLeft).normalize();
		var isMoving = (moveDir.length !== 0)
		this.moveForward(entity, adjustedSpeed * moveDir.x);
		this.moveUp(entity,  adjustedSpeed * moveDir.y);
		this.moveRight(entity, adjustedSpeed * moveDir.z);
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);
		moveBlend.targetDeltaForward = moveDir.x;
		moveBlend.targetDeltaRight = moveDir.z;

		//Get camera and cammera offset
		var camera = entity.get(ComponentT.CAMERA).camera;
		var cameraOffset = entity.get(ComponentT.CAMERA).cameraOffset;

		//Calculate camera rotation
		var aimRotation = entity.get(ComponentT.AIM).aimRotation;
		var previousRotX = aimRotation.x;
		var previousRotY = aimRotation.y;
		aimRotation.y -= input.mouseMovementX * this.manager.getSingleton(ComponentT.SETTINGS).turnSpeed;
		aimRotation.x -= input.mouseMovementY * this.manager.getSingleton(ComponentT.SETTINGS).turnSpeed;
		aimRotation.x = LMath.clamp(aimRotation.x, -Constants.PI_TWO, Constants.PI_TWO);
		var isTurning = previousRotX != aimRotation.x || previousRotY != aimRotation.y;

		if(isMoving || isTurning) {
			//Send state to server
		}
		if (isMoving) {
			camera.position.addVectors(entityPosition, cameraOffset);
		}
		if (isTurning) {
			camera.rotation.copy(aimRotation);
			var entityRotation = entity.get(ComponentT.TRANSFORM).rotation;
			entityRotation.set(entityRotation.x, aimRotation.y, entityRotation.z);
		}
	}
}

module.exports = FirstPersonSystem;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8,"../../common/math/LMath":12}],28:[function(require,module,exports){
var Utils = require("../../common/Utils");
var Constants = require("../../common/Constants");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class InputSystem extends ECS.System {
	constructor() {
		super();
		document.addEventListener("mousedown", Utils.bind(this, this.onMouseDown), false);
		document.addEventListener("mousemove", Utils.bind(this, this.onMouseMove), false);
		document.addEventListener("mouseup", Utils.bind(this, this.onMouseUp), false);
		document.addEventListener("keydown", Utils.bind(this, this.onKeyDown), false);
		document.addEventListener("keyup", Utils.bind(this, this.onKeyUp), false);
	}
	onMouseDown(event) {
		if (!this.input.enabled) return;
		switch(event.button) {
			case 0:
				this.input.leftMouseClick = true;
				break;
			case 2:
				this.input.rightMouseClick = true;
				break;
		}
	}
	onMouseMove(event) {
		if (!this.input.enabled) return;
		event = event || window.event;
		this.input.accumulatedMouseX += event.movementX;
		this.input.accumulatedMouseY += event.movementY;
	}
	onMouseUp(event) {
		if (!this.input.enabled) return;
		switch(event.button) {
			case 0:
				this.input.leftMouseClick = false;
				break;
			case 2:
				this.input.rightMouseClick = false;
				break;
		}
	}
	onKeyDown(event) {
		if (!this.input.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.input.moveForward = Constants.PRESSED; break;
			case 65: /*A*/ this.input.moveLeft = Constants.PRESSED; break;
			case 83: /*S*/ this.input.moveBackward = Constants.PRESSED; break;
			case 68: /*D*/ this.input.moveRight = Constants.PRESSED; break;

			case 82: /*R*/ this.input.moveUp = Constants.PRESSED; break;
			case 70: /*F*/ this.input.moveDown = Constants.PRESSED; break;

			case 16: /*Shift*/ this.input.sprint = Constants.PRESSED; break;
			case 32: /*Space*/ this.input.jump = Constants.PRESSED; break;
		}
	}
	onKeyUp(event) {
		if (!this.input.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.input.moveForward = Constants.RELEASED; break;
			case 65: /*A*/ this.input.moveLeft = Constants.RELEASED; break;
			case 83: /*S*/ this.input.moveBackward = Constants.RELEASED; break;
			case 68: /*D*/ this.input.moveRight = Constants.RELEASED; break;

			case 82: /*R*/ this.input.moveUp = Constants.RELEASED; break;
			case 70: /*F*/ this.input.moveDown = Constants.RELEASED; break;

			case 16: /*Shift*/ this.input.sprint = Constants.RELEASED; break;
			case 32: /*Space*/ this.input.jump = Constants.RELEASED; break;
		}
	}
	test(entity) {
		return entity.contains(ComponentT.INPUT);
	}
	enter(entity) {
		this.input = entity.get(ComponentT.INPUT);
	}
	update(entity) {
		this.input.mouseMovementX = this.input.accumulatedMouseX;
		this.input.mouseMovementY = this.input.accumulatedMouseY;

		this.input.accumulatedMouseX = 0;
		this.input.accumulatedMouseY = 0;
	}
	exit(entity) {
		entity.get(ComponentT.INPUT).enabled = false;
	}
}

module.exports = InputSystem;

},{"../../common/Constants":3,"../../common/Utils":5,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],29:[function(require,module,exports){
var Constants = require("../../common/Constants");
var LMath = require("../../common/math/LMath");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class MovementBlendSystem extends ECS.System {
	test(entity) {
		return entity.contains(ComponentT.ANIMATION)
			&& entity.contains(ComponentT.MOVE_BLEND);
	}
	enter(entity) {
		var animator = entity.get(ComponentT.ANIMATION);
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);

		moveBlend.idleAnimation = animator.animations.get(Constants.IDLE_ANIM).play();
		moveBlend.forwardAnimation = animator.animations.get(Constants.FORWARD_ANIM).play();
		moveBlend.leftAnimation = animator.animations.get(Constants.L_STRAFE_ANIM).play();
		moveBlend.rightAnimation = animator.animations.get(Constants.R_STRAFE_ANIM).play();
	}
	update(entity, delta) {
		var moveBlend = entity.get(ComponentT.MOVE_BLEND);

		moveBlend.deltaForward = LMath.lerp(moveBlend.deltaForward, moveBlend.targetDeltaForward, 0.2);
		moveBlend.deltaRight = LMath.lerp(moveBlend.deltaRight, moveBlend.targetDeltaRight, 0.2);

		var dF = moveBlend.deltaForward;
		var dR = moveBlend.deltaRight;

		var combinedDelta = Math.abs(dF) + Math.abs(dR);
		var idleWeight = 1 / (combinedDelta + 1);
		moveBlend.idleAnimation.setEffectiveWeight(moveBlend.idleWeight);

		if (Math.abs(dF) + Math.abs(dR) < moveBlend.restoreRate && moveBlend.idleWeight < 1) {
			moveBlend.idleWeight = LMath.lerp(moveBlend.idleWeight, 1, moveBlend.restoreRate / 3);
		} else if (Math.abs(dF) + Math.abs(dR) >= moveBlend.restoreRate) {
			moveBlend.idleWeight = LMath.lerp(moveBlend.idleWeight, 0, moveBlend.restoreRate);
		}
		if (moveBlend.idleWeight >= 1) {
			moveBlend.forwardAnimation.time = 0;
			moveBlend.leftAnimation.time = 0;
			moveBlend.rightAnimation.time = 0;
		}

		var forwardTime = 2 / (1 + Math.pow(5, -5 * dF)) - 1;
		var notForward = Math.abs(dR);
		moveBlend.forwardAnimation.setEffectiveTimeScale(forwardTime).setEffectiveWeight((1 - moveBlend.idleWeight) * (1 - notForward * notForward * notForward) * Math.abs(dF));

		//Calibrate timing for left animation
		var leftTime = 2 / (1 + Math.pow(5, -5 * -dR)) - 1;
		if (moveBlend.targetDeltaForward > 0.1 && -moveBlend.targetDeltaRight > 0.1) { //Forward Left
			if (forwardTime > leftTime) { //leftTime is always positive
				moveBlend.leftAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.leftAnimation.time;
			}
		} else if (-moveBlend.targetDeltaForward > 0.1 && moveBlend.targetDeltaRight > 0.1) { //Backward Right
			if (forwardTime < leftTime) { //leftTime is always negative
				moveBlend.leftAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.leftAnimation.time; //Problematic
			}
		}

		//Calibrate timing for right animation
		var rightTime = 2 / (1 + Math.pow(5, -5 * dR)) - 1;
		if (moveBlend.targetDeltaForward > 0.1 && moveBlend.targetDeltaRight > 0.1) { //Forward Right
			if (forwardTime > rightTime) {
				moveBlend.rightAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.rightAnimation.time;
			}
		} else if (-moveBlend.targetDeltaForward > 0.1 && -moveBlend.targetDeltaRight > 0.1) { //Backward Left
			if (forwardTime < rightTime) {
				moveBlend.rightAnimation.time = moveBlend.forwardAnimation.time;
			} else {
 				moveBlend.forwardAnimation.time = moveBlend.rightAnimation.time;
			}
		}

		if (moveBlend.targetDeltaForward > -0.1) {
			moveBlend.endDeltaRight = dR;
		} else {
			moveBlend.endDeltaRight = -dR;
		}

		moveBlend.leftAnimation.setEffectiveTimeScale(leftTime).setEffectiveWeight(LMath.lerp(moveBlend.leftAnimation.weight, -moveBlend.endDeltaRight, 0.1));
		moveBlend.rightAnimation.setEffectiveTimeScale(rightTime).setEffectiveWeight(LMath.lerp(moveBlend.rightAnimation.weight, moveBlend.endDeltaRight, 0.1));
	}
}

module.exports = MovementBlendSystem;

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8,"../../common/math/LMath":12}],30:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var Assets = require("../../Assets");

var ECS = require("../../common/ecs/ECS");

class RenderSystem extends ECS.System {
	constructor(scene) {
		super();
		this.scene = scene;
	}
	static initModel(entity, assetName) {
		if (!(entity.contains(ComponentT.TRANSFORM) && entity.contains(ComponentT.MODEL))) {
			throw "entity does not contain a \"Transform\" and a \"Model\"";
			return;
		}
		var pos = entity.get(ComponentT.TRANSFORM).position;
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).modelInfo = Assets.get(assetName).createClone();
		entity.get(ComponentT.MODEL).mesh = entity.get(ComponentT.MODEL).modelInfo.mesh;
		entity.get(ComponentT.MODEL).mesh.position.set(pos.x, pos.y, pos.z);
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.MODEL);
	}
	enter(entity) {
		this.scene.add(entity.get(ComponentT.MODEL).mesh);
	}
	update(entity) {
		var transform = entity.get(ComponentT.TRANSFORM);
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).mesh.position.addVectors(transform.position, entity.get(ComponentT.MODEL).modelOffset);
		entity.get(ComponentT.MODEL).mesh.rotation.copy(transform.rotation);
	}
	exit(entity) {
		this.scene.remove(entity.get(ComponentT.MODEL).mesh);
	}
}

module.exports = RenderSystem;

},{"../../Assets":1,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNsaWVudC9nYW1lL0Fzc2V0cy5qcyIsImNsaWVudC9nYW1lL2NsaWVudC5qcyIsImNsaWVudC9nYW1lL2NvbW1vbi9Db25zdGFudHMuanMiLCJjbGllbnQvZ2FtZS9jb21tb24vTWF0aC9MTWF0aC5qcyIsImNsaWVudC9nYW1lL2NvbW1vbi9VdGlscy5qcyIsImNsaWVudC9nYW1lL2NvbW1vbi9lY3MvQ29tcG9uZW50LmpzIiwiY2xpZW50L2dhbWUvY29tbW9uL2Vjcy9Db21wb25lbnRULmpzIiwiY2xpZW50L2dhbWUvY29tbW9uL2Vjcy9FQ1MuanMiLCJjbGllbnQvZ2FtZS9jb21tb24vZWNzL0VudGl0eS5qcyIsImNsaWVudC9nYW1lL2NvbW1vbi9lY3MvRW50aXR5VC5qcyIsImNsaWVudC9nYW1lL2NvbW1vbi9lY3MvU3lzdGVtLmpzIiwiY2xpZW50L2dhbWUvd29ybGQvQnVmZmVyTWFwQmxvY2suanMiLCJjbGllbnQvZ2FtZS93b3JsZC9QbGF0ZUZyYW1lLmpzIiwiY2xpZW50L2dhbWUvd29ybGQvV29ybGQuanMiLCJjbGllbnQvZ2FtZS93b3JsZC9jb21wb25lbnQvQWltQ29tcG9uZW50LmpzIiwiY2xpZW50L2dhbWUvd29ybGQvY29tcG9uZW50L0FuaW1hdGlvbkNvbXBvbmVudC5qcyIsImNsaWVudC9nYW1lL3dvcmxkL2NvbXBvbmVudC9DYW1lcmFDb21wb25lbnQuanMiLCJjbGllbnQvZ2FtZS93b3JsZC9jb21wb25lbnQvTW9kZWxDb21wb25lbnQuanMiLCJjbGllbnQvZ2FtZS93b3JsZC9jb21wb25lbnQvTW92ZW1lbnRCbGVuZENvbXBvbmVudC5qcyIsImNsaWVudC9nYW1lL3dvcmxkL2NvbXBvbmVudC9TR0xJbnB1dENvbXBvbmVudC5qcyIsImNsaWVudC9nYW1lL3dvcmxkL2NvbXBvbmVudC9TR0xTZXR0aW5nc0NvbXBvbmVudC5qcyIsImNsaWVudC9nYW1lL3dvcmxkL2NvbXBvbmVudC9TdGF0c0NvbXBvbmVudC5qcyIsImNsaWVudC9nYW1lL3dvcmxkL2NvbXBvbmVudC9UcmFuc2Zvcm1Db21wb25lbnQuanMiLCJjbGllbnQvZ2FtZS93b3JsZC9lbnRpdHkvUGxheWVyLmpzIiwiY2xpZW50L2dhbWUvd29ybGQvc3lzdGVtL0FuaW1hdGlvblN5c3RlbS5qcyIsImNsaWVudC9nYW1lL3dvcmxkL3N5c3RlbS9GaXJzdFBlcnNvblN5c3RlbS5qcyIsImNsaWVudC9nYW1lL3dvcmxkL3N5c3RlbS9JbnB1dFN5c3RlbS5qcyIsImNsaWVudC9nYW1lL3dvcmxkL3N5c3RlbS9Nb3ZlbWVudEJsZW5kU3lzdGVtLmpzIiwiY2xpZW50L2dhbWUvd29ybGQvc3lzdGVtL1JlbmRlclN5c3RlbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9WQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImNsYXNzIE1vZGVsSW5mbyB7XHJcblx0Y29uc3RydWN0b3IobmFtZSwgcGF0aCwgY2FsbGJhY2spIHtcclxuXHRcdHZhciBsb2FkZXIgPSBuZXcgVEhSRUUuR0xURkxvYWRlcigpO1xyXG5cdFx0bG9hZGVyLmxvYWQocGF0aCwgKG9iamVjdCkgPT4ge1xyXG5cdFx0XHR0aGlzLmdsdGZPYmplY3QgPSBvYmplY3Q7XHJcblx0XHRcdHRoaXMubWVzaCA9IGdldE1lc2hGcm9tR0xURihvYmplY3QpO1xyXG5cdFx0XHRpZiAoY2FsbGJhY2sgIT0gdW5kZWZpbmVkKSBjYWxsYmFjayhvYmplY3QpO1xyXG4gICAgXHR9KTtcclxuXHR9XHJcblx0Y3JlYXRlQW5pbWF0aW9uTWl4ZXIoKSB7XHJcblx0XHRyZXR1cm4gbmV3IFRIUkVFLkFuaW1hdGlvbk1peGVyKHRoaXMubWVzaCk7XHJcblx0fVxyXG5cdGNyZWF0ZU1vZGVsKCkge1xyXG5cdFx0cmV0dXJuIGNsb25lKHRoaXMubWVzaCk7XHJcblx0fVxyXG5cdGNyZWF0ZUNsb25lKCkge1xyXG5cdFx0dmFyIG1vZGVsQ2xvbmUgPSB7XHJcblx0XHRcdGdsdGZPYmplY3Q6IHRoaXMuZ2x0Zk9iamVjdCxcclxuXHRcdFx0bWVzaDogY2xvbmUodGhpcy5tZXNoKSxcclxuXHRcdFx0YW5pbWF0aW9uczogbmV3IE1hcCgpLFxyXG5cdFx0XHRjb21waWxlQ2xpcHM6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRcdHRoaXMuZ2x0Zk9iamVjdC5hbmltYXRpb25zLmZvckVhY2goYW5pbWF0aW9uID0+IHtcclxuXHRcdFx0XHRcdHZhciBhY3Rpb24gPSBtb2RlbENsb25lLm1peGVyLmNsaXBBY3Rpb24oYW5pbWF0aW9uKTtcclxuXHRcdFx0XHRcdG1vZGVsQ2xvbmUuYW5pbWF0aW9ucy5zZXQoYW5pbWF0aW9uLm5hbWUsIGFjdGlvbik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNldE9uZVNob3Q6IGZ1bmN0aW9uKGFuaW1hdGlvbk5hbWUpIHtcclxuXHRcdFx0XHR2YXIgYWN0aW9uID0gbW9kZWxDbG9uZS5hbmltYXRpb25zLmdldChhbmltYXRpb25OYW1lKTtcclxuXHRcdFx0XHRhY3Rpb24uY2xhbXBXaGVuRmluaXNoZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGFjdGlvbi5sb29wID0gVEhSRUUuTG9vcE9uY2U7XHJcblx0XHRcdH0sXHJcblx0XHRcdHNwbGljZUJvbmVzOiBmdW5jdGlvbihhbmltYXRpb25OYW1lLCBib25lTmFtZXMpIHtcclxuXHRcdFx0XHR2YXIgY2xpcCA9IHRoaXMuZ2x0Zk9iamVjdC5hbmltYXRpb25zLmZpbmQoKGl0ZW0pID0+IHtcclxuXHRcdFx0XHRcdHJldHVybiBpdGVtLm5hbWUgPT0gYW5pbWF0aW9uTmFtZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNsaXAudHJhY2tzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHR2YXIgdHJhY2sgPSBjbGlwLnRyYWNrc1tpXTtcclxuXHRcdFx0XHRcdHZhciBwb3NzaWJsZUJvbmVOYW1lID0gdHJhY2submFtZS5zcGxpdCgnLicpWzBdO1xyXG5cdFx0XHRcdFx0Ym9uZU5hbWVzLmZvckVhY2goKG5hbWUpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHBvc3NpYmxlQm9uZU5hbWUgPT09IG5hbWUpIHtcclxuXHRcdFx0XHRcdFx0XHRjbGlwLnRyYWNrcy5zcGxpY2UoaSwgMylcclxuXHRcdFx0XHRcdFx0XHRpIC09IDM7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG1vZGVsQ2xvbmUubWl4ZXIudW5jYWNoZUFjdGlvbihtb2RlbENsb25lLmFuaW1hdGlvbnMuZ2V0KGFuaW1hdGlvbk5hbWUpKTtcclxuXHRcdFx0XHRtb2RlbENsb25lLm1peGVyLmNsaXBBY3Rpb24oY2xpcCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdG1vZGVsQ2xvbmUubWl4ZXIgPSBuZXcgVEhSRUUuQW5pbWF0aW9uTWl4ZXIobW9kZWxDbG9uZS5tZXNoKTtcclxuXHJcblx0XHRyZXR1cm4gbW9kZWxDbG9uZTtcclxuXHR9XHJcbn1cclxuXHJcbmNvbnN0IEFzc2V0cyA9IHtcclxuXHRsb2FkaW5nUGVyY2VudDogMCxcclxuXHRtb2RlbEFzc2V0czogbmV3IE1hcCgpLFxyXG5cdGluaXQoKSB7XHJcblx0XHRUSFJFRS5EZWZhdWx0TG9hZGluZ01hbmFnZXIub25TdGFydCA9IGZ1bmN0aW9uICggdXJsLCBpdGVtc0xvYWRlZCwgaXRlbXNUb3RhbCApIHtcclxuXHRcdFx0Y29uc29sZS5sb2coICdTdGFydGVkIGxvYWRpbmcgZmlsZTogJyArIHVybCArICcuXFxuTG9hZGVkICcgKyBpdGVtc0xvYWRlZCArICcgb2YgJyArIGl0ZW1zVG90YWwgKyAnIGZpbGVzLicgKTtcclxuXHRcdH07XHJcblxyXG5cdFx0VEhSRUUuRGVmYXVsdExvYWRpbmdNYW5hZ2VyLm9uTG9hZCA9IGZ1bmN0aW9uICggKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCAnTG9hZGluZyBDb21wbGV0ZSEnKTtcclxuXHRcdH07XHJcblxyXG5cdFx0VEhSRUUuRGVmYXVsdExvYWRpbmdNYW5hZ2VyLm9uUHJvZ3Jlc3MgPSBmdW5jdGlvbiAoIHVybCwgaXRlbXNMb2FkZWQsIGl0ZW1zVG90YWwgKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCAnTG9hZGluZyBmaWxlOiAnICsgdXJsICsgJy5cXG5Mb2FkZWQgJyArIGl0ZW1zTG9hZGVkICsgJyBvZiAnICsgaXRlbXNUb3RhbCArICcgZmlsZXMuJyApO1xyXG5cdFx0XHRBc3NldHMubG9hZGluZ1BlcmNlbnQgPSBpdGVtc0xvYWRlZCAvIGl0ZW1zVG90YWw7XHJcblx0XHR9O1xyXG5cclxuXHRcdFRIUkVFLkRlZmF1bHRMb2FkaW5nTWFuYWdlci5vbkVycm9yID0gZnVuY3Rpb24gKCB1cmwgKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCAnVGhlcmUgd2FzIGFuIGVycm9yIGxvYWRpbmcgJyArIHVybCApO1xyXG5cdFx0fTtcclxuXHRcdEFzc2V0cy5sb2FkRm9udCgpO1xyXG5cclxuXHRcdC8vTG9hZCBtb2RlbHM6XHJcblx0XHRBc3NldHMubG9hZE1vZGVsKFwiUGxheWVyXCIsIFwiY2xpZW50L21vZGVscy9QbGF5ZXIvUGxheWVyLmdsdGZcIiwgb2JqZWN0ID0+IHtcclxuXHRcdFx0Z2V0TWVzaEZyb21HTFRGKG9iamVjdCkuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiB7XHJcblx0XHRcdFx0aWYgKGNoaWxkLmlzTWVzaCkge1xyXG5cdFx0XHRcdFx0Y2hpbGQubWF0ZXJpYWwuY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhmZjAwMDApO1xyXG5cdFx0XHRcdFx0Y2hpbGQubWF0ZXJpYWwubWV0YWxuZXNzID0gMC4xO1xyXG5cdFx0XHRcdFx0Y2hpbGQubWF0ZXJpYWwuZnJ1c3R1bUN1bGxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Y2hpbGQuZnJ1c3R1bUN1bGxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRBc3NldHMubG9hZE1vZGVsKFwiUGlzdG9sXCIsIFwiY2xpZW50L21vZGVscy9QaXN0b2wvUGlzdG9sLmdsdGZcIiwgb2JqZWN0ID0+IHtcclxuXHRcdFx0Z2V0TWVzaEZyb21HTFRGKG9iamVjdCkudHJhdmVyc2UobyA9PiB7XHJcblx0XHRcdFx0aWYgKG8uaXNNZXNoKSB7XHJcblx0XHRcdFx0XHRvLm1hdGVyaWFsLmNvbG9yID0gbmV3IFRIUkVFLkNvbG9yKDB4NTQ0YzRhKTtcclxuXHRcdFx0XHRcdG8uc2NhbGUuc2V0KDIsMiwyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHR9KTtcclxuXHJcblx0XHRBc3NldHMubG9hZE1vZGVsKFwiR2VuZXJpY0l0ZW1cIiwgXCJjbGllbnQvbW9kZWxzL1Bpc3RvbC9QaXN0b2wuZ2x0ZlwiLCBvYmplY3QgPT4ge1xyXG5cdFx0XHRnZXRNZXNoRnJvbUdMVEYob2JqZWN0KS50cmF2ZXJzZShvID0+IHtcclxuXHRcdFx0XHRpZiAoby5pc01lc2gpIHtcclxuXHRcdFx0XHRcdG8ubWF0ZXJpYWwuY29sb3IgPSBuZXcgVEhSRUUuQ29sb3IoMHhmZmZmZmYpO1xyXG5cdFx0XHRcdFx0by5zY2FsZS5zZXQoMiwyLDIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0bG9hZEZvbnQoKSB7XHJcblx0XHR2YXIgdGV4dExvYWQgPSBuZXcgVEhSRUUuRm9udExvYWRlcigpO1xyXG4gICBcdHRleHRMb2FkLmxvYWQoXCJjbGllbnQvZm9udHMvQWxkbyB0aGUgQXBhY2hlX1JlZ3VsYXIuanNvblwiLCBmdW5jdGlvbiAoIGZvbnQgKSB7XHJcblx0XHRcdEFzc2V0cy5ERUZBVUxUX0ZPTlQgPSBmb250O1xyXG4gICBcdH0pO1xyXG5cdH0sXHJcblx0bG9hZE1vZGVsKG5hbWUsIHBhdGgsIGNhbGxiYWNrKSB7XHJcblx0XHRBc3NldHMubW9kZWxBc3NldHMuc2V0KG5hbWUsIG5ldyBNb2RlbEluZm8obmFtZSwgcGF0aCwgY2FsbGJhY2spKTtcclxuXHR9LFxyXG5cdGdldChuYW1lKSB7XHJcblx0XHRyZXR1cm4gQXNzZXRzLm1vZGVsQXNzZXRzLmdldChuYW1lKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldE1lc2hGcm9tR0xURihnbHRmT2JqKSB7XHJcblx0cmV0dXJuIGdsdGZPYmouc2NlbmUuY2hpbGRyZW5bMF07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsb25lKHNvdXJjZSkgeyAvL0NvcGllZCBmcm9tIFRocmVlLmpzIFNrZWxldG9uVXRpbHNcclxuXHR2YXIgc291cmNlTG9va3VwID0gbmV3IE1hcCgpO1xyXG5cdHZhciBjbG9uZUxvb2t1cCA9IG5ldyBNYXAoKTtcclxuXHJcblx0dmFyIGNsb25lID0gc291cmNlLmNsb25lKCk7XHJcblxyXG5cdHBhcmFsbGVsVHJhdmVyc2UoIHNvdXJjZSwgY2xvbmUsIGZ1bmN0aW9uICggc291cmNlTm9kZSwgY2xvbmVkTm9kZSApIHtcclxuXHJcblx0XHRzb3VyY2VMb29rdXAuc2V0KCBjbG9uZWROb2RlLCBzb3VyY2VOb2RlICk7XHJcblx0XHRjbG9uZUxvb2t1cC5zZXQoIHNvdXJjZU5vZGUsIGNsb25lZE5vZGUgKTtcclxuXHJcblx0fSApO1xyXG5cclxuXHRjbG9uZS50cmF2ZXJzZSggZnVuY3Rpb24gKCBub2RlICkge1xyXG5cdFx0aWYgKCAhIG5vZGUuaXNTa2lubmVkTWVzaCApIHJldHVybjtcclxuXHJcblx0XHR2YXIgY2xvbmVkTWVzaCA9IG5vZGU7XHJcblx0XHR2YXIgc291cmNlTWVzaCA9IHNvdXJjZUxvb2t1cC5nZXQoIG5vZGUgKTtcclxuXHRcdHZhciBzb3VyY2VCb25lcyA9IHNvdXJjZU1lc2guc2tlbGV0b24uYm9uZXM7XHJcblxyXG5cdFx0Y2xvbmVkTWVzaC5za2VsZXRvbiA9IHNvdXJjZU1lc2guc2tlbGV0b24uY2xvbmUoKTtcclxuXHRcdGNsb25lZE1lc2guYmluZE1hdHJpeC5jb3B5KCBzb3VyY2VNZXNoLmJpbmRNYXRyaXggKTtcclxuXHRcdGNsb25lZE1lc2guc2tlbGV0b24uYm9uZXMgPSBzb3VyY2VCb25lcy5tYXAoIGZ1bmN0aW9uICggYm9uZSApIHtcclxuXHRcdFx0cmV0dXJuIGNsb25lTG9va3VwLmdldCggYm9uZSApO1xyXG5cdFx0fSApO1xyXG5cdFx0Y2xvbmVkTWVzaC5iaW5kKCBjbG9uZWRNZXNoLnNrZWxldG9uLCBjbG9uZWRNZXNoLmJpbmRNYXRyaXggKTtcclxuXHR9ICk7XHJcblx0cmV0dXJuIGNsb25lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJhbGxlbFRyYXZlcnNlKCBhLCBiLCBjYWxsYmFjayApIHtcclxuXHRjYWxsYmFjayggYSwgYiApO1xyXG5cdGZvciAoIHZhciBpID0gMDsgaSA8IGEuY2hpbGRyZW4ubGVuZ3RoOyBpICsrICkge1xyXG5cdFx0cGFyYWxsZWxUcmF2ZXJzZSggYS5jaGlsZHJlblsgaSBdLCBiLmNoaWxkcmVuWyBpIF0sIGNhbGxiYWNrICk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFzc2V0cztcclxuIiwidmFyIHNjcmVlblc7XHJcbnZhciBzY3JlZW5IO1xyXG5cclxudmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBBc3NldHMgPSByZXF1aXJlKFwiLi9Bc3NldHNcIik7XHJcblxyXG52YXIgQ29tcG9uZW50VCA9IHJlcXVpcmUoXCIuL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBXb3JsZCA9IHJlcXVpcmUoXCIuL3dvcmxkL1dvcmxkXCIpO1xyXG5cclxuY29uc3Qgc29ja2V0ID0gaW8oKTtcclxuXHJcbmNvbnN0IG1haW4gPSB7XHJcblx0aW5pdDogZnVuY3Rpb24oKSB7XHJcblx0XHRBc3NldHMuaW5pdCgpO1xyXG5cdFx0bWFpbi5pbml0TWVudSgpO1xyXG5cdFx0bWFpbi5pbml0UGF1c2UoKTtcclxuXHJcblx0XHRmdW5jdGlvbiBvblBvaW50ZXJsb2NrQ2hhbmdlKCkge1xyXG5cdFx0XHRpZiAoZG9jdW1lbnQucG9pbnRlckxvY2tFbGVtZW50ICE9PSBtYWluLndvcmxkLmRvbUVsZW1lbnQpIHtcclxuXHRcdFx0XHRtYWluLndvcmxkLmVudGl0eU1hbmFnZXIuZ2V0U2luZ2xldG9uKENvbXBvbmVudFQuSU5QVVQpLmVuYWJsZWQgPSBmYWxzZTtcclxuXHRcdFx0XHRtYWluLnBhdXNlTWVudU9wYWNpdHkgPSAwLjAxO1xyXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGF1c2VNZW51XCIpLnN0eWxlLm9wYWNpdHkgPSAxO1xyXG5cdFx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGF1c2VNZW51XCIpLnN0eWxlLnBvaW50ZXJFdmVudHMgPSBcImF1dG9cIjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0c29ja2V0Lm9uKENvbnN0YW50cy5ORVRfSU5JVF9XT1JMRCwgZnVuY3Rpb24od29ybGRJbmZvKSB7XHJcblx0XHRcdG1haW4ud29ybGQgPSBuZXcgV29ybGQoc29ja2V0LCB3b3JsZEluZm8pO1xyXG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmxvY2tjaGFuZ2VcIiwgb25Qb2ludGVybG9ja0NoYW5nZSwgZmFsc2UpO1xyXG5cdFx0XHRtYWluLndvcmxkLmRvbUVsZW1lbnQucmVxdWVzdFBvaW50ZXJMb2NrKCk7XHJcblx0XHRcdG1haW4ud29ybGQudXBkYXRlV2luZG93U2l6ZShzY3JlZW5XLCBzY3JlZW5IKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHNvY2tldC5vbihDb25zdGFudHMuTkVUX1NFUlZFUl9UT19DTElFTlRfRk9SQ0VfRElTQ09OTkVDVCwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdG1haW4uc3RvcEdhbWUoKTtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0aW5pdE1lbnU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGJsb2NrZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJsb2NrZXJcIik7XHJcblx0XHR2YXIgbWFpbk1lbnUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5NZW51XCIpO1xyXG5cclxuXHRcdHZhciByb29tSURJbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicm9vbUlESW5wdXRcIilcclxuXHRcdHZhciB1c2VybmFtZUlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VybmFtZUlucHV0XCIpO1xyXG5cdFx0dmFyIGJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicGxheUJ0blwiKTtcclxuXHJcblx0XHQvL2h0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQ2OTM1Ny9odG1sLXRleHQtaW5wdXQtYWxsb3ctb25seS1udW1lcmljLWlucHV0XHJcblx0XHRmdW5jdGlvbiBzZXRJbnB1dEZpbHRlcih0ZXh0Ym94LCBpbnB1dEZpbHRlcikge1xyXG5cdFx0XHRbXCJpbnB1dFwiLCBcImtleWRvd25cIiwgXCJrZXl1cFwiLCBcIm1vdXNlZG93blwiLCBcIm1vdXNldXBcIiwgXCJzZWxlY3RcIiwgXCJjb250ZXh0bWVudVwiLCBcImRyb3BcIl0uZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xyXG5cdFx0XHQgXHR0ZXh0Ym94LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQgICBcdGlmIChpbnB1dEZpbHRlcih0aGlzLnZhbHVlKSkge1xyXG5cdFx0XHQgICBcdFx0dGhpcy5vbGRWYWx1ZSA9IHRoaXMudmFsdWU7XHJcblx0XHRcdCAgICAgXHRcdHRoaXMub2xkU2VsZWN0aW9uU3RhcnQgPSB0aGlzLnNlbGVjdGlvblN0YXJ0O1xyXG5cdFx0XHQgICAgIFx0XHR0aGlzLm9sZFNlbGVjdGlvbkVuZCA9IHRoaXMuc2VsZWN0aW9uRW5kO1xyXG5cdFx0XHQgICBcdH0gZWxzZSBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShcIm9sZFZhbHVlXCIpKSB7XHJcblx0XHRcdCAgICAgXHRcdHRoaXMudmFsdWUgPSB0aGlzLm9sZFZhbHVlO1xyXG5cdFx0XHQgICAgIFx0XHR0aGlzLnNldFNlbGVjdGlvblJhbmdlKHRoaXMub2xkU2VsZWN0aW9uU3RhcnQsIHRoaXMub2xkU2VsZWN0aW9uRW5kKTtcclxuXHRcdFx0ICAgXHR9IGVsc2Uge1xyXG5cdFx0XHQgICAgIFx0XHR0aGlzLnZhbHVlID0gXCJcIjtcclxuXHRcdFx0ICAgXHR9XHJcblx0XHRcdCBcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHNldElucHV0RmlsdGVyKHJvb21JRElucHV0LCBmdW5jdGlvbih2YWx1ZSkge3JldHVybiAvXlxcZCpcXC4/XFxkKiQvLnRlc3QodmFsdWUpO30pO1xyXG5cclxuXHRcdGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdGlmICh1c2VybmFtZUlucHV0LnZhbHVlLmxlbmd0aCA8IDEpIHJldHVybjtcclxuXHRcdFx0YmxvY2tlci5zdHlsZS5vcGFjaXR5ID0gMDtcclxuXHRcdFx0bWFpbk1lbnUuc3R5bGUub3BhY2l0eSA9IDA7XHJcblx0XHRcdG1haW4ucGF1c2VNZW51T3BhY2l0eSA9IDA7XHJcblxyXG5cdFx0XHRzb2NrZXQuZW1pdChDb25zdGFudHMuTkVUX1NPQ0tFVF9QTEFZRVJfTE9HSU4sIHJvb21JRElucHV0LnZhbHVlLCB1c2VybmFtZUlucHV0LnZhbHVlKTtcclxuXHRcdFx0cm9vbUlESW5wdXQudmFsdWUgPSBcIlwiO1xyXG5cdFx0XHR1c2VybmFtZUlucHV0LnZhbHVlID0gXCJcIjtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0aW5pdFBhdXNlOiBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VNZW51T3BhY2l0eSA9IDA7XHJcblx0XHR2YXIgYmxvY2tlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYmxvY2tlclwiKTtcclxuXHRcdHZhciBwYXVzZU1lbnUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBhdXNlTWVudVwiKTtcclxuXHRcdHZhciBwYXVzZUNvbXBvbmVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBhdXNlQ29tcG9uZW50c1wiKTtcclxuXHRcdHZhciBvcHRpb25zQ29tcG9uZW50cyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3B0aW9uc0NvbXBvbmVudHNcIik7XHJcblxyXG5cdFx0dmFyIGNvbnRpbnVlQnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb250aW51ZUJ0blwiKVxyXG5cdFx0dmFyIG9wdGlvbnNCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm9wdGlvbnNCdG5cIilcclxuXHRcdHZhciBleGl0QnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWF2ZUJ0blwiKTtcclxuXHJcblx0XHR2YXIgbW91c2VTZW5zaXRpdml0eVJhbmdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtb3VzZVNlbnNpdGl2aXR5UmFuZ2VcIik7XHJcblx0XHR2YXIgbW91c2VTZW5zaXRpdml0eU91dHB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibW91c2VTZW5zaXRpdml0eU91dHB1dFwiKTtcclxuXHRcdHZhciBvcHRpb25zQmFja0J0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3B0aW9uc0JhY2tCdG5cIik7XHJcblxyXG5cdFx0Y29udGludWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRibG9ja2VyLnN0eWxlLm9wYWNpdHkgPSAwO1xyXG5cdFx0XHRwYXVzZU1lbnUuc3R5bGUub3BhY2l0eSA9IDA7XHJcblx0XHRcdG1haW4ucGF1c2VNZW51T3BhY2l0eSA9IDA7XHJcblxyXG5cdFx0XHRtYWluLndvcmxkLmRvbUVsZW1lbnQucmVxdWVzdFBvaW50ZXJMb2NrKCk7XHJcblx0XHRcdG1haW4ud29ybGQuZW50aXR5TWFuYWdlci5nZXRTaW5nbGV0b24oQ29tcG9uZW50VC5JTlBVVCkuZW5hYmxlZCA9IHRydWU7XHJcblx0XHR9KTtcclxuXHJcblx0XHRvcHRpb25zQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0cGF1c2VDb21wb25lbnRzLnN0eWxlLm9wYWNpdHkgPSAwO1xyXG5cdFx0XHRvcHRpb25zQ29tcG9uZW50cy5zdHlsZS5vcGFjaXR5ID0gMTtcclxuXHRcdFx0b3B0aW9uc0NvbXBvbmVudHMuc3R5bGUucG9pbnRlckV2ZW50cyA9IFwiYXV0b1wiO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bGVhdmVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRtYWluLnN0b3BHYW1lKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRtb3VzZVNlbnNpdGl2aXR5UmFuZ2Uub25pbnB1dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgXHRcdG1vdXNlU2Vuc2l0aXZpdHlPdXRwdXQudmFsdWUgPSBtb3VzZVNlbnNpdGl2aXR5UmFuZ2UudmFsdWU7XHJcblx0XHRcdG1haW4ud29ybGQuZW50aXR5TWFuYWdlci5nZXRTaW5nbGV0b24oQ29tcG9uZW50VC5TRVRUSU5HUykudHVyblNwZWVkID0gbW91c2VTZW5zaXRpdml0eU91dHB1dC52YWx1ZSAqIENvbnN0YW50cy5UVVJOX1NQRUVEX0FESlVTVF9SQVRJTztcclxuXHRcdH07XHJcblxyXG5cdFx0bW91c2VTZW5zaXRpdml0eU91dHB1dC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0bW91c2VTZW5zaXRpdml0eU91dHB1dC52YWx1ZSA9IE1hdGgubWluKE1hdGgubWF4KG1vdXNlU2Vuc2l0aXZpdHlPdXRwdXQudmFsdWUsIG1vdXNlU2Vuc2l0aXZpdHlPdXRwdXQubWluKSwgbW91c2VTZW5zaXRpdml0eU91dHB1dC5tYXgpO1xyXG5cdFx0XHRtb3VzZVNlbnNpdGl2aXR5UmFuZ2UudmFsdWUgPSBtb3VzZVNlbnNpdGl2aXR5T3V0cHV0LnZhbHVlO1xyXG5cdFx0XHRtYWluLndvcmxkLmVudGl0eU1hbmFnZXIuZ2V0U2luZ2xldG9uKENvbXBvbmVudFQuU0VUVElOR1MpLnR1cm5TcGVlZCA9IG1vdXNlU2Vuc2l0aXZpdHlPdXRwdXQudmFsdWUgKiBDb25zdGFudHMuVFVSTl9TUEVFRF9BREpVU1RfUkFUSU87XHJcblx0XHR9KTtcclxuXHJcblx0XHRvcHRpb25zQmFja0J0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKSB7XHJcblx0XHRcdHBhdXNlQ29tcG9uZW50cy5zdHlsZS5vcGFjaXR5ID0gMTtcclxuXHRcdFx0b3B0aW9uc0NvbXBvbmVudHMuc3R5bGUub3BhY2l0eSA9IDA7XHJcblx0XHRcdG9wdGlvbnNDb21wb25lbnRzLnN0eWxlLnBvaW50ZXJFdmVudHMgPSBcIm5vbmVcIjtcclxuXHRcdH0pO1xyXG5cdH0sXHJcblx0c3RvcEdhbWU6IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKG1haW4ud29ybGQgIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdGJsb2NrZXIuc3R5bGUub3BhY2l0eSA9IDE7XHJcblx0XHRcdHBhdXNlTWVudS5zdHlsZS5vcGFjaXR5ID0gMDtcclxuXHRcdFx0bWFpbi5wYXVzZU1lbnVPcGFjaXR5ID0gMDtcclxuXHRcdFx0cGF1c2VNZW51LnN0eWxlLnBvaW50ZXJFdmVudHMgPSBcIm5vbmVcIjtcclxuXHJcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbk1lbnVcIikuc3R5bGUub3BhY2l0eSA9IDE7XHJcblx0XHRcdG1haW4ud29ybGQuZGlzcG9zZSgpO1xyXG5cdFx0XHRtYWluLndvcmxkID0gbnVsbDtcclxuXHRcdFx0c29ja2V0LmVtaXQoQ29uc3RhbnRzLk5FVF9TT0NLRVRfUExBWUVSX0xFQVZFX1JPT00pO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0dXBkYXRlOiBmdW5jdGlvbihkZWx0YSkge1xyXG5cdFx0dGhpcy51cGRhdGVTaXplKCk7XHJcblxyXG5cdFx0aWYgKHRoaXMud29ybGQgIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHRoaXMud29ybGQudXBkYXRlKGRlbHRhKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5wYXVzZU1lbnVPcGFjaXR5ID4gMCAmJiB0aGlzLnBhdXNlTWVudU9wYWNpdHkgPCAxKSB7XHJcblx0XHRcdHRoaXMucGF1c2VNZW51T3BhY2l0eSArPSAwLjA1O1xyXG5cdFx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJsb2NrZXJcIikuc3R5bGUub3BhY2l0eSA9IHRoaXMucGF1c2VNZW51T3BhY2l0eTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLndvcmxkICE9IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLndvcmxkLnJlbmRlcigpO1xyXG5cdFx0fVxyXG5cdH0sXHJcblx0dXBkYXRlU2l6ZTogZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgcHJldlcgPSBzY3JlZW5XO1xyXG5cdFx0dmFyIHByZXZIID0gc2NyZWVuSDtcclxuXHRcdHNjcmVlblcgPSB3aW5kb3cuaW5uZXJXaWR0aCB8fFxyXG5cdCAgIFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIHx8XHJcblx0ICAgIFx0ZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aDtcclxuXHQgIFx0c2NyZWVuSCA9IHdpbmRvdy5pbm5lckhlaWdodCB8fFxyXG5cdCAgICBcdGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgfHxcclxuXHQgICAgXHRkb2N1bWVudC5ib2R5LmNsaWVudEhlaWdodDtcclxuXHRcdGlmIChwcmV2VyAhPSBzY3JlZW5XIHx8IHByZXZIICE9IHNjcmVlbkgpIHtcclxuXHRcdFx0aWYgKG1haW4ud29ybGQgIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0bWFpbi53b3JsZC51cGRhdGVXaW5kb3dTaXplKHNjcmVlblcsIHNjcmVlbkgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG53aW5kb3cub25sb2FkID0gKCkgPT4ge1xyXG5cdGRvY3VtZW50LmJvZHkuc3R5bGUubWFyZ2luVG9wID0gMDtcclxuIFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5MZWZ0ID0gMDtcclxuIFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5tYXJnaW5Cb3R0b20gPSAwO1xyXG4gXHRkb2N1bWVudC5ib2R5LnN0eWxlLm1hcmdpblVwID0gMDtcclxuXHJcblx0bWFpbi51cGRhdGVTaXplKCk7XHJcblx0bWFpbi5pbml0KCk7XHJcblxyXG5cdHZhciBkaXNwbGF5ZWRGUFMgPSBDb25zdGFudHMuRlBTO1xyXG5cdHZhciBsYXN0VXBkYXRlVGltZSA9IERhdGUubm93KCk7XHJcblx0c2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0dmFyIGRlbHRhID0gY3VycmVudFRpbWUgLSBsYXN0VXBkYXRlVGltZTtcclxuXHRcdHZhciBhY3R1YWxGUFMgPSAxMDAwIC8gZGVsdGE7XHJcblxyXG5cdFx0ZGlzcGxheWVkRlBTID0gYWN0dWFsRlBTICogKDEuMCAtIENvbnN0YW50cy5GUFNfU01PT1RISU5HX1dFSUdIVF9SQVRJTykgKyBkaXNwbGF5ZWRGUFMgKiBDb25zdGFudHMuRlBTX1NNT09USElOR19XRUlHSFRfUkFUSU87XHJcblx0XHQvL2NvbnNvbGUubG9nKGRpc3BsYXllZEZQUyk7IFRPRE8gdGhpcyBkb2Vzbid0IHdvcms/XHJcblxyXG4gXHRcdG1haW4udXBkYXRlKGRlbHRhKTtcclxuIFx0XHRtYWluLnJlbmRlcigpO1xyXG5cdFx0bGFzdFVwZGF0ZVRpbWUgPSBjdXJyZW50VGltZTtcclxuXHR9LCAxMDAwLjAgLyBDb25zdGFudHMuRlBTKTtcclxufVxyXG4iLCJjb25zdCBDb25zdGFudHMgPSB7XHJcblx0Ly9QZXJmb3JtYW5jZVxyXG5cdEZQUzogNjAsXHJcblx0RlBTX1NNT09USElOR19XRUlHSFRfUkFUSU86IDAuOSxcclxuXHRTRVJWRVJfU0VORF9SQVRFOiAyMCxcclxuXHJcblx0Ly9BbmltYXRpb25cclxuXHRJRExFX0FOSU06IFwiSWRsZVwiLFxyXG5cdEZPUldBUkRfQU5JTTogXCJGb3J3YXJkXCIsXHJcblx0TF9TVFJBRkVfQU5JTTogXCJTdHJhZmVMZWZ0XCIsXHJcblx0Ul9TVFJBRkVfQU5JTTogXCJTdHJhZmVSaWdodFwiLFxyXG5cdEpVTVBfQU5JTTogXCJKdW1wXCIsXHJcblxyXG5cdC8vTWF0aFxyXG5cdFJPVEFUSU9OX09SREVSOiBcIllYWlwiLFxyXG5cdFBJX1RXTzogTWF0aC5QSSAvIDIsXHJcblxyXG5cdC8vTW92ZW1lbnRcclxuXHRESUFHT05BTF9TUEVFRF9BREpVU1RNRU5UOiAwLjcwMjEsXHJcblx0U1BSSU5UX0FESlVTVE1FTlQ6IDIuMSxcclxuXHJcblx0Ly9Xb3JsZCBtZWFzdXJlbWVudHNcclxuXHRNQVBfQkxPQ0tfTEVOR1RIOiA1LFxyXG5cdFBMQVlFUl9IRUlHSFRfT0ZGU0VUOiAxLjgsXHJcblxyXG5cdC8vRGVidWcgZmxhZ3NcclxuXHRERUJVR19TSE9XX0VOVElUWV9CT1VORElOR19CT1hFUzogdHJ1ZSxcclxuXHRERUJVR19ET19FTlRJVFlfSU5URVJQT0xBVElPTjogdHJ1ZSxcclxuXHJcblx0Ly9NaXNjZWxsYW5lb3VzXHJcblx0UFJFU1NFRDogMSxcclxuXHRSRUxFQVNFRDogMCxcclxuXHRUVVJOX1NQRUVEX0FESlVTVF9SQVRJTzogMC4wMDA1LFxyXG5cdE5PX0FOSU1BVElPTjogXCJub19hbmltXCIsXHJcblxyXG5cdC8vTmV0d29ya2luZyBldmVudHNcclxuXHRORVRfU09DS0VUX1BMQVlFUl9MT0dJTjogXCJzb2NrZXRfcGxheWVyX2xvZ2luXCIsXHJcblx0TkVUX1NPQ0tFVF9QTEFZRVJfTEVBVkVfUk9PTTogXCJzb2NrZXRfcGxheWVyX2xlYXZlXCIsXHJcblx0TkVUX1NFUlZFUl9UT19DTElFTlRfRk9SQ0VfRElTQ09OTkVDVDogXCJmb3JjZV9kaXNjb25uZWN0XCIsXHJcblx0TkVUX0lOSVRfV09STEQ6IFwiaW5pdF9tYXBcIixcclxuXHRORVRfV09STERfU1RBVEVfVVBEQVRFOiBcInN0YXRlX3VwZGF0ZVwiLFxyXG5cdE5FVF9DTElFTlRfUE9TRV9DSEFOR0U6IFwiY2xpZW50X3Bvc2VfY2hhbmdlXCIsXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29uc3RhbnRzO1xyXG4iLCJjb25zdCBMTWF0aCA9IHtcclxuXHRsZXJwOiBmdW5jdGlvbih4MCwgeDEsIHBlcmNlbnQpIHtcclxuXHRcdHZhciBwID0gTE1hdGguY2xhbXAocGVyY2VudCwgMC4wLCAxLjApO1xyXG5cdFx0cmV0dXJuIHgwICsgKHgxIC0geDApICogcDtcclxuXHR9LFxyXG5cdGNsYW1wOiBmdW5jdGlvbih2YWx1ZSwgbWluLCBtYXgpIHtcclxuXHRcdHJldHVybiBNYXRoLm1heChNYXRoLm1pbih2YWx1ZSwgbWF4KSwgbWluKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTE1hdGg7XHJcbiIsImNvbnN0IFV0aWxzID0ge1xyXG5cdGJpbmQ6IGZ1bmN0aW9uKHNjb3BlLCBmbikge1xyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uIG9uRXZlbnQoKSB7XHJcblx0XHRcdGZuLmFwcGx5KHNjb3BlLCBhcmd1bWVudHMpO1xyXG5cdFx0fTtcclxuXHR9LFxyXG5cdHNwbGljZTogZnVuY3Rpb24oYXJyYXksIHN0YXJ0SW5kZXgsIHJlbW92ZUNvdW50KSB7XHJcblx0ICB2YXIgbGVuID0gYXJyYXkubGVuZ3RoO1xyXG5cdCAgdmFyIHJlbW92ZUxlbiA9IDA7XHJcblxyXG5cdCAgaWYgKHN0YXJ0SW5kZXggPj0gbGVuIHx8IHJlbW92ZUNvdW50ID09PSAwKSB7XHJcblx0ICAgIHJldHVybjtcclxuXHQgIH1cclxuXHJcblx0ICByZW1vdmVDb3VudCA9IHN0YXJ0SW5kZXggKyByZW1vdmVDb3VudCA+IGxlbiA/IChsZW4gLSBzdGFydEluZGV4KSA6IHJlbW92ZUNvdW50O1xyXG5cdCAgcmVtb3ZlTGVuID0gbGVuIC0gcmVtb3ZlQ291bnQ7XHJcblxyXG5cdCAgZm9yICh2YXIgaSA9IHN0YXJ0SW5kZXg7IGkgPCBsZW47IGkgKz0gMSkge1xyXG5cdCAgICBhcnJheVtpXSA9IGFycmF5W2kgKyByZW1vdmVDb3VudF07XHJcblx0ICB9XHJcblxyXG5cdCAgYXJyYXkubGVuZ3RoID0gcmVtb3ZlTGVuO1xyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcclxuIiwiY2xhc3MgQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3Rvcih0eXBlLCBkYXRhKSB7XHJcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xyXG5cdFx0dGhpcy5kYXRhID0gZGF0YTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29tcG9uZW50O1xyXG4iLCJjb25zdCBDb21wb25lbnRUID0ge1xyXG5cdElOUFVUOiBcImlucHV0XCIsXHJcblx0U0VUVElOR1M6IFwic2V0dGluZ3NcIixcclxuXHJcblx0VFJBTlNGT1JNOiBcInRyYW5zZm9ybVwiLFxyXG5cclxuXHRNT0RFTDogXCJtb2RlbFwiLFxyXG5cdEFOSU1BVElPTjogXCJhbmltXCIsXHJcblx0Qk9ORV9BTklNOiBcImJvbmVfYW5pbVwiLFxyXG5cdE1PVkVfQkxFTkQ6IFwibW92ZV9ibGVuZFwiLFxyXG5cclxuXHRDQU1FUkE6IFwiY2FtZXJhXCIsXHJcblx0QUlNOiBcImFpbVwiLFxyXG5cclxuXHRTVEFUUzogXCJzdGF0c1wiLFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvbmVudFQ7XHJcbiIsImNvbnN0IFV0aWxzID0gcmVxdWlyZShcIi4uL1V0aWxzXCIpO1xyXG5jb25zdCBFbnRpdHlUID0gcmVxdWlyZShcIi4vRW50aXR5VFwiKTtcclxuXHJcbmNvbnN0IEVudGl0eSA9IHJlcXVpcmUoXCIuL0VudGl0eVwiKTtcclxuY29uc3QgQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vQ29tcG9uZW50XCIpO1xyXG5jb25zdCBTeXN0ZW0gPSByZXF1aXJlKFwiLi9TeXN0ZW1cIik7XHJcblxyXG4vL0FkYXB0aW9uIG9mIGh0dHBzOi8vZ2l0aHViLmNvbS95YWdsL2Vjc1xyXG5jbGFzcyBNYW5hZ2VyIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuZW50aXRpZXMgPSBbXTtcclxuXHRcdHRoaXMuc3lzdGVtcyA9IFtdO1xyXG5cclxuXHRcdHRoaXMuYXJjaGV0eXBlcyA9IFtdO1xyXG5cclxuXHRcdHRoaXMuZW50aXRpZXNTeXN0ZW1zRGlydHkgPSBbXTtcclxuXHJcblx0XHR0aGlzLmFkbWluRW50aXR5ID0gbmV3IEVudGl0eSgwLCBFbnRpdHlULkFETUlOKTtcclxuXHRcdHRoaXMuYWRkRW50aXR5KHRoaXMuYWRtaW5FbnRpdHkpO1xyXG5cdH1cclxuXHRnZXRFbnRpdHlCeUlkKGlkKSB7XHJcbiAgIFx0Zm9yICh2YXIgaSA9IDAsIGVudGl0eTsgZW50aXR5ID0gdGhpcy5lbnRpdGllc1tpXTsgaSsrKSB7XHJcbiAgICAgIFx0aWYgKGVudGl0eS5pZCA9PT0gaWQpIHtcclxuICAgICAgICBcdFx0cmV0dXJuIGVudGl0eTtcclxuICAgICAgXHR9XHJcbiAgICBcdH1cclxuICAgIFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG4gIFx0YWRkRW50aXR5KGVudGl0eSkge1xyXG4gICBcdHRoaXMuZW50aXRpZXMucHVzaChlbnRpdHkpO1xyXG4gICAgXHRlbnRpdHkuYWRkVG9NYW5hZ2VyKHRoaXMpO1xyXG4gIFx0fVxyXG5cdHJlbW92ZUVudGl0eUJ5SWQoaWQpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwLCBlbnRpdHk7IGVudGl0eSA9IHRoaXMuZW50aXRpZXNbaV07IGkrKykge1xyXG5cdFx0XHRpZiAoZW50aXR5LmlkID09PSBlbnRpdHlJZCkge1xyXG4gICAgICBcdFx0ZW50aXR5LmRpc3Bvc2UoKTtcclxuICAgICAgICBcdFx0dGhpcy5yZW1vdmVFbnRpdHlGcm9tRGlydHkoZW50aXR5KTtcclxuICAgICAgICBcdFx0VXRpbHMuc3BsaWNlKHRoaXMuZW50aXRpZXMsIGksIDEpO1xyXG4gICAgICBcdFx0cmV0dXJuIGVudGl0eTtcclxuICAgXHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbiAgXHRyZW1vdmVFbnRpdHkoZW50aXR5KSB7XHJcbiAgIFx0dmFyIGluZGV4ID0gdGhpcy5lbnRpdGllcy5pbmRleE9mKGVudGl0eSk7XHJcbiAgICBcdHZhciBlbnRpdHlSZW1vdmVkID0gbnVsbDtcclxuXHJcbiAgICBcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuICAgICAgXHRlbnRpdHlSZW1vdmVkID0gdGhpcy5lbnRpdGllc1tpbmRleF07XHJcblxyXG4gICAgICBcdGVudGl0eS5kaXNwb3NlKCk7XHJcbiAgICAgIFx0dGhpcy5yZW1vdmVFbnRpdHlGcm9tRGlydHkoZW50aXR5UmVtb3ZlZCk7XHJcbiAgICAgIFx0VXRpbHMuc3BsaWNlKHRoaXMuZW50aXRpZXMsIGluZGV4LCAxKTtcclxuICAgIFx0fVxyXG5cclxuICAgIFx0cmV0dXJuIGVudGl0eVJlbW92ZWQ7XHJcblx0fVxyXG5cdHJlbW92ZUVudGl0eUZyb21EaXJ0eShlbnRpdHkpIHtcclxuICAgIFx0dmFyIGluZGV4ID0gdGhpcy5lbnRpdGllc1N5c3RlbXNEaXJ0eS5pbmRleE9mKGVudGl0eSk7XHJcblxyXG4gICAgXHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0ICAgICAgVXRpbHMuc3BsaWNlKHRoaXMuZW50aXRpZXMsIGluZGV4LCAxKTtcclxuICAgXHR9XHJcbiAgXHR9XHJcblx0YWRkU2luZ2xldG9uQ29tcG9uZW50KGNvbXBvbmVudCkge1xyXG5cdFx0dGhpcy5hZG1pbkVudGl0eS5hZGRDb21wb25lbnQoY29tcG9uZW50KTtcclxuXHR9XHJcblx0cmVtb3ZlU2luZ2xldG9uQ29tcG9uZW50KHR5cGUpIHtcclxuXHRcdHRoaXMuYWRtaW5FbnRpdHkucmVtb3ZlQ29tcG9uZW50KHR5cGUpO1xyXG5cdH1cclxuXHRhZGRTeXN0ZW0oc3lzdGVtKSB7XHJcblx0XHR0aGlzLnN5c3RlbXMucHVzaChzeXN0ZW0pO1xyXG5cdFx0c3lzdGVtLmFkZFRvTWFuYWdlcih0aGlzKTtcclxuXHJcblx0XHRmb3IgKHZhciBpID0gMCwgZW50aXR5OyBlbnRpdHkgPSB0aGlzLmVudGl0aWVzW2ldOyBpKyspIHtcclxuICAgXHRcdGlmIChzeXN0ZW0udGVzdChlbnRpdHkpKSB7XHJcbiAgICAgIFx0XHRzeXN0ZW0uYWRkRW50aXR5KGVudGl0eSk7XHJcbiAgICAgIFx0fVxyXG4gICAgXHR9XHJcblx0fVxyXG5cdGFkZEFycmF5T2ZTeXN0ZW1zKHN5c3RlbXMpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwLCBzeXN0ZW07IHN5c3RlbSA9IHN5c3RlbXNbaV07IGkrKykge1xyXG5cdFx0XHR0aGlzLmFkZFN5c3RlbShzeXN0ZW0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRyZW1vdmVTeXN0ZW0oc3lzdGVtKSB7XHJcblx0XHR2YXIgaW5kZXggPSB0aGlzLnN5c3RlbXMuaW5kZXhPZihzeXN0ZW0pO1xyXG5cclxuXHRcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0VXRpbHMuc3BsaWNlKHRoaXMuc3lzdGVtcywgaW5kZXgsIDEpO1xyXG5cdFx0XHRzeXN0ZW0uZGlzcG9zZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjcmVhdGVFbnRpdHkodHlwZU5hbWUsIGlkKSB7XHJcblx0XHR2YXIgY29uc3RydWN0b3IgPSB0aGlzLmFyY2hldHlwZXNbdHlwZU5hbWVdO1xyXG5cdFx0dmFyIGVudGl0eSA9IG5ldyBjb25zdHJ1Y3RvcihpZCk7XHJcblx0XHRyZXR1cm4gZW50aXR5O1xyXG5cdH1cclxuXHRjcmVhdGVBbmRBZGRFbnRpdHkodHlwZU5hbWUsIGlkKSB7XHJcblx0XHR2YXIgY29uc3RydWN0b3IgPSB0aGlzLmFyY2hldHlwZXNbdHlwZU5hbWVdO1xyXG5cdFx0dmFyIGVudGl0eSA9IG5ldyBjb25zdHJ1Y3RvcihpZCk7XHJcblx0XHR0aGlzLmFkZEVudGl0eShlbnRpdHkpO1xyXG5cdFx0cmV0dXJuIGVudGl0eTtcclxuXHR9XHJcblx0YWRkRW50aXR5QXJjaGV0eXBlKHR5cGVOYW1lLCBhcmNoZXR5cGUpIHtcclxuXHRcdHRoaXMuYXJjaGV0eXBlc1t0eXBlTmFtZV0gPSBhcmNoZXR5cGU7XHJcblx0fVxyXG5cdHJlbW92ZUVudGl0eUFyY2hldHlwZSh0eXBlTmFtZSkge1xyXG5cdFx0aWYgKCF0aGlzLmFyY2hldHlwZXNbdHlwZU5hbWVdKSB7XHJcblx0XHRcdHRocm93IFwiYXJjaGV0eXBlIHtcIiArIHR5cGVOYW1lICsgXCJ9IGRvZXMgbm90IGV4aXN0XCI7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdHRoaXMuYXJjaGV0eXBlc1t0eXBlTmFtZV0gPSB1bmRlZmluZWQ7XHJcblx0fVxyXG5cdGRpc3Bvc2UoKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMCwgc3lzdGVtOyBzeXN0ZW0gPSB0aGlzLnN5c3RlbXNbMF07IGkrKykge1xyXG4gICAgICBcdHRoaXMucmVtb3ZlU3lzdGVtKHN5c3RlbSk7XHJcbiAgICBcdH1cclxuXHRcdGZvciAodmFyIGkgPSAwLCBlbnRpdHk7IGVudGl0eSA9IHRoaXMuZW50aXRpZXNbMF07IGkrKykge1xyXG4gICAgICBcdHRoaXMucmVtb3ZlRW50aXR5KGVudGl0eSk7XHJcbiAgICBcdH1cclxuXHR9XHJcblx0dXBkYXRlKGRlbHRhKSB7XHJcblx0XHRmb3IgKHZhciBpID0gMCwgc3lzdGVtOyBzeXN0ZW0gPSB0aGlzLnN5c3RlbXNbaV07IGkrKykge1xyXG5cdFx0XHRpZiAodGhpcy5lbnRpdGllc1N5c3RlbXNEaXJ0eS5sZW5ndGgpIHtcclxuXHRcdFx0XHR0aGlzLmNsZWFuRW50aXR5U3lzdGVtcygpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHN5c3RlbS51cGRhdGVBbGwoZGVsdGEpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjbGVhbkVudGl0eVN5c3RlbXMoKSB7XHJcblx0XHRmb3IgKGxldCBpID0gMCwgZW50aXR5OyBlbnRpdHkgPSB0aGlzLmVudGl0aWVzU3lzdGVtc0RpcnR5W2ldOyBpKyspIHtcclxuICAgICAgXHRmb3IgKGxldCBzID0gMCwgc3lzdGVtOyBzeXN0ZW0gPSB0aGlzLnN5c3RlbXNbc107IHMrKykge1xyXG4gICAgICAgIFx0XHR2YXIgaW5kZXggPSBlbnRpdHkuc3lzdGVtcy5pbmRleE9mKHN5c3RlbSk7XHJcbiAgICAgICAgXHRcdHZhciBlbnRpdHlUZXN0ID0gc3lzdGVtLnRlc3QoZW50aXR5KTtcclxuXHJcblx0XHRcdFx0aWYgKGluZGV4ID09PSAtMSAmJiBlbnRpdHlUZXN0KSB7XHJcblx0XHRcdFx0XHRzeXN0ZW0uYWRkRW50aXR5KGVudGl0eSk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCAhPT0gLTEgJiYgIWVudGl0eVRlc3QpIHtcclxuXHRcdFx0XHRcdHN5c3RlbS5yZW1vdmVFbnRpdHkoZW50aXR5KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0ZW50aXR5LnN5c3RlbXNEaXJ0eSA9IGZhbHNlO1xyXG4gICBcdH1cclxuICAgIFx0dGhpcy5lbnRpdGllc1N5c3RlbXNEaXJ0eSA9IFtdO1xyXG5cdH1cclxuXHRnZXRTaW5nbGV0b24odHlwZSkge1xyXG5cdFx0cmV0dXJuIHRoaXMuYWRtaW5FbnRpdHkuZ2V0KHR5cGUpO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0TWFuYWdlcjogTWFuYWdlcixcclxuXHRFbnRpdHk6IEVudGl0eSxcclxuXHRDb21wb25lbnQ6IENvbXBvbmVudCxcclxuXHRTeXN0ZW06IFN5c3RlbVxyXG59XHJcbiIsImNvbnN0IFV0aWxzID0gcmVxdWlyZShcIi4uL1V0aWxzXCIpO1xyXG5jb25zdCBFbnRpdHlUID0gcmVxdWlyZShcIi4vRW50aXR5VFwiKTtcclxuXHJcbmNsYXNzIEVudGl0eSB7XHJcblx0Y29uc3RydWN0b3IoaWQsIHR5cGUsIGNvbXBvbmVudHM9W10pIHtcclxuXHRcdHRoaXMuaWQgPSBpZDtcclxuXHRcdHRoaXMudHlwZSA9IHR5cGUgPyB0eXBlIDogRW50aXR5VC5HRU5FUklDO1xyXG5cclxuXHRcdHRoaXMuc3lzdGVtc0RpcnR5ID0gZmFsc2U7XHJcblxyXG5cdFx0dGhpcy5zeXN0ZW1zID0gW107XHJcblx0XHR0aGlzLmNvbXBvbmVudHMgPSB7fTtcclxuXHRcdGZvciAodmFyIGkgPSAwLCBjb21wb25lbnQ7IGNvbXBvbmVudCA9IGNvbXBvbmVudHNbaV07IGkrKykge1xyXG5cdFx0XHR0aGlzLmNvbXBvbmVudHNbY29tcG9uZW50LnR5cGVdID0gY29tcG9uZW50LmRhdGE7XHJcblx0XHR9XHJcblx0fVxyXG5cdGFkZFRvTWFuYWdlcihtYW5hZ2VyKSB7XHJcblx0XHR0aGlzLm1hbmFnZXIgPSBtYW5hZ2VyO1xyXG5cdFx0dGhpcy5zZXRTeXN0ZW1zRGlydHkoKTtcclxuXHR9XHJcblx0c2V0U3lzdGVtc0RpcnR5KCkge1xyXG5cdFx0aWYgKCF0aGlzLnN5c3RlbXNEaXJ0eSAmJiB0aGlzLm1hbmFnZXIpIHtcclxuXHRcdFx0dGhpcy5zeXN0ZW1zRGlydHkgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLm1hbmFnZXIuZW50aXRpZXNTeXN0ZW1zRGlydHkucHVzaCh0aGlzKTtcclxuXHRcdH1cclxuXHR9XHJcblx0YWRkU3lzdGVtKHN5c3RlbSkge1xyXG5cdFx0dGhpcy5zeXN0ZW1zLnB1c2goc3lzdGVtKTtcclxuXHR9XHJcblx0cmVtb3ZlU3lzdGVtKHN5c3RlbSkge1xyXG5cdFx0dmFyIGluZGV4ID0gdGhpcy5zeXN0ZW1zLmluZGV4T2Yoc3lzdGVtKTtcclxuXHJcblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdFV0aWxzLnNwbGljZSh0aGlzLnN5c3RlbXMsIGluZGV4LCAxKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKHN5c3RlbSk7XHJcblx0XHRcdHRocm93IFwiZW50aXR5IHtcIiArIHRoaXMuaWQgKyBcIixcIiArIHRoaXMudHlwZSArIFwifSBkb2VzIG5vdCBjb250YWluIHN5c3RlbSB7XCIgKyBzeXN0ZW0gKyBcIn1cIjtcclxuXHRcdH1cclxuXHR9XHJcblx0YWRkQ29tcG9uZW50KGNvbXBvbmVudCkge1xyXG5cdFx0dGhpcy5jb21wb25lbnRzW2NvbXBvbmVudC50eXBlXSA9IGNvbXBvbmVudC5kYXRhO1xyXG5cdFx0dGhpcy5zZXRTeXN0ZW1zRGlydHkoKTtcclxuXHR9XHJcblx0YWRkQXJyYXlPZkNvbXBvbmVudHMoY29tcG9uZW50cykge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGNvbXBvbmVudDsgY29tcG9uZW50ID0gY29tcG9uZW50c1tpXTsgaSsrKSB7XHJcblx0XHRcdHRoaXMuY29tcG9uZW50c1tjb21wb25lbnQudHlwZV0gPSBjb21wb25lbnQuZGF0YTtcclxuXHRcdH1cclxuXHRcdHRoaXMuc2V0U3lzdGVtc0RpcnR5KCk7XHJcblx0fVxyXG5cdHJlbW92ZUNvbXBvbmVudCh0eXBlKSB7XHJcblx0XHRpZiAoIXRoaXMuY29tcG9uZW50c1t0eXBlXSkge1xyXG5cdFx0XHR0aHJvdyBcImVudGl0eSB7XCIgKyB0aGlzLmlkICsgXCIsXCIgKyB0aGlzLnR5cGUgKyBcIn0gZG9lcyBub3QgY29udGFpbiBjb21wb25lbnQge1wiICsgdHlwZSArIFwifVwiO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR0aGlzLmNvbXBvbmVudHNbdHlwZV0gPSB1bmRlZmluZWQ7XHJcblx0XHR0aGlzLnNldFN5c3RlbXNEaXJ0eSgpO1xyXG5cdH1cclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Zm9yICh2YXIgaSA9IDAsIHN5c3RlbTsgc3lzdGVtID0gdGhpcy5zeXN0ZW1zWzBdOyBpKyspIHtcclxuICAgICAgXHRzeXN0ZW0ucmVtb3ZlRW50aXR5KHRoaXMpO1xyXG4gICAgXHR9XHJcblx0fVxyXG5cdGdldCh0eXBlKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jb21wb25lbnRzW3R5cGVdO1xyXG5cdH1cclxuXHRjb250YWlucyh0eXBlKSB7XHJcblx0XHRyZXR1cm4gISF0aGlzLmNvbXBvbmVudHNbdHlwZV07XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eTtcclxuIiwiY29uc3QgRW50aXR5VCA9IHtcclxuXHRBRE1JTjogXCJhZG1pblwiLFxyXG5cdEdFTkVSSUM6IFwibm9uZVwiLFxyXG5cdFBMQVlFUjogXCJwbGF5ZXJcIlxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVudGl0eVQ7XHJcbiIsImNvbnN0IFV0aWxzID0gcmVxdWlyZShcIi4uL1V0aWxzXCIpO1xyXG5cclxuY2xhc3MgU3lzdGVtIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuZW50aXRpZXMgPSBbXTtcclxuXHR9XHJcblx0YWRkVG9NYW5hZ2VyKG1hbmFnZXIpIHtcclxuXHRcdHRoaXMubWFuYWdlciA9IG1hbmFnZXI7XHJcblx0fVxyXG5cdGFkZEVudGl0eShlbnRpdHkpIHtcclxuXHRcdGVudGl0eS5hZGRTeXN0ZW0odGhpcyk7XHJcblx0XHR0aGlzLmVudGl0aWVzLnB1c2goZW50aXR5KTtcclxuXHJcblx0XHR0aGlzLmVudGVyKGVudGl0eSk7XHJcblx0fVxyXG5cdHJlbW92ZUVudGl0eShlbnRpdHkpIHtcclxuXHRcdHZhciBpbmRleCA9IHRoaXMuZW50aXRpZXMuaW5kZXhPZihlbnRpdHkpO1xyXG5cclxuXHRcdGlmIChpbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0ZW50aXR5LnJlbW92ZVN5c3RlbSh0aGlzKTtcclxuXHRcdFx0VXRpbHMuc3BsaWNlKHRoaXMuZW50aXRpZXMsIGluZGV4LCAxKTtcclxuXHJcblx0XHRcdHRoaXMuZXhpdChlbnRpdHkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRkaXNwb3NlKCkge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDAsIGVudGl0eTsgZW50aXR5ID0gdGhpcy5lbnRpdGllc1tpXTsgaSsrKSB7XHJcbiAgICAgIFx0ZW50aXR5LnJlbW92ZVN5c3RlbSh0aGlzKTtcclxuICAgICAgXHR0aGlzLmV4aXQoZW50aXR5KTtcclxuICAgXHR9XHJcblx0fVxyXG5cdGVudGVyKGVudGl0eSkge31cclxuXHR0ZXN0KGVudGl0eSkge1xyXG5cdFx0Y29uc29sZS5sb2codGhpcyk7XHJcblx0XHR0aHJvdyBcIlN5c3RlbSByZXF1aXJlcyBhIC8ndGVzdC8nIGZ1bmN0aW9uIG92ZXJsb2FkXCI7XHJcblx0XHRyZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cdGV4aXQoZW50aXR5KSB7fVxyXG5cdHBvc3RVcGRhdGUoZGVsdGEpIHt9XHJcblx0dXBkYXRlQWxsKGRlbHRhKSB7XHJcblx0XHR0aGlzLnByZVVwZGF0ZShkZWx0YSk7XHJcbiAgICBcdGZvciAobGV0IGkgPSAwLCBlbnRpdHk7IGVudGl0eSA9IHRoaXMuZW50aXRpZXNbaV07IGkrKykge1xyXG4gICAgICBcdHRoaXMudXBkYXRlKGVudGl0eSwgZGVsdGEpO1xyXG4gICAgXHR9XHJcbiAgICBcdHRoaXMucG9zdFVwZGF0ZShkZWx0YSk7XHJcblx0fVxyXG5cdHVwZGF0ZShlbnRpdHkpIHt9XHJcblx0cHJlVXBkYXRlKGRlbHRhKSB7fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN5c3RlbTtcclxuIiwidmFyIFBsYXRlRnJhbWUgPSByZXF1aXJlKFwiLi9QbGF0ZUZyYW1lXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcblxyXG5jbGFzcyBCdWZmZXJNYXBCbG9jayB7XHJcblx0Y29uc3RydWN0b3IodywgZSwgbiwgcywgeCwgeSwgYWx0LCB3b3JsZCl7XHJcblx0XHR0aGlzLndlc3QgPSB3O1xyXG5cdFx0dGhpcy5lYXN0ID0gZTtcclxuXHRcdHRoaXMubm9ydGggPSBuO1xyXG5cdFx0dGhpcy5zb3V0aCA9IHM7XHJcblx0XHR0aGlzLmNlbnRlclggPSB4O1xyXG5cdFx0dGhpcy5jZW50ZXJZID0gYWx0O1xyXG5cdFx0dGhpcy5jZW50ZXJaID0geTtcclxuXHJcblx0XHR0aGlzLndvcmxkID0gd29ybGQ7XHJcblx0fVxyXG5cdGNyZWF0ZSgpIHtcclxuXHRcdHZhciBsZW5ndGggPSBDb25zdGFudHMuTUFQX0JMT0NLX0xFTkdUSDtcclxuXHRcdHZhciBmbG9vciA9IG5ldyBQbGF0ZUZyYW1lKHRoaXMuY2VudGVyWCwgbGVuZ3RoLzIsIHRoaXMuY2VudGVyWSwgMCwgdGhpcy5jZW50ZXJaLCBsZW5ndGgvMiwgMiAqICgxIC0gKGxlbmd0aCAtIHRoaXMuY2VudGVyWSkvbGVuZ3RoKSwgMjU1LzI1NSwgMjU1LzI1NSwgdGhpcy53b3JsZCk7XHJcblx0XHR2YXIgcGxhdGVOdW0gPSB0aGlzLndvcmxkLnBsYXRlTnVtO1xyXG5cdFx0dmFyIGdlbmVyYWxfdGVybSA9IFsyKzQqKHBsYXRlTnVtLTEpLCAzKzQqKHBsYXRlTnVtLTEpLCAxKzQqKHBsYXRlTnVtLTEpLCAxKzQqKHBsYXRlTnVtLTEpLCAwKzQqKHBsYXRlTnVtLTEpLCAyKzQqKHBsYXRlTnVtLTEpXTtcclxuXHRcdHRoaXMud29ybGQuaW5kaWNlcyA9IHRoaXMud29ybGQuaW5kaWNlcy5jb25jYXQoZ2VuZXJhbF90ZXJtKTtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHZlcnRleCBvZiBmbG9vci5wb2ludHMpIHtcclxuXHRcdFx0dGhpcy53b3JsZC5wb3NpdGlvbnMucHVzaCguLi52ZXJ0ZXgucG9zKTtcclxuXHRcdFx0dGhpcy53b3JsZC5ub3JtYWxzLnB1c2goLi4udmVydGV4Lm5vcm0pO1xyXG5cdFx0XHR0aGlzLndvcmxkLnV2cy5wdXNoKC4uLnZlcnRleC51dik7XHJcblx0XHRcdHRoaXMud29ybGQuY29sb3JzLnB1c2goLi4udmVydGV4LmNvbG9yKTtcclxuXHRcdH1cclxuXHRcdGlmKHRoaXMuc291dGggPiAwKXtcclxuXHRcdFx0dmFyIHNvdXRoID0gbmV3IFBsYXRlRnJhbWUodGhpcy5jZW50ZXJYLCBsZW5ndGgvMiwgdGhpcy5jZW50ZXJZICsgdGhpcy5zb3V0aC8yLCB0aGlzLnNvdXRoLzIsIHRoaXMuY2VudGVyWitsZW5ndGgvMiwgMCwgMjU1LzI1NSwgMCwgMCwgdGhpcy53b3JsZCk7XHJcblx0XHRcdHBsYXRlTnVtID0gdGhpcy53b3JsZC5wbGF0ZU51bTtcclxuXHRcdFx0Z2VuZXJhbF90ZXJtID0gWzIrNCoocGxhdGVOdW0tMSksIDMrNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDArNCoocGxhdGVOdW0tMSksIDIrNCoocGxhdGVOdW0tMSldO1xyXG4gICAgICAgICB0aGlzLndvcmxkLmluZGljZXMgPSB0aGlzLndvcmxkLmluZGljZXMuY29uY2F0KGdlbmVyYWxfdGVybSk7XHJcblx0XHRcdGZvciAoY29uc3QgdmVydGV4IG9mIHNvdXRoLnBvaW50cykge1xyXG5cdFx0XHRcdHRoaXMud29ybGQucG9zaXRpb25zLnB1c2goLi4udmVydGV4LnBvcyk7XHJcblx0XHRcdFx0dGhpcy53b3JsZC5ub3JtYWxzLnB1c2goLi4udmVydGV4Lm5vcm0pO1xyXG5cdFx0XHRcdHRoaXMud29ybGQudXZzLnB1c2goLi4udmVydGV4LnV2KTtcclxuXHRcdFx0XHR0aGlzLndvcmxkLmNvbG9ycy5wdXNoKC4uLnZlcnRleC5jb2xvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmKHRoaXMubm9ydGggPiAwKXtcclxuXHRcdFx0dmFyIG5vcnRoID0gbmV3IFBsYXRlRnJhbWUodGhpcy5jZW50ZXJYLCBsZW5ndGgvMiwgdGhpcy5jZW50ZXJZICsgdGhpcy5ub3J0aC8yLCB0aGlzLm5vcnRoLzIsIHRoaXMuY2VudGVyWi1sZW5ndGgvMiwgMCwgMCwgMjU1LzI1NSwgMCwgdGhpcy53b3JsZCk7XHJcblx0XHRcdHBsYXRlTnVtID0gdGhpcy53b3JsZC5wbGF0ZU51bTtcclxuXHRcdFx0Z2VuZXJhbF90ZXJtID0gWzArNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDIrNCoocGxhdGVOdW0tMSksIDIrNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDMrNCoocGxhdGVOdW0tMSldO1xyXG4gICAgICAgICB0aGlzLndvcmxkLmluZGljZXMgPSB0aGlzLndvcmxkLmluZGljZXMuY29uY2F0KGdlbmVyYWxfdGVybSk7XHJcblx0XHRcdGZvciAoY29uc3QgdmVydGV4IG9mIG5vcnRoLnBvaW50cykge1xyXG5cdFx0XHRcdHRoaXMud29ybGQucG9zaXRpb25zLnB1c2goLi4udmVydGV4LnBvcyk7XHJcblx0XHRcdFx0dGhpcy53b3JsZC5ub3JtYWxzLnB1c2goLi4udmVydGV4Lm5vcm0pO1xyXG5cdFx0XHRcdHRoaXMud29ybGQudXZzLnB1c2goLi4udmVydGV4LnV2KTtcclxuXHRcdFx0XHR0aGlzLndvcmxkLmNvbG9ycy5wdXNoKC4uLnZlcnRleC5jb2xvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmKHRoaXMuZWFzdCA+IDApe1xyXG5cdFx0XHR2YXIgZWFzdCA9IG5ldyBQbGF0ZUZyYW1lKHRoaXMuY2VudGVyWCtsZW5ndGgvMiwgMCwgdGhpcy5jZW50ZXJZICsgdGhpcy5lYXN0LzIsIHRoaXMuZWFzdC8yLCB0aGlzLmNlbnRlclosIGxlbmd0aC8yLCAwLCAwLCAyNTUvMjU1LCB0aGlzLndvcmxkKTtcclxuXHRcdFx0cGxhdGVOdW0gPSB0aGlzLndvcmxkLnBsYXRlTnVtO1xyXG5cdFx0XHRnZW5lcmFsX3Rlcm0gPSBbMis0KihwbGF0ZU51bS0xKSwgMys0KihwbGF0ZU51bS0xKSwgMSs0KihwbGF0ZU51bS0xKSwgMSs0KihwbGF0ZU51bS0xKSwgMCs0KihwbGF0ZU51bS0xKSwgMis0KihwbGF0ZU51bS0xKV07XHJcbiAgICAgICAgIHRoaXMud29ybGQuaW5kaWNlcyA9IHRoaXMud29ybGQuaW5kaWNlcy5jb25jYXQoZ2VuZXJhbF90ZXJtKTtcclxuXHRcdFx0Zm9yIChjb25zdCB2ZXJ0ZXggb2YgZWFzdC5wb2ludHMpIHtcclxuXHRcdFx0XHR0aGlzLndvcmxkLnBvc2l0aW9ucy5wdXNoKC4uLnZlcnRleC5wb3MpO1xyXG5cdFx0XHRcdHRoaXMud29ybGQubm9ybWFscy5wdXNoKC4uLnZlcnRleC5ub3JtKTtcclxuXHRcdFx0XHR0aGlzLndvcmxkLnV2cy5wdXNoKC4uLnZlcnRleC51dik7XHJcblx0XHRcdFx0dGhpcy53b3JsZC5jb2xvcnMucHVzaCguLi52ZXJ0ZXguY29sb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZih0aGlzLndlc3QgPiAwKXtcclxuXHRcdFx0dmFyIHdlc3QgPSBuZXcgUGxhdGVGcmFtZSh0aGlzLmNlbnRlclgtbGVuZ3RoLzIsIDAsIHRoaXMuY2VudGVyWSArIHRoaXMud2VzdC8yLCB0aGlzLndlc3QvMiwgdGhpcy5jZW50ZXJaLCBsZW5ndGgvMiwgMjU1LzI1NSwgMCwgMjU1LzI1NSwgdGhpcy53b3JsZCk7XHJcblx0XHRcdHBsYXRlTnVtID0gdGhpcy53b3JsZC5wbGF0ZU51bTtcclxuXHRcdFx0Z2VuZXJhbF90ZXJtID0gWzArNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDIrNCoocGxhdGVOdW0tMSksIDIrNCoocGxhdGVOdW0tMSksIDErNCoocGxhdGVOdW0tMSksIDMrNCoocGxhdGVOdW0tMSldO1xyXG5cdFx0XHR0aGlzLndvcmxkLmluZGljZXMgPSB0aGlzLndvcmxkLmluZGljZXMuY29uY2F0KGdlbmVyYWxfdGVybSk7XHJcblx0XHRcdC8vdGhpcy53b3JsZC5saWdodFVwKHRoaXMuY2VudGVyWC1sZW5ndGgvMitsZW5ndGgvNDAsIHRoaXMuY2VudGVyWSs0LzUqdGhpcy53ZXN0LCB0aGlzLmNlbnRlclopO1xyXG5cdFx0XHRmb3IgKGNvbnN0IHZlcnRleCBvZiB3ZXN0LnBvaW50cykge1xyXG5cdFx0XHRcdHRoaXMud29ybGQucG9zaXRpb25zLnB1c2goLi4udmVydGV4LnBvcyk7XHJcblx0XHRcdFx0dGhpcy53b3JsZC5ub3JtYWxzLnB1c2goLi4udmVydGV4Lm5vcm0pO1xyXG5cdFx0XHRcdHRoaXMud29ybGQudXZzLnB1c2goLi4udmVydGV4LnV2KTtcclxuXHRcdFx0XHR0aGlzLndvcmxkLmNvbG9ycy5wdXNoKC4uLnZlcnRleC5jb2xvcik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyTWFwQmxvY2s7XHJcbiIsImNsYXNzIFBsYXRlRnJhbWV7XHJcblx0Y29uc3RydWN0b3IoY2VuWCxoYWxmbFgsIGNlblksaGFsZmxZLCBjZW5aLGhhbGZsWiwgUiwgRywgQiwgd29ybGQpIHtcclxuXHRcdHdvcmxkLnBsYXRlTnVtKys7XHJcblx0XHRpZihoYWxmbFggPT0gMCl7IC8vIGFsbCBzYW1lIHggY29vcmRpbmF0ZVxyXG5cdFx0XHR0aGlzLnBvaW50cyA9IFtcclxuXHRcdFx0XHR7IHBvczogW2NlblgsIGNlblktaGFsZmxZLCAgY2VuWi1oYWxmbFpdLCBub3JtOiBbIC0xLCAgMCwgIDBdLCB1djogWzAsIDFdLCBjb2xvcjogW1IsIEcsIEJdfSxcclxuXHRcdFx0XHR7IHBvczogW2NlblgsIGNlblkraGFsZmxZLCAgY2VuWi1oYWxmbFpdLCBub3JtOiBbIC0xLCAgMCwgIDBdLCB1djogWzEsIDFdLCBjb2xvcjogW1IsIEcsIEJdfSxcclxuXHRcdFx0XHR7IHBvczogW2NlblgsIGNlblktaGFsZmxZLCAgY2VuWitoYWxmbFpdLCBub3JtOiBbIC0xLCAgMCwgIDBdLCB1djogWzAsIDBdLCBjb2xvcjogW1IsIEcsIEJdfSxcclxuXHRcdFx0XHR7IHBvczogW2NlblgsIGNlblkraGFsZmxZLCAgY2VuWitoYWxmbFpdLCBub3JtOiBbIC0xLCAgMCwgIDBdLCB1djogWzEsIDBdLCBjb2xvcjogW1IsIEcsIEJdfVxyXG5cdFx0XHRdO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihoYWxmbFkgPT0gMCl7IC8vIGFsbCBzYW1lIHkgY29vcmRpbmF0ZVxyXG5cdFx0XHR0aGlzLnBvaW50cyA9IFtcclxuXHRcdFx0XHR7IHBvczogW2NlblgtaGFsZmxYLCBjZW5ZLCAgY2VuWi1oYWxmbFpdLCBub3JtOiBbIDAsICAxLCAgMF0sIHV2OiBbMCwgMV0sIGNvbG9yOiBbUiwgRywgQl19LFxyXG5cdFx0XHRcdHsgcG9zOiBbY2VuWCtoYWxmbFgsIGNlblksICBjZW5aLWhhbGZsWl0sIG5vcm06IFsgMCwgIDEsICAwXSwgdXY6IFsxLCAxXSwgY29sb3I6IFtSLCBHLCBCXX0sXHJcblx0XHRcdFx0eyBwb3M6IFtjZW5YLWhhbGZsWCwgY2VuWSwgIGNlbloraGFsZmxaXSwgbm9ybTogWyAwLCAgMSwgIDBdLCB1djogWzAsIDBdLCBjb2xvcjogW1IsIEcsIEJdfSxcclxuXHRcdFx0XHR7IHBvczogW2NlblgraGFsZmxYLCBjZW5ZLCAgY2VuWitoYWxmbFpdLCBub3JtOiBbIDAsICAxLCAgMF0sIHV2OiBbMSwgMF0sIGNvbG9yOiBbUiwgRywgQl19XHJcblx0XHRcdF07XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKGhhbGZsWiA9PTApIHsgLy8gYWxsIHNhbWUgeiBjb29yZGluYXRlXHJcblx0XHRcdHRoaXMucG9pbnRzID0gW1xyXG5cdFx0XHRcdHsgcG9zOiBbY2VuWC1oYWxmbFgsIGNlblktaGFsZmxZLCAgY2VuWl0sIG5vcm06IFsgMCwgIDAsICAtMV0sIHV2OiBbMCwgMV0sIGNvbG9yOiBbUiwgRywgQl19LFxyXG5cdFx0XHRcdHsgcG9zOiBbY2VuWCtoYWxmbFgsIGNlblktaGFsZmxZLCAgY2VuWl0sIG5vcm06IFsgMCwgIDAsICAtMV0sIHV2OiBbMSwgMV0sIGNvbG9yOiBbUiwgRywgQl19LFxyXG5cdFx0XHRcdHsgcG9zOiBbY2VuWC1oYWxmbFgsIGNlblkraGFsZmxZLCAgY2VuWl0sIG5vcm06IFsgMCwgIDAsICAtMV0sIHV2OiBbMCwgMF0sIGNvbG9yOiBbUiwgRywgQl19LFxyXG5cdFx0XHRcdHsgcG9zOiBbY2VuWCtoYWxmbFgsIGNlblkraGFsZmxZLCAgY2VuWl0sIG5vcm06IFsgMCwgIDAsICAtMV0sIHV2OiBbMSwgMF0sIGNvbG9yOiBbUiwgRywgQl19XHJcblx0XHRcdF07XHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcImltcHJvcGVyIHBsYXRlXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQbGF0ZUZyYW1lO1xyXG4iLCJ2YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuLi9jb21tb24vVXRpbHNcIik7XHJcbnZhciBMTWF0aCA9IHJlcXVpcmUoXCIuLi9jb21tb24vTWF0aC9MTWF0aFwiKTtcclxuXHJcbnZhciBCdWZmZXJNYXBCbG9jayA9IHJlcXVpcmUoXCIuL0J1ZmZlck1hcEJsb2NrXCIpO1xyXG5cclxuLy92YXIgdGVzdCA9IHJlcXVpcmUoXCIuLi9jb21tb24vZWNzL0VDU0RlbW9cIik7XHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcbnZhciBFbnRpdHlUID0gcmVxdWlyZShcIi4uL2NvbW1vbi9lY3MvRW50aXR5VFwiKTtcclxudmFyIENvbXBvbmVudFQgPSByZXF1aXJlKFwiLi4vY29tbW9uL2Vjcy9Db21wb25lbnRUXCIpO1xyXG5cclxudmFyIFBsYXllciA9IHJlcXVpcmUoXCIuL2VudGl0eS9QbGF5ZXJcIik7XHJcblxyXG4vL0NvbXBvbmVudHNcclxudmFyIFNHTElucHV0Q29tcG9uZW50ID0gcmVxdWlyZShcIi4vY29tcG9uZW50L1NHTElucHV0Q29tcG9uZW50XCIpO1xyXG52YXIgU0dMU2V0dGluZ3NDb21wb25lbnQgPSByZXF1aXJlKFwiLi9jb21wb25lbnQvU0dMU2V0dGluZ3NDb21wb25lbnRcIik7XHJcblxyXG52YXIgQ2FtZXJhQ29tcG9uZW50ID0gcmVxdWlyZShcIi4vY29tcG9uZW50L0NhbWVyYUNvbXBvbmVudFwiKTtcclxuXHJcbi8vU3lzdGVtc1xyXG52YXIgSW5wdXRTeXN0ZW0gPSByZXF1aXJlKFwiLi9zeXN0ZW0vSW5wdXRTeXN0ZW1cIik7XHJcblxyXG52YXIgRmlyc3RQZXJzb25TeXN0ZW0gPSByZXF1aXJlKFwiLi9zeXN0ZW0vRmlyc3RQZXJzb25TeXN0ZW1cIik7XHJcbnZhciBBbmltYXRpb25TeXN0ZW0gPSByZXF1aXJlKFwiLi9zeXN0ZW0vQW5pbWF0aW9uU3lzdGVtXCIpO1xyXG52YXIgTW92ZW1lbnRCbGVuZFN5c3RlbSA9IHJlcXVpcmUoXCIuL3N5c3RlbS9Nb3ZlbWVudEJsZW5kU3lzdGVtXCIpO1xyXG52YXIgUmVuZGVyU3lzdGVtID0gcmVxdWlyZShcIi4vc3lzdGVtL1JlbmRlclN5c3RlbVwiKTtcclxuXHJcbmNsYXNzIFdvcmxkIHtcclxuXHRjb25zdHJ1Y3RvciAoc29ja2V0LCB3b3JsZEluZm8pIHtcclxuXHRcdC8vSW5pdGlhbGl6ZSBuZXR3b3JraW5nXHJcblx0XHR0aGlzLmNsaWVudFNvY2tldElEID0gc29ja2V0LmlkO1xyXG5cdFx0dGhpcy5zb2NrZXQgPSBzb2NrZXQ7XHJcblxyXG5cdFx0Ly9Jbml0aWFsaXplIHRoZSBtYXAgbWVzaCBvZiBwb2ludHNcclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xyXG5cdFx0dGhpcy5wb3NpdGlvbnMgPSBbXTtcclxuXHRcdHRoaXMubm9ybWFscyA9IFtdO1xyXG5cdFx0dGhpcy51dnMgPSBbXTtcclxuXHRcdHRoaXMuY29sb3JzID0gW107XHJcblx0XHR0aGlzLnBvc2l0aW9uTnVtQ29tcG9uZW50cyA9IDM7XHJcblx0XHR0aGlzLm5vcm1hbE51bUNvbXBvbmVudHMgPSAzO1xyXG5cdFx0dGhpcy51dk51bUNvbXBvbmVudHMgPSAyO1xyXG5cdFx0dGhpcy5wbGF0ZU51bSA9IDA7XHJcblx0XHR0aGlzLmluZGljZXMgPSBbXTtcclxuXHJcblx0XHQvL0luaXRpYWxpemUgdGhlIHNjZW5lIGFuZCByZW5kZXJlclxyXG5cdFx0dGhpcy5zY2VuZSA9IG5ldyBUSFJFRS5TY2VuZSgpO1xyXG5cclxuXHRcdHRoaXMucmVuZGVyZXIgPSBuZXcgVEhSRUUuV2ViR0xSZW5kZXJlcih7IGxvZ2FyaXRobWljRGVwdGhCdWZmZXI6IGZhbHNlIH0pO1xyXG5cdFx0dGhpcy5yZW5kZXJlci5zaGFkb3dNYXAuZW5hYmxlZCA9IHRydWU7XHJcblxyXG5cdFx0Ly9Jbml0IGRvbUVsZW1lbnQgYW5kIHBvaW50ZXIgbG9jayBBUElcclxuXHRcdHRoaXMuZG9tRWxlbWVudCA9IHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudDtcclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5kb21FbGVtZW50KTtcclxuXHRcdHRoaXMuZG9tRWxlbWVudC5yZXF1ZXN0UG9pbnRlckxvY2sgPSB0aGlzLmRvbUVsZW1lbnQucmVxdWVzdFBvaW50ZXJMb2NrIHx8IHRoaXMuZG9tRWxlbWVudC5tb3pSZXF1ZXN0UG9pbnRlckxvY2s7XHJcblx0XHRkb2N1bWVudC5leGl0UG9pbnRlckxvY2sgPSBkb2N1bWVudC5leGl0UG9pbnRlckxvY2sgfHwgZG9jdW1lbnQubW96RXhpdFBvaW50ZXJMb2NrO1xyXG5cclxuXHRcdC8vVGVtcG9yYXJ5IGNhbWVyYSBpbnN0YW50aWF0aW9uPyBUT0RPXHJcblx0XHR0aGlzLmNhbWVyYSA9IG5ldyBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSg3NSwgd2luZG93LmlubmVyV2lkdGggLyB3aW5kb3cuaW5uZXJIZWlnaHQsIDAuMSwgMjAwMDApO1xyXG5cdFx0dGhpcy5zY2VuZS5hZGQodGhpcy5jYW1lcmEpO1xyXG5cclxuXHRcdHRoaXMuZW50aXR5TWFuYWdlciA9IG5ldyBFQ1MuTWFuYWdlcigpO1xyXG5cdFx0dGhpcy5lbnRpdHlNYW5hZ2VyLmFkZFNpbmdsZXRvbkNvbXBvbmVudChuZXcgU0dMSW5wdXRDb21wb25lbnQoKSk7XHJcblx0XHR0aGlzLmVudGl0eU1hbmFnZXIuYWRkU2luZ2xldG9uQ29tcG9uZW50KG5ldyBTR0xTZXR0aW5nc0NvbXBvbmVudCgpKTtcclxuXHRcdHRoaXMuZW50aXR5TWFuYWdlci5hZGRBcnJheU9mU3lzdGVtcyhbXHJcblx0XHRcdG5ldyBJbnB1dFN5c3RlbSgpLFxyXG5cclxuXHRcdFx0bmV3IEZpcnN0UGVyc29uU3lzdGVtKCksXHJcblx0XHRcdFxyXG5cdFx0XHRuZXcgQW5pbWF0aW9uU3lzdGVtKCksXHJcblx0XHRcdG5ldyBNb3ZlbWVudEJsZW5kU3lzdGVtKCksXHJcblx0XHRcdG5ldyBSZW5kZXJTeXN0ZW0odGhpcy5zY2VuZSlcclxuXHRcdF0pO1xyXG5cclxuXHRcdHRoaXMuZW50aXR5TWFuYWdlci5hZGRFbnRpdHlBcmNoZXR5cGUoRW50aXR5VC5QTEFZRVIsIFBsYXllcik7XHJcblxyXG5cdFx0dGhpcy5pbml0Q2xpZW50UGxheWVyKHdvcmxkSW5mbyk7XHJcblxyXG5cdFx0Ly9Jbml0aWFsaXplIHNlcnZlciBsaXN0ZW5lcnNcclxuXHRcdC8vdGhpcy5pbml0U2VydmVyTGlzdGVuZXJzKCk7XHJcblxyXG5cdFx0Ly9Jbml0aWFsaXplIHBsYXllcnNcclxuXHRcdC8vdGhpcy5uZXRQbGF5ZXJzID0gbmV3IE1hcCgpO1xyXG5cdFx0Ly90aGlzLmluaXRQbGF5ZXIod29ybGRJbmZvKTtcclxuXHJcblx0XHR0aGlzLmluaXRNYXAod29ybGRJbmZvKTtcclxuXHR9XHJcblx0ZGlzcG9zZSgpIHtcclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbS5kaXNwb3NlKCk7XHJcblx0XHR0aGlzLmVudGl0eU1hbmFnZXIuZ2V0U2luZ2xldG9uKENvbXBvbmVudFQuSU5QVVQpLmVuYWJsZWQgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2NlbmUuZGlzcG9zZSgpO1xyXG5cclxuXHRcdHRoaXMuc29ja2V0Lm9mZihDb25zdGFudHMuTkVUX1dPUkxEX1NUQVRFX1VQREFURSk7XHJcblxyXG5cdFx0dGhpcy5lbnRpdHlNYW5hZ2VyLmRpc3Bvc2UoKTtcclxuXHRcdHRoaXMuZG9tRWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMuZG9tRWxlbWVudCk7XHJcblx0fVxyXG5cdGluaXRDbGllbnRQbGF5ZXIod29ybGRJbmZvKSB7IC8vVE9ETyBtb3ZlIHRoaXMgaW50byBhIFwic2VydmVyIHN5c3RlbVwiIHJlbGF0ZWQgY2xhc3NcclxuXHRcdHRoaXMuY2xpZW50UGxheWVyID0gdGhpcy5lbnRpdHlNYW5hZ2VyLmNyZWF0ZUVudGl0eShFbnRpdHlULlBMQVlFUiwgMCk7XHJcblx0XHR0aGlzLmNsaWVudFBsYXllci5nZXQoQ29tcG9uZW50VC5UUkFOU0ZPUk0pLnBvc2l0aW9uLnNldCgxMCwgMCwgMTApO1xyXG5cdFx0dGhpcy5jbGllbnRQbGF5ZXIuZ2V0KENvbXBvbmVudFQuQUlNKS5haW1Sb3RhdGlvbi5zZXQoMCwgLSBNYXRoLlBJICogMyAvIDQsIDApO1xyXG5cdFx0dGhpcy5jbGllbnRQbGF5ZXIuZ2V0KENvbXBvbmVudFQuU1RBVFMpLm1vdmVtZW50U3BlZWQgPSAwLjAwMztcclxuXHJcblx0XHRSZW5kZXJTeXN0ZW0uaW5pdE1vZGVsKHRoaXMuY2xpZW50UGxheWVyLCBcIlBsYXllclwiKTtcclxuXHRcdHRoaXMuY2xpZW50UGxheWVyLmdldChDb21wb25lbnRULk1PREVMKS5tZXNoLnZpc2libGUgPSB0cnVlO1xyXG5cclxuXHRcdHZhciBjYW1Db21wb25lbnQgPSBuZXcgQ2FtZXJhQ29tcG9uZW50KHRoaXMuY2FtZXJhKTtcclxuXHRcdGNhbUNvbXBvbmVudC5kYXRhLmNhbWVyYU9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIENvbnN0YW50cy5QTEFZRVJfSEVJR0hUX09GRlNFVCwgMCk7Ly8yICogQ29uc3RhbnRzLlBMQVlFUl9IRUlHSFRfT0ZGU0VUKTtcclxuXHRcdHRoaXMuY2xpZW50UGxheWVyLmFkZENvbXBvbmVudChjYW1Db21wb25lbnQpO1xyXG5cclxuXHRcdHRoaXMuZW50aXR5TWFuYWdlci5hZGRFbnRpdHkodGhpcy5jbGllbnRQbGF5ZXIpO1xyXG5cclxuXHRcdC8vVE9ETyBEZWxldGU6IER1bW15IFBsYXllclxyXG5cdFx0dmFyIGR1bW15UGxheWVyID0gdGhpcy5lbnRpdHlNYW5hZ2VyLmNyZWF0ZUVudGl0eShFbnRpdHlULlBMQVlFUiwgMSk7XHJcblx0XHRkdW1teVBsYXllci5nZXQoQ29tcG9uZW50VC5UUkFOU0ZPUk0pLnBvc2l0aW9uLnNldCg1LCAwLCA1KTtcclxuXHRcdGR1bW15UGxheWVyLmdldChDb21wb25lbnRULkFJTSkuYWltUm90YXRpb24uc2V0KDAsIE1hdGguUEkgKiAzIC8gNCwgMCk7XHJcblx0XHRkdW1teVBsYXllci5nZXQoQ29tcG9uZW50VC5TVEFUUykubW92ZW1lbnRTcGVlZCA9IDAuMDAzO1xyXG5cclxuXHRcdFJlbmRlclN5c3RlbS5pbml0TW9kZWwoZHVtbXlQbGF5ZXIsIFwiUGxheWVyXCIpO1xyXG5cdFx0ZHVtbXlQbGF5ZXIuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1lc2gudmlzaWJsZSA9IHRydWU7XHJcblxyXG5cdFx0ZHVtbXlQbGF5ZXIuZ2V0KENvbXBvbmVudFQuQU5JTUFUSU9OKS50cmFuc2l0aW9uVG9BY3Rpb25OYW1lID0gQ29uc3RhbnRzLklETEVfQU5JTTtcclxuXHJcblx0XHQvL3RoaXMuZW50aXR5TWFuYWdlci5hZGRFbnRpdHkoZHVtbXlQbGF5ZXIpO1xyXG5cdH1cclxuXHQvKlxyXG5cdGluaXRTZXJ2ZXJMaXN0ZW5lcnMoKSB7XHJcblx0XHR0aGlzLnNvY2tldC5vbihDb25zdGFudHMuTkVUX1dPUkxEX1NUQVRFX1VQREFURSwgVXRpbHMuYmluZCh0aGlzLCB3b3JsZEluZm8gPT4ge1xyXG5cdFx0XHQvL3RoaXMudXBkYXRlTmV0UGxheWVycyh3b3JsZEluZm8uZW50aXRpZXMsIHdvcmxkSW5mby5yZW1vdmVkRW50aXR5SURzKTtcclxuXHRcdFx0Ly9EbyB0aGUgc2FtZSBmb3IgZW50aXRpZXMgd2hlbiB0aGV5IGFyZSBpbmNsdWRlZCBUT0RPXHJcblx0XHR9KSk7XHJcblx0fVxyXG5cdHVwZGF0ZU5ldFBsYXllcnMoZW50aXRpZXMsIHJlbW92ZWRFbnRpdHlJRHMpIHtcclxuXHRcdHZhciBlbnRpdGllc09uQ2xpZW50ID0gRW50aXR5TWFuYWdlci5lbnRpdGllcztcclxuXHJcblx0XHRlbnRpdGllcy5mb3JFYWNoKGVudGl0eU9uU2VydmVyID0+IHtcclxuXHRcdFx0dmFyIGVudGl0eU9uQ2xpZW50ID0gRW50aXR5TWFuYWdlci5lbnRpdGllc1tlbnRpdHlPblNlcnZlci5pZF07XHJcblxyXG5cdFx0XHRpZiAoZW50aXR5T25DbGllbnQgPT0gdW5kZWZpbmVkKSB7IC8vTWFrZSBuZXcgZW50aXR5XHJcblx0XHRcdFx0dmFyIG5ld0VudGl0eTtcclxuXHRcdFx0XHRzd2l0Y2goZW50aXR5T25TZXJ2ZXIudHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgRW50aXR5VC5QTEFZRVI6XHJcblx0XHRcdFx0XHRuZXdFbnRpdHkgPSBuZXcgTmV0UGxheWVyKGVudGl0eU9uU2VydmVyLmlkLCB0aGlzLCBlbnRpdHlPblNlcnZlci5zb2NrZXRJRCwgZW50aXR5T25TZXJ2ZXIubmFtZSk7XHJcblx0XHRcdFx0XHRuZXdFbnRpdHkuc2V0UG9zaXRpb24oZW50aXR5T25TZXJ2ZXIucG9zaXRpb24pO1xyXG5cdFx0XHRcdFx0bmV3RW50aXR5LnNldFJvdGF0aW9uKGVudGl0eU9uU2VydmVyLnJvdGF0aW9uKTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLmFkZE5ldFBsYXllcihuZXdFbnRpdHkpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHRocm93IFwiRW50aXR5IHR5cGUgdW5kZWZpbmVkOiBcIiArIGVudGl0eU9uU2VydmVyLnR5cGU7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKENvbnN0YW50cy5ERUJVR19ET19FTlRJVFlfSU5URVJQT0xBVElPTikgbmV3RW50aXR5Lmluc2VydFBvc2l0aW9uV2l0aFRpbWUoRGF0ZS5ub3coKSwgZW50aXR5T25TZXJ2ZXIpO1xyXG5cdFx0XHR9IGVsc2UgeyAvL1VwZGF0ZSBleGlzdGluZyBlbnRpdHlcclxuXHRcdFx0XHRpZiAoZW50aXR5T25DbGllbnQudHlwZSA9PSBFbnRpdHlULlBMQVlFUiAmJiBlbnRpdHlPbkNsaWVudC5zb2NrZXRJRCA9PSB0aGlzLmNsaWVudFBsYXllci5zb2NrZXRJRCkgcmV0dXJuO1xyXG5cdFx0XHRcdGlmIChDb25zdGFudHMuREVCVUdfRE9fRU5USVRZX0lOVEVSUE9MQVRJT04pIHtcclxuXHRcdFx0XHRcdGVudGl0eU9uQ2xpZW50Lmluc2VydFBvc2l0aW9uV2l0aFRpbWUoRGF0ZS5ub3coKSwgZW50aXR5T25TZXJ2ZXIpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRlbnRpdHlPbkNsaWVudC5zZXRQb3NpdGlvbihlbnRpdHlPblNlcnZlci5wb3NpdGlvbik7XHJcblx0XHRcdFx0XHRlbnRpdHlPbkNsaWVudC5zZXRSb3RhdGlvbihlbnRpdHlPblNlcnZlci5yb3RhdGlvbik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHRcdGlmIChDb25zdGFudHMuREVCVUdfRE9fRU5USVRZX0lOVEVSUE9MQVRJT04pIHtcclxuXHRcdFx0ZW50aXRpZXNPbkNsaWVudC5mb3JFYWNoKGVudGl0eU9uQ2xpZW50ID0+IHtcclxuXHRcdFx0XHRpZiAoZW50aXR5T25DbGllbnQudHlwZSA9PSBFbnRpdHlULlBMQVlFUiAmJiBlbnRpdHlPbkNsaWVudC5zb2NrZXRJRCA9PSB0aGlzLmNsaWVudFBsYXllci5zb2NrZXRJRCkgcmV0dXJuO1xyXG5cdFx0XHRcdGlmICghZW50aXRpZXMuc29tZShlbnRpdHlPblNlcnZlciA9PiB7cmV0dXJuIGVudGl0eU9uQ2xpZW50LmlkID09IGVudGl0eU9uU2VydmVyLmlkO30pKSB7XHJcblx0XHRcdFx0XHRlbnRpdHlPbkNsaWVudC5pbnNlcnRQb3NpdGlvbldpdGhUaW1lKERhdGUubm93KCksIGVudGl0eU9uQ2xpZW50LnBvc2l0aW9uQnVmZmVyW2VudGl0eU9uQ2xpZW50LnBvc2l0aW9uQnVmZmVyLmxlbmd0aCAtIDFdLnN0YXRlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHJlbW92ZWRFbnRpdHlJRHMgIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHJlbW92ZWRFbnRpdHlJRHMuZm9yRWFjaChpZCA9PiB7XHJcblx0XHRcdFx0RW50aXR5TWFuYWdlci5yZW1vdmVFbnRpdHkoaWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblx0Ki9cclxuXHQvKlxyXG5cdGluaXRQbGF5ZXIod29ybGRJbmZvKSB7XHJcblx0XHR2YXIgY1BsYXllciA9IHdvcmxkSW5mby5lbnRpdGllcy5maW5kKChwbGF5ZXIpID0+IHtcclxuXHRcdFx0cmV0dXJuIHBsYXllci5zb2NrZXRJRCA9PSB0aGlzLmNsaWVudFNvY2tldElEO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgTU9WRU1FTlRfU1BFRUQgPSAwLjAwMztcclxuXHRcdGNvbnN0IFRVUk5fU1BFRUQgPSAwLjAwMDQ7XHJcblxyXG5cdFx0Ly9DbGllbnQgUGxheWVyXHJcblx0XHR0aGlzLmNsaWVudFBsYXllciA9IG5ldyBOZXRQbGF5ZXIoY1BsYXllci5pZCwgdGhpcywgY1BsYXllci5zb2NrZXRJRCwgY1BsYXllci5uYW1lKTtcclxuXHRcdHRoaXMuY2xpZW50UGxheWVyLnNldFBvc2l0aW9uKGNQbGF5ZXIucG9zaXRpb24pO1xyXG5cdFx0dGhpcy5jbGllbnRQbGF5ZXIuc2V0Um90YXRpb24oY1BsYXllci5yb3RhdGlvbik7XHJcblxyXG5cdFx0Ly9GaXJzdCBQZXJzb24gQ29udHJvbGxlclxyXG5cdFx0dGhpcy5jYW1lcmEgPSBuZXcgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEoNzUsIHdpbmRvdy5pbm5lcldpZHRoIC8gd2luZG93LmlubmVySGVpZ2h0LCAwLjEsIDIwMDAwKTtcclxuXHRcdHRoaXMuY29udHJvbGxlciA9IG5ldyBGaXJzdFBlcnNvbkNvbnRyb2xsZXIodGhpcy5jYW1lcmEsIHRoaXMucmVuZGVyZXIuZG9tRWxlbWVudCwgdGhpcy5jbGllbnRQbGF5ZXIpO1xyXG5cdFx0dGhpcy5jb250cm9sbGVyLnNwZWVkID0gTU9WRU1FTlRfU1BFRUQ7IC8vVE9ETyBtb3ZlIHRoaXNcclxuXHRcdHRoaXMuY29udHJvbGxlci50dXJuU3BlZWQgPSBUVVJOX1NQRUVEO1xyXG5cdFx0dGhpcy5jb250cm9sbGVyLmluaXRQb3NlKGNQbGF5ZXIucG9zaXRpb24ueCwgY1BsYXllci5wb3NpdGlvbi55LCBjUGxheWVyLnBvc2l0aW9uLnosIGNQbGF5ZXIucm90YXRpb24ueCwgY1BsYXllci5yb3RhdGlvbi55LCAwKTtcclxuXHJcblx0XHR0aGlzLmFkZE5ldFBsYXllcih0aGlzLmNsaWVudFBsYXllcik7XHJcblx0fSovXHJcblx0LypcclxuXHRhZGROZXRQbGF5ZXIobmV0UGxheWVyKSB7XHJcblx0XHR2YXIgc29ja2V0SUQgPSBuZXRQbGF5ZXIuc29ja2V0SUQ7XHJcblx0XHRpZiAoIXRoaXMubmV0UGxheWVycy5oYXMoc29ja2V0SUQpKSB7XHJcblx0XHRcdHRoaXMubmV0UGxheWVycy5zZXQoc29ja2V0SUQsIG5ldFBsYXllcik7XHJcblx0XHRcdHRoaXMuc2l6ZSsrO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhyb3cgXCJwbGF5ZXIge1wiICsgc29ja2V0SUQgKyBcIn0gYWxyZWFkeSBleGlzdHNcIjtcclxuXHRcdH1cclxuXHR9XHJcblx0cmVtb3ZlTmV0UGxheWVyKHNvY2tldElEKSB7XHJcblx0XHRpZiAodGhpcy5uZXRQbGF5ZXJzLmhhcyhzb2NrZXRJRCkpIHtcclxuXHRcdFx0dGhpcy5uZXRQbGF5ZXJzLmdldChzb2NrZXRJRCkuZGlzcG9zZSgpO1xyXG4gICBcdFx0dGhpcy5uZXRQbGF5ZXJzLmRlbGV0ZShzb2NrZXRJRCk7XHJcblx0XHRcdHRoaXMuc2l6ZS0tO1xyXG4gICBcdH0gZWxzZSB7XHJcblx0XHRcdHRocm93IFwicGxheWVyIHtcIiArIHNvY2tldElEICsgXCJ9IGRvZXMgbm90IGV4aXN0IGFuZCBjYW4ndCBiZSByZW1vdmVkXCI7XHJcblx0XHR9XHJcblx0fSovXHJcblx0aW5pdE1hcCh3b3JsZEluZm8pIHtcclxuXHRcdC8vTWFwIG1lc2hcclxuXHRcdHZhciBtYXQgPSBuZXcgVEhSRUUuTWVzaFBob25nTWF0ZXJpYWwoe3ZlcnRleENvbG9yczogVEhSRUUuVmVydGV4Q29sb3JzLCBzaWRlOiBUSFJFRS5Gcm9udFNpZGV9KTtcclxuXHRcdHZhciBtYXBNZXNoID0gbmV3IFRIUkVFLk1lc2godGhpcy5idWZmZXJNYXBHZW9tLCBtYXQpO1xyXG5cdFx0bWFwTWVzaC5yZWNlaXZlU2hhZG93ID0gdHJ1ZTtcclxuXHRcdG1hcE1lc2guY2FzdFNoYWRvdyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5zY2VuZS5hZGQobWFwTWVzaCk7XHJcblx0XHR0aGlzLm1hcCA9IHdvcmxkSW5mby5tYXA7XHJcblx0XHR0aGlzLmludGVycHJldE1hcCh3b3JsZEluZm8ubWFwLCB3b3JsZEluZm8ud2lkdGgsIHdvcmxkSW5mby5oZWlnaHQpO1xyXG5cclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbS5zZXRBdHRyaWJ1dGUoJ3Bvc2l0aW9uJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KHRoaXMucG9zaXRpb25zKSwgdGhpcy5wb3NpdGlvbk51bUNvbXBvbmVudHMpKTtcclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbS5zZXRBdHRyaWJ1dGUoJ25vcm1hbCcsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUobmV3IEZsb2F0MzJBcnJheSh0aGlzLm5vcm1hbHMpLCB0aGlzLm5vcm1hbE51bUNvbXBvbmVudHMpKTtcclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbS5zZXRBdHRyaWJ1dGUoJ3V2JywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KHRoaXMudXZzKSwgdGhpcy51dk51bUNvbXBvbmVudHMpKTtcclxuXHRcdHRoaXMuYnVmZmVyTWFwR2VvbS5zZXRBdHRyaWJ1dGUoJ2NvbG9yJywgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShuZXcgRmxvYXQzMkFycmF5KHRoaXMuY29sb3JzKSwgMywgdHJ1ZSkpO1xyXG5cdFx0dGhpcy5idWZmZXJNYXBHZW9tLnNldEluZGV4KHRoaXMuaW5kaWNlcyk7XHJcblxyXG5cdFx0Ly9BbWJpZW50IGxpZ2h0aW5nXHJcblx0XHR2YXIgYW1iaWVudF9saWdodCA9IG5ldyBUSFJFRS5BbWJpZW50TGlnaHQoIDB4ZmZmZmZmLCAuNSApOyAvLyBzb2Z0IHdoaXRlIGxpZ2h0XHJcblx0XHR0aGlzLnNjZW5lLmFkZCggYW1iaWVudF9saWdodCApO1xyXG5cclxuXHRcdC8vRGlyZWN0aW9uYWwgbGlnaHRpbmdcclxuXHRcdHZhciBkaXJlY3Rpb25hbF9saWdodCA9IG5ldyBUSFJFRS5EaXJlY3Rpb25hbExpZ2h0KCAweGZmZmZmZiwgLjcgKTsgLy8gc29mdCB3aGl0ZSBsaWdodFxyXG5cdFx0ZGlyZWN0aW9uYWxfbGlnaHQucG9zaXRpb24uc2V0KDEsIDEsIDApO1xyXG5cdFx0dGhpcy5zY2VuZS5hZGQoIGRpcmVjdGlvbmFsX2xpZ2h0ICk7XHJcblxyXG5cdFx0Ly9UZXN0IHNwaGVyZVxyXG5cdFx0dmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KENvbnN0YW50cy5NQVBfQkxPQ0tfTEVOR1RILzIsIDUwLCA1MCApO1xyXG5cdFx0dmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLk1lc2hQaG9uZ01hdGVyaWFsKCB7d2lyZWZyYW1lOmZhbHNlfSApO1xyXG5cdFx0dmFyIG1lc2ggPSBuZXcgVEhSRUUuTWVzaCggZ2VvbWV0cnksIG1hdGVyaWFsICk7XHJcblx0XHRtZXNoLm1hdGVyaWFsLmNvbG9yLnNldEhleCggMHhmZmZmMDAgKTtcclxuXHRcdG1lc2guY2FzdFNoYWRvdyA9IHRydWU7XHJcblx0XHRtZXNoLnJlY2VpdmVTaGFkb3cgPSBmYWxzZTtcclxuXHRcdG1lc2gucG9zaXRpb24ueSA9IENvbnN0YW50cy5NQVBfQkxPQ0tfTEVOR1RIKjMvMjtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKCBtZXNoICk7XHJcblx0fVxyXG5cdGludGVycHJldE1hcChtYXAsIHdpZHRoLCBoZWlnaHQpIHtcclxuXHRcdGZvciAodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcclxuXHRcdFx0Zm9yICh2YXIgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XHJcblx0XHRcdFx0dmFyIGwsIHIsIHQsIGI7XHJcblxyXG5cdFx0XHRcdGlmIChtYXBbeCArIHkgKiB3aWR0aF0gPT0gdW5kZWZpbmVkKVxyXG5cdFx0XHRcdFx0Y29udGludWU7XHJcblxyXG5cdFx0XHRcdGlmICh5ID09IDApIHtcclxuXHRcdFx0XHRcdHQgPSBDb25zdGFudHMuTUFQX0JMT0NLX0xFTkdUSCAtIG1hcFt4ICsgeSAqIHdpZHRoXTtcclxuXHRcdFx0XHRcdGIgPSBtYXBbeCArICh5ICsgMSkgKiB3aWR0aF0gLSBtYXBbeCArIHkgKiB3aWR0aF07XHJcblx0XHRcdFx0fSBlbHNlIGlmICh5ID09IGhlaWdodCAtIDEpIHtcclxuXHRcdFx0XHRcdHQgPSBtYXBbeCArICh5IC0gMSkgKiB3aWR0aF0gLSBtYXBbeCArIHkgKiB3aWR0aF07XHJcblx0XHRcdFx0XHRiID0gQ29uc3RhbnRzLk1BUF9CTE9DS19MRU5HVEggLSBtYXBbeCArIHkgKiB3aWR0aF07XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHQgPSBtYXBbeCArICh5IC0gMSkgKiB3aWR0aF0gLSBtYXBbeCArIHkgKiB3aWR0aF07XHJcblx0XHRcdFx0XHRiID0gbWFwW3ggKyAoeSArIDEpICogd2lkdGhdIC0gbWFwW3ggKyB5ICogd2lkdGhdO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0aWYgKHggPT0gMCkge1xyXG5cdFx0XHRcdFx0bCA9IENvbnN0YW50cy5NQVBfQkxPQ0tfTEVOR1RIIC0gbWFwW3ggKyB5ICogd2lkdGhdO1xyXG5cdFx0XHRcdFx0ciA9IG1hcFsoeCArIDEpICsgeSAqIHdpZHRoXSAtIG1hcFt4ICsgeSAqIHdpZHRoXTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHggPT0gd2lkdGggLSAxKSB7XHJcblx0XHRcdFx0XHRsID0gbWFwWyh4IC0gMSkgKyB5ICogd2lkdGhdIC0gbWFwW3ggKyB5ICogd2lkdGhdO1xyXG5cdFx0XHRcdFx0ciA9IENvbnN0YW50cy5NQVBfQkxPQ0tfTEVOR1RIIC0gbWFwW3ggKyB5ICogd2lkdGhdO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRsID0gbWFwWyh4IC0gMSkgKyB5ICogd2lkdGhdIC0gbWFwW3ggKyB5ICogd2lkdGhdO1xyXG5cdFx0XHRcdFx0ciA9IG1hcFsoeCArIDEpICsgeSAqIHdpZHRoXSAtIG1hcFt4ICsgeSAqIHdpZHRoXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0bmV3IEJ1ZmZlck1hcEJsb2NrKGwsIHIsIHQsIGIsIHgqQ29uc3RhbnRzLk1BUF9CTE9DS19MRU5HVEgsIHkqQ29uc3RhbnRzLk1BUF9CTE9DS19MRU5HVEgsIG1hcFt4ICsgeSAqIHdpZHRoXSwgdGhpcykuY3JlYXRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0dXBkYXRlV2luZG93U2l6ZShzY3JlZW5XLCBzY3JlZW5IKSB7XHJcblx0XHR0aGlzLnJlbmRlcmVyLnNldFNpemUoc2NyZWVuVywgc2NyZWVuSCwgZmFsc2UpO1xyXG5cdFx0dGhpcy5jYW1lcmEuYXNwZWN0ID0gc2NyZWVuVyAvIHNjcmVlbkg7XHJcblx0XHR0aGlzLmNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XHJcblx0XHR0aGlzLmRvbUVsZW1lbnQgPSB0aGlzLnJlbmRlcmVyLmRvbUVsZW1lbnQ7XHJcblx0fVxyXG5cdHVwZGF0ZShkZWx0YSkge1xyXG5cdFx0dGhpcy5lbnRpdHlNYW5hZ2VyLnVwZGF0ZShkZWx0YSk7XHJcblx0XHQvL3RoaXMuY29udHJvbGxlci51cGRhdGUoZGVsdGEpO1xyXG5cclxuXHRcdC8vaWYgKENvbnN0YW50cy5ERUJVR19ET19FTlRJVFlfSU5URVJQT0xBVElPTikgdGhpcy5pbnRlcnBvbGF0ZUVudGl0aWVzKCk7XHJcblx0fVxyXG5cdC8qXHJcblx0aW50ZXJwb2xhdGVFbnRpdGllcygpIHtcclxuXHRcdHZhciBkZWxheWVkVGltZSA9IERhdGUubm93KCkgLSAoMTAwMC4wIC8gQ29uc3RhbnRzLlNFUlZFUl9TRU5EX1JBVEUpO1xyXG5cdFx0dmFyIGxhc3QgPSAwO1xyXG5cdFx0dmFyIG5leHQgPSAxO1xyXG5cclxuXHRcdEVudGl0eU1hbmFnZXIuZW50aXRpZXMuZm9yRWFjaChlbnRpdHkgPT4ge1xyXG5cdFx0XHRpZiAoZW50aXR5LnR5cGUgPT0gRW50aXR5VC5QTEFZRVIgJiYgZW50aXR5LnNvY2tldElEID09IHRoaXMuY2xpZW50UGxheWVyLnNvY2tldElEKSByZXR1cm47XHJcblx0XHRcdHZhciBidWZmZXIgPSBlbnRpdHkucG9zaXRpb25CdWZmZXI7XHJcblxyXG5cdFx0XHR3aGlsZShidWZmZXIubGVuZ3RoID49IDIgJiYgYnVmZmVyW25leHRdLnRpbWUgPD0gZGVsYXllZFRpbWUpIHtcclxuXHRcdFx0XHRidWZmZXIuc2hpZnQoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGJ1ZmZlci5sZW5ndGggPj0gMiAmJiBidWZmZXJbbGFzdF0udGltZSA8PSBkZWxheWVkVGltZSAmJiBidWZmZXJbbmV4dF0udGltZSA+PSBkZWxheWVkVGltZSkge1xyXG5cdFx0XHRcdHZhciB0aW1lUGVyY2VudCA9IChkZWxheWVkVGltZSAtIGJ1ZmZlcltsYXN0XS50aW1lKSAvIChidWZmZXJbbmV4dF0udGltZSAtIGJ1ZmZlcltsYXN0XS50aW1lKVxyXG5cdFx0XHRcdHZhciBweCA9IExNYXRoLmxlcnAoYnVmZmVyW2xhc3RdLnN0YXRlLnBvc2l0aW9uLngsIGJ1ZmZlcltuZXh0XS5zdGF0ZS5wb3NpdGlvbi54LCB0aW1lUGVyY2VudCk7XHJcblx0XHRcdFx0dmFyIHB5ID0gTE1hdGgubGVycChidWZmZXJbbGFzdF0uc3RhdGUucG9zaXRpb24ueSwgYnVmZmVyW25leHRdLnN0YXRlLnBvc2l0aW9uLnksIHRpbWVQZXJjZW50KTtcclxuXHRcdFx0XHR2YXIgcHogPSBMTWF0aC5sZXJwKGJ1ZmZlcltsYXN0XS5zdGF0ZS5wb3NpdGlvbi56LCBidWZmZXJbbmV4dF0uc3RhdGUucG9zaXRpb24ueiwgdGltZVBlcmNlbnQpO1xyXG5cclxuXHRcdFx0XHR2YXIgbGFzdFJvdGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5zZXRGcm9tRXVsZXIobmV3IFRIUkVFLkV1bGVyKFxyXG5cdFx0XHRcdFx0YnVmZmVyW2xhc3RdLnN0YXRlLnJvdGF0aW9uLngsXHJcblx0XHRcdFx0XHRidWZmZXJbbGFzdF0uc3RhdGUucm90YXRpb24ueSxcclxuXHRcdFx0XHRcdGJ1ZmZlcltsYXN0XS5zdGF0ZS5yb3RhdGlvbi56LCBcIllYWlwiKSk7XHJcblx0XHRcdFx0dmFyIG5leHRSb3RhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuc2V0RnJvbUV1bGVyKG5ldyBUSFJFRS5FdWxlcihcclxuXHRcdFx0XHRcdGJ1ZmZlcltuZXh0XS5zdGF0ZS5yb3RhdGlvbi54LFxyXG5cdFx0XHRcdFx0YnVmZmVyW25leHRdLnN0YXRlLnJvdGF0aW9uLnksXHJcblx0XHRcdFx0XHRidWZmZXJbbmV4dF0uc3RhdGUucm90YXRpb24ueiwgXCJZWFpcIikpO1xyXG5cdFx0XHRcdHZhciBzbGVycFJvdGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcclxuXHRcdFx0XHRUSFJFRS5RdWF0ZXJuaW9uLnNsZXJwKGxhc3RSb3RhdGlvbiwgbmV4dFJvdGF0aW9uLCBzbGVycFJvdGF0aW9uLCB0aW1lUGVyY2VudCk7XHJcblx0XHRcdFx0dmFyIHBSb3QgPSBuZXcgVEhSRUUuRXVsZXIoKS5zZXRGcm9tUXVhdGVybmlvbihzbGVycFJvdGF0aW9uLCBcIllYWlwiKTtcclxuXHRcdFx0XHRlbnRpdHkucG9zaXRpb24uc2V0KHB4LCBweSwgcHopO1xyXG5cdFx0XHRcdGVudGl0eS5yb3RhdGlvbi5zZXQocFJvdC54LCBwUm90LnksIHBSb3Queik7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHQqL1xyXG5cdHJlbmRlcigpIHtcclxuXHRcdHRoaXMucmVuZGVyZXIuc2V0Q2xlYXJDb2xvcigweDBhMDgwNiwgMSk7XHJcbiAgIFx0dGhpcy5yZW5kZXJlci5zZXRQaXhlbFJhdGlvKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvKTtcclxuICAgXHR0aGlzLnJlbmRlcmVyLnJlbmRlcih0aGlzLnNjZW5lLCB0aGlzLmNhbWVyYSk7XHJcblx0fVxyXG5cdGxpZ2h0VXAoeCwgeSwgeikge1xyXG5cdFx0dmFyIHBMaWdodCA9IG5ldyBUSFJFRS5Qb2ludExpZ2h0KCAweGZmZmZmZiwgMC41LCBDb25zdGFudHMuTUFQX0JMT0NLX0xFTkdUSCk7XHJcblx0XHRwTGlnaHQucG9zaXRpb24uc2V0KHgsIHksIHopO1xyXG5cdFx0cExpZ2h0LmNhc3RTaGFkb3cgPSBmYWxzZTtcclxuXHRcdHRoaXMuc2NlbmUuYWRkKCBwTGlnaHQgKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gV29ybGQ7XHJcbiIsInZhciBDb25zdGFudHMgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL0NvbnN0YW50c1wiKTtcclxudmFyIENvbXBvbmVudFQgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9Db21wb25lbnRUXCIpO1xyXG5cclxudmFyIEVDUyA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0VDU1wiKTtcclxuXHJcbmNsYXNzIEFpbUNvbXBvbmVudCBleHRlbmRzIEVDUy5Db21wb25lbnQge1xyXG5cdGNvbnN0cnVjdG9yKGNhbWVyYSkge1xyXG5cdFx0c3VwZXIoQ29tcG9uZW50VC5BSU0sIHtcclxuXHRcdFx0YWltUm90YXRpb246IG5ldyBUSFJFRS5FdWxlcigwLCAwLCAwLCBDb25zdGFudHMuUk9UQVRJT05fT1JERVIpXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQWltQ29tcG9uZW50O1xyXG4iLCJ2YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBBbmltYXRpb25Db21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuQU5JTUFUSU9OLCB7XHJcblx0XHRcdG1peGVyOiB1bmRlZmluZWQsXHJcblx0XHRcdGFuaW1hdGlvbnM6IHVuZGVmaW5lZCxcclxuXHRcdFx0dHJhbnNpdGlvblRvQWN0aW9uTmFtZTogQ29uc3RhbnRzLk5PX0FOSU1BVElPTixcclxuXHRcdFx0Y3VycmVudEFjdGlvbk5hbWU6IENvbnN0YW50cy5OT19BTklNQVRJT04sXHJcblx0XHRcdGFjdGl2ZUFjdGlvbjogdW5kZWZpbmVkLFxyXG5cdFx0XHRmYWRlRHVyYXRpb246IDAuMiAvL0Ftb3VudCBvZiB0aW1lIGl0IHRha2VzIHRvIGZhZGUgaW50byBhIG5ldyBhbmltYXRpb25cclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb25Db21wb25lbnQ7XHJcbiIsInZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBDYW1lcmFDb21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcihjYW1lcmEpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuQ0FNRVJBLCB7XHJcblx0XHRcdGNhbWVyYTogY2FtZXJhLFxyXG5cdFx0XHRjYW1lcmFPZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2FtZXJhQ29tcG9uZW50O1xyXG4iLCJ2YXIgQ29tcG9uZW50VCA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0NvbXBvbmVudFRcIik7XHJcblxyXG52YXIgRUNTID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRUNTXCIpO1xyXG5cclxuY2xhc3MgTW9kZWxDb21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuTU9ERUwsIHtcclxuXHRcdFx0bW9kZWxJbmZvOiB1bmRlZmluZWQsXHJcblx0XHRcdG1lc2g6IHVuZGVmaW5lZCxcclxuXHRcdFx0bW9kZWxPZmZzZXQ6IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDApXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTW9kZWxDb21wb25lbnQ7XHJcbiIsInZhciBDb25zdGFudHMgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL0NvbnN0YW50c1wiKTtcclxudmFyIENvbXBvbmVudFQgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9Db21wb25lbnRUXCIpO1xyXG5cclxudmFyIEVDUyA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0VDU1wiKTtcclxuXHJcbmNsYXNzIE1vdmVtZW50QmxlbmRDb21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuTU9WRV9CTEVORCwge1xyXG5cdFx0XHRkZWx0YUZvcndhcmQ6IDAsXHJcblx0XHRcdGRlbHRhUmlnaHQ6IDAsXHJcblx0XHRcdHRhcmdldERlbHRhRm9yd2FyZDogMCxcclxuXHRcdFx0dGFyZ2V0RGVsdGFSaWdodDogMCxcclxuXHRcdFx0aWRsZVdlaWdodDogMSxcclxuXHRcdFx0cmVzdG9yZVJhdGU6IDAuMDgsXHJcblx0XHRcdGVuZERlbHRhUmlnaHQgOiAwLFxyXG5cdFx0XHRpZGxlQW5pbWF0aW9uOiB1bmRlZmluZWQsXHJcblx0XHRcdGZvcndhcmRBbmltYXRpb246IHVuZGVmaW5lZCxcclxuXHRcdFx0bGVmdFN0cmFmZUFuaW1hdGlvbjogdW5kZWZpbmVkLFxyXG5cdFx0XHRyaWdodFN0cmFmZUFuaW1hdGlvbjogdW5kZWZpbmVkXHJcblx0XHR9KTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTW92ZW1lbnRCbGVuZENvbXBvbmVudDtcclxuIiwidmFyIENvbXBvbmVudFQgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9Db21wb25lbnRUXCIpO1xyXG5cclxudmFyIEVDUyA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0VDU1wiKTtcclxuXHJcbmNsYXNzIFNHTElucHV0Q29tcG9uZW50IGV4dGVuZHMgRUNTLkNvbXBvbmVudCB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHRzdXBlcihDb21wb25lbnRULklOUFVULCB7XHJcblx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblxyXG5cdFx0XHRtb3ZlRm9yd2FyZDogZmFsc2UsXHJcblx0XHRcdG1vdmVMZWZ0OiBmYWxzZSxcclxuXHRcdFx0bW92ZUJhY2t3YXJkOiBmYWxzZSxcclxuXHRcdFx0bW92ZVJpZ2h0OiBmYWxzZSxcclxuXHRcdFx0bW92ZVVwOiBmYWxzZSxcclxuXHRcdFx0bW92ZURvd246IGZhbHNlLFxyXG5cdFx0XHRzcHJpbnQ6IGZhbHNlLFxyXG5cdFx0XHRqdW1wOiBmYWxzZSxcclxuXHJcblx0XHRcdGxlZnRNb3VzZUNsaWNrOiBmYWxzZSxcclxuXHRcdFx0cmlnaHRNb3VzZUNsaWNrOiBmYWxzZSxcclxuXHRcdFx0YWNjdW11bGF0ZWRNb3VzZVg6IDAsXHJcblx0XHRcdGFjY3VtdWxhdGVkTW91c2VZOiAwLFxyXG5cdFx0XHRtb3VzZU1vdmVtZW50WDogMCwgLy9wZXIgMSB1cGRhdGUgdGlja1xyXG5cdFx0XHRtb3VzZU1vdmVtZW50WTogMCAgLy9wZXIgMSB1cGRhdGUgdGlja1xyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNHTElucHV0Q29tcG9uZW50O1xyXG4iLCJ2YXIgQ29tcG9uZW50VCA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0NvbXBvbmVudFRcIik7XHJcblxyXG52YXIgRUNTID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRUNTXCIpO1xyXG5cclxuY2xhc3MgU0dMU2V0dGluZ3NDb21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuU0VUVElOR1MsIHtcclxuXHRcdFx0dHVyblNwZWVkOiAwLjAwMVxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNHTFNldHRpbmdzQ29tcG9uZW50O1xyXG4iLCJ2YXIgQ29tcG9uZW50VCA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0NvbXBvbmVudFRcIik7XHJcblxyXG52YXIgRUNTID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRUNTXCIpO1xyXG5cclxuY2xhc3MgU3RhdHNDb21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuU1RBVFMsIHtcclxuXHRcdFx0aGVhbHRoOiAwLFxyXG5cdFx0XHRwaHlzaWNhbERtZzogMCxcclxuXHRcdFx0Y3JpdENoYW5jZTogMCxcclxuXHRcdFx0YXR0YWNrU3BlZWQ6IDAsXHJcblxyXG5cdFx0XHRzdGFtaW5hOiAwLFxyXG5cdFx0XHRtb3ZlbWVudFNwZWVkOiAwLFxyXG5cclxuXHRcdFx0c2hpZWxkOiAwLFxyXG5cdFx0XHRwaHlzaWNhbERlZjogMCxcclxuXHRcdFx0dGVjaERlZjogMFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFN0YXRzQ29tcG9uZW50O1xyXG4iLCJ2YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBUcmFuc2Zvcm1Db21wb25lbnQgZXh0ZW5kcyBFQ1MuQ29tcG9uZW50IHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKENvbXBvbmVudFQuVFJBTlNGT1JNLCB7XHJcblx0XHRcdHBvc2l0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygpLFxyXG5cdFx0XHRyb3RhdGlvbjogbmV3IFRIUkVFLkV1bGVyKDAsIDAsIDAsIENvbnN0YW50cy5ST1RBVElPTl9PUkRFUilcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm1Db21wb25lbnQ7XHJcbiIsInZhciBFbnRpdHlUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRW50aXR5VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG52YXIgVHJhbnNmb3JtQ29tcG9uZW50ID0gcmVxdWlyZShcIi4uL2NvbXBvbmVudC9UcmFuc2Zvcm1Db21wb25lbnRcIik7XHJcblxyXG52YXIgTW9kZWxDb21wb25lbnQgPSByZXF1aXJlKFwiLi4vY29tcG9uZW50L01vZGVsQ29tcG9uZW50XCIpO1xyXG52YXIgQW5pbWF0aW9uQ29tcG9uZW50ID0gcmVxdWlyZShcIi4uL2NvbXBvbmVudC9BbmltYXRpb25Db21wb25lbnRcIik7XHJcbnZhciBNb3ZlbWVudEJsZW5kQ29tcG9uZW50ID0gcmVxdWlyZShcIi4uL2NvbXBvbmVudC9Nb3ZlbWVudEJsZW5kQ29tcG9uZW50XCIpO1xyXG5cclxudmFyIEFpbUNvbXBvbmVudCA9IHJlcXVpcmUoXCIuLi9jb21wb25lbnQvQWltQ29tcG9uZW50XCIpO1xyXG5cclxudmFyIFN0YXRzQ29tcG9uZW50ID0gcmVxdWlyZShcIi4uL2NvbXBvbmVudC9TdGF0c0NvbXBvbmVudFwiKTtcclxuXHJcbmNsYXNzIFBsYXllciBleHRlbmRzIEVDUy5FbnRpdHkge1xyXG5cdGNvbnN0cnVjdG9yKGlkKSB7XHJcblx0XHRzdXBlcihpZCwgRW50aXR5VC5QTEFZRVIsIFtcclxuXHRcdFx0bmV3IFRyYW5zZm9ybUNvbXBvbmVudCgpLFxyXG5cclxuXHRcdFx0bmV3IE1vZGVsQ29tcG9uZW50KCksXHJcblx0XHRcdG5ldyBBbmltYXRpb25Db21wb25lbnQoKSxcclxuXHRcdFx0bmV3IE1vdmVtZW50QmxlbmRDb21wb25lbnQoKSxcclxuXHJcblx0XHRcdG5ldyBBaW1Db21wb25lbnQoKSxcclxuXHJcblx0XHRcdG5ldyBTdGF0c0NvbXBvbmVudCgpXHJcblx0XHRdKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGxheWVyO1xyXG4iLCJ2YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBBbmltYXRpb25TeXN0ZW0gZXh0ZW5kcyBFQ1MuU3lzdGVtIHtcclxuXHRzZXRBY3Rpb25BbmltKGVudGl0eSwgbmFtZSkge1xyXG5cdFx0dmFyIGFuaW1hdG9yID0gZW50aXR5LmdldChDb21wb25lbnRULkFOSU1BVElPTik7XHJcblxyXG5cdFx0dmFyIHByZXZpb3VzQWN0aW9uID0gYW5pbWF0b3IuYWN0aXZlQWN0aW9uO1xyXG5cdFx0YW5pbWF0b3IuYWN0aXZlQWN0aW9uID0gYW5pbWF0b3IuYW5pbWF0aW9ucy5nZXQobmFtZSk7XHJcblx0XHRhbmltYXRvci5jdXJyZW50QWN0aW9uTmFtZSA9IG5hbWU7XHJcblxyXG5cdFx0dGhpcy5hY3RpdmVBY3Rpb24ucmVzZXQoKS5zZXRFZmZlY3RpdmVXZWlnaHQoMSkuc2V0RWZmZWN0aXZlVGltZVNjYWxlKDEpLnBsYXkoKTtcclxuXHRcdHByZXZpb3VzQWN0aW9uLmNyb3NzRmFkZVRvKHRoaXMuYWN0aXZlQWN0aW9uLCBkdXJhdGlvbik7XHJcblx0fVxyXG5cdHRlc3QoZW50aXR5KSB7XHJcblx0XHRyZXR1cm4gZW50aXR5LmNvbnRhaW5zKENvbXBvbmVudFQuVFJBTlNGT1JNKVxyXG5cdFx0XHQmJiBlbnRpdHkuY29udGFpbnMoQ29tcG9uZW50VC5NT0RFTClcclxuXHRcdFx0JiYgZW50aXR5LmNvbnRhaW5zKENvbXBvbmVudFQuQU5JTUFUSU9OKTtcclxuXHR9XHJcblx0ZW50ZXIoZW50aXR5KSB7XHJcblx0XHR2YXIgYW5pbWF0b3IgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuQU5JTUFUSU9OKTtcclxuXHRcdHZhciBtb2RlbEluZm8gPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1vZGVsSW5mbztcclxuXHJcblx0XHRhbmltYXRvci5taXhlciA9IG1vZGVsSW5mby5taXhlcjtcclxuXHRcdGFuaW1hdG9yLmFuaW1hdGlvbnMgPSBtb2RlbEluZm8uYW5pbWF0aW9ucztcclxuXHRcdG1vZGVsSW5mby5jb21waWxlQ2xpcHMoKTtcclxuXHR9XHJcblx0dXBkYXRlKGVudGl0eSwgZGVsdGEpIHtcclxuXHRcdHZhciBhbmltYXRvciA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5BTklNQVRJT04pO1xyXG5cclxuXHRcdC8qXHJcblx0XHR0aGlzLmNvdW50Kys7XHJcblx0XHR2YXIgd2FsayA9IE1hdGguYWJzKE1hdGguc2luKHRoaXMuY291bnQgLyAzMDApKTtcclxuXHRcdGlmICh3YWxrID4gMC41KSB3YWxrID0gMC41O1xyXG5cdFx0dmFyIGxlZnQgPSBNYXRoLmFicyhNYXRoLmNvcyh0aGlzLmNvdW50IC8gMzAwKSk7XHJcblx0XHRpZiAobGVmdCA+IDAuNSkgbGVmdCA9IDAuNTtcclxuXHRcdGFuaW1hdG9yLmFuaW1hdGlvbnMuZ2V0KFwiV2Fsa1wiKS5zZXRFZmZlY3RpdmVXZWlnaHQod2FsayAqIDIpO1xyXG5cdFx0YW5pbWF0b3IuYW5pbWF0aW9ucy5nZXQoXCJTdHJhZmVMZWZ0XCIpLnNldEVmZmVjdGl2ZVdlaWdodChsZWZ0ICogMik7XHJcblx0XHQqL1xyXG5cdFx0LypcclxuXHRcdGlmIChhbmltYXRvci50cmFuc2l0aW9uVG9BY3Rpb25OYW1lICE9PSBDb25zdGFudHMuTk9fQU5JTUFUSU9OKSB7XHJcblx0XHRcdGlmIChhbmltYXRvci5jdXJyZW50QWN0aW9uTmFtZSA9PT0gQ29uc3RhbnRzLk5PX0FOSU1BVElPTikge1xyXG5cdFx0XHRcdGFuaW1hdG9yLmFjdGl2ZUFjdGlvbiA9IGFuaW1hdG9yLmFuaW1hdGlvbnMuZ2V0KGFuaW1hdG9yLnRyYW5zaXRpb25Ub0FjdGlvbk5hbWUpO1xyXG5cdFx0XHRcdGFuaW1hdG9yLmFjdGl2ZUFjdGlvbi5wbGF5KCk7XHJcblx0XHRcdFx0YW5pbWF0b3IuY3VycmVudEFjdGlvbk5hbWUgPSBhbmltYXRvci50cmFuc2l0aW9uVG9BY3Rpb25OYW1lO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vRmFkZSB0byBuZXcgYWN0aW9uXHJcblx0XHRcdFx0dmFyIHByZXZpb3VzQWN0aW9uID0gYW5pbWF0b3IuYWN0aXZlQWN0aW9uO1xyXG5cdFx0XHRcdGFuaW1hdG9yLmFjdGl2ZUFjdGlvbiA9IGFuaW1hdG9yLmFuaW1hdGlvbnMuZ2V0KGFuaW1hdG9yLnRyYW5zaXRpb25Ub0FjdGlvbk5hbWUpO1xyXG5cclxuXHRcdFx0XHRpZiAoYW5pbWF0b3IuY3VycmVudEFjdGlvbk5hbWUgIT09IGFuaW1hdG9yLnRyYW5zaXRpb25Ub0FjdGlvbk5hbWUpIHtcclxuXHRcdFx0XHRcdHByZXZpb3VzQWN0aW9uLmZhZGVPdXQoYW5pbWF0b3IuZmFkZUR1cmF0aW9uKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGFuaW1hdG9yLmFjdGl2ZUFjdGlvbi5yZXNldCgpLnNldEVmZmVjdGl2ZVRpbWVTY2FsZSgxKS5zZXRFZmZlY3RpdmVXZWlnaHQoMSkuZmFkZUluKGFuaW1hdG9yLmZhZGVEdXJhdGlvbik7XHJcblx0XHRcdFx0YW5pbWF0b3IuYWN0aXZlQWN0aW9uLnBsYXkoKTtcclxuXHRcdFx0XHRhbmltYXRvci5jdXJyZW50QWN0aW9uTmFtZSA9IGFuaW1hdG9yLnRyYW5zaXRpb25Ub0FjdGlvbk5hbWU7XHJcblx0XHRcdH1cclxuXHRcdFx0YW5pbWF0b3IudHJhbnNpdGlvblRvQWN0aW9uTmFtZSA9IENvbnN0YW50cy5OT19BTklNQVRJT047XHJcblx0XHR9Ki9cclxuXHRcdGFuaW1hdG9yLm1peGVyLnVwZGF0ZShkZWx0YSAqIDAuMDAxKTsgLy9Db252ZXJ0IGZyb20gbXMgdG8gc2Vjb25kc1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBbmltYXRpb25TeXN0ZW07XHJcbiIsInZhciBDb25zdGFudHMgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL0NvbnN0YW50c1wiKTtcclxudmFyIExNYXRoID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9tYXRoL0xNYXRoXCIpO1xyXG52YXIgQ29tcG9uZW50VCA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vZWNzL0NvbXBvbmVudFRcIik7XHJcblxyXG52YXIgRUNTID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRUNTXCIpO1xyXG5cclxuY2xhc3MgRmlyc3RQZXJzb25TeXN0ZW0gZXh0ZW5kcyBFQ1MuU3lzdGVtIHtcclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnZlYyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XHJcblx0fVxyXG5cdC8qXHJcblx0b25Qb3NlQ2hhbmdlKHBvc2l0aW9uLCByb3RhdGlvbikge1xyXG5cdFx0dGhpcy5lbnRpdHkud29ybGQuc29ja2V0LmVtaXQoQ29uc3RhbnRzLk5FVF9DTElFTlRfUE9TRV9DSEFOR0UsIHBvc2l0aW9uLCByb3RhdGlvbi50b1ZlY3RvcjMoKSk7XHJcblx0fSovXHJcblx0bW92ZUZvcndhcmQoZW50aXR5LCBkaXN0YW5jZSkge1xyXG5cdFx0dmFyIGNhbWVyYSA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5DQU1FUkEpLmNhbWVyYTtcclxuXHRcdHRoaXMudmVjLnNldEZyb21NYXRyaXhDb2x1bW4oY2FtZXJhLm1hdHJpeCwgMCk7XHJcblx0XHR0aGlzLnZlYy5jcm9zc1ZlY3RvcnMoY2FtZXJhLnVwLCB0aGlzLnZlYyk7XHJcblx0XHRlbnRpdHkuZ2V0KENvbXBvbmVudFQuVFJBTlNGT1JNKS5wb3NpdGlvbi5hZGRTY2FsZWRWZWN0b3IodGhpcy52ZWMsIGRpc3RhbmNlKTtcclxuXHR9XHJcblx0bW92ZVJpZ2h0KGVudGl0eSwgZGlzdGFuY2UpIHtcclxuXHRcdHZhciBjYW1lcmEgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuQ0FNRVJBKS5jYW1lcmE7XHJcblx0XHR0aGlzLnZlYy5zZXRGcm9tTWF0cml4Q29sdW1uKGNhbWVyYS5tYXRyaXgsIDApO1xyXG5cdFx0ZW50aXR5LmdldChDb21wb25lbnRULlRSQU5TRk9STSkucG9zaXRpb24uYWRkU2NhbGVkVmVjdG9yKHRoaXMudmVjLCBkaXN0YW5jZSk7XHJcblx0fVxyXG5cdG1vdmVVcChlbnRpdHksIGRpc3RhbmNlKSB7XHJcblx0XHRlbnRpdHkuZ2V0KENvbXBvbmVudFQuVFJBTlNGT1JNKS5wb3NpdGlvbi55ICs9IGRpc3RhbmNlO1xyXG5cdH1cclxuXHR0ZXN0KGVudGl0eSkge1xyXG5cdFx0cmV0dXJuIGVudGl0eS5jb250YWlucyhDb21wb25lbnRULlRSQU5TRk9STSlcclxuXHRcdFx0JiYgZW50aXR5LmNvbnRhaW5zKENvbXBvbmVudFQuQ0FNRVJBKVxyXG5cdFx0XHQmJiBlbnRpdHkuY29udGFpbnMoQ29tcG9uZW50VC5BSU0pXHJcblx0XHRcdCYmIGVudGl0eS5jb250YWlucyhDb21wb25lbnRULkFOSU1BVElPTilcclxuXHRcdFx0JiYgZW50aXR5LmNvbnRhaW5zKENvbXBvbmVudFQuTU9WRV9CTEVORCk7XHJcblx0fVxyXG5cdGVudGVyKGVudGl0eSkge1xyXG5cdFx0dmFyIGNhbWVyYSA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5DQU1FUkEpLmNhbWVyYTtcclxuXHRcdHZhciBjYW1lcmFPZmZzZXQgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuQ0FNRVJBKS5jYW1lcmFPZmZzZXQ7XHJcblxyXG5cdFx0Y2FtZXJhLnBvc2l0aW9uLmFkZFZlY3RvcnMoZW50aXR5LmdldChDb21wb25lbnRULlRSQU5TRk9STSkucG9zaXRpb24sIGNhbWVyYU9mZnNldCk7XHJcblx0XHRjYW1lcmEucm90YXRpb24uY29weShlbnRpdHkuZ2V0KENvbXBvbmVudFQuQUlNKS5haW1Sb3RhdGlvbik7XHJcblx0XHRlbnRpdHkuZ2V0KENvbXBvbmVudFQuQUlNKS5haW1Sb3RhdGlvbi5zZXRGcm9tUXVhdGVybmlvbihjYW1lcmEucXVhdGVybmlvbik7XHJcblxyXG5cdFx0dmFyIGVudGl0eVJvdGF0aW9uID0gZW50aXR5LmdldChDb21wb25lbnRULlRSQU5TRk9STSkucm90YXRpb247XHJcblx0XHRlbnRpdHlSb3RhdGlvbi5zZXQoZW50aXR5Um90YXRpb24ueCwgZW50aXR5LmdldChDb21wb25lbnRULkFJTSkuYWltUm90YXRpb24ueSwgZW50aXR5Um90YXRpb24ueik7XHJcblx0fVxyXG5cdHVwZGF0ZShlbnRpdHksIGRlbHRhKSB7XHJcblx0XHR2YXIgZW50aXR5UG9zaXRpb24gPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuVFJBTlNGT1JNKS5wb3NpdGlvbjtcclxuXHRcdHZhciBpbnB1dCA9IHRoaXMubWFuYWdlci5nZXRTaW5nbGV0b24oQ29tcG9uZW50VC5JTlBVVCk7XHJcblxyXG5cdFx0Ly9DYWxjdWxhdGUgbW92ZW1lbnRcclxuXHRcdHZhciBhZGp1c3RlZFNwZWVkID0gZGVsdGEgKiBlbnRpdHkuZ2V0KENvbXBvbmVudFQuU1RBVFMpLm1vdmVtZW50U3BlZWQ7XHJcblx0XHRpZiAoaW5wdXQuc3ByaW50KSBhZGp1c3RlZFNwZWVkICo9IENvbnN0YW50cy5TUFJJTlRfQURKVVNUTUVOVDtcclxuXHRcdHZhciBtb3ZlRGlyID0gbmV3IFRIUkVFLlZlY3RvcjMoaW5wdXQubW92ZUZvcndhcmQgLSBpbnB1dC5tb3ZlQmFja3dhcmQsIGlucHV0Lm1vdmVVcCAtIGlucHV0Lm1vdmVEb3duLCBpbnB1dC5tb3ZlUmlnaHQgLSBpbnB1dC5tb3ZlTGVmdCkubm9ybWFsaXplKCk7XHJcblx0XHR2YXIgaXNNb3ZpbmcgPSAobW92ZURpci5sZW5ndGggIT09IDApXHJcblx0XHR0aGlzLm1vdmVGb3J3YXJkKGVudGl0eSwgYWRqdXN0ZWRTcGVlZCAqIG1vdmVEaXIueCk7XHJcblx0XHR0aGlzLm1vdmVVcChlbnRpdHksICBhZGp1c3RlZFNwZWVkICogbW92ZURpci55KTtcclxuXHRcdHRoaXMubW92ZVJpZ2h0KGVudGl0eSwgYWRqdXN0ZWRTcGVlZCAqIG1vdmVEaXIueik7XHJcblx0XHR2YXIgbW92ZUJsZW5kID0gZW50aXR5LmdldChDb21wb25lbnRULk1PVkVfQkxFTkQpO1xyXG5cdFx0bW92ZUJsZW5kLnRhcmdldERlbHRhRm9yd2FyZCA9IG1vdmVEaXIueDtcclxuXHRcdG1vdmVCbGVuZC50YXJnZXREZWx0YVJpZ2h0ID0gbW92ZURpci56O1xyXG5cclxuXHRcdC8vR2V0IGNhbWVyYSBhbmQgY2FtbWVyYSBvZmZzZXRcclxuXHRcdHZhciBjYW1lcmEgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuQ0FNRVJBKS5jYW1lcmE7XHJcblx0XHR2YXIgY2FtZXJhT2Zmc2V0ID0gZW50aXR5LmdldChDb21wb25lbnRULkNBTUVSQSkuY2FtZXJhT2Zmc2V0O1xyXG5cclxuXHRcdC8vQ2FsY3VsYXRlIGNhbWVyYSByb3RhdGlvblxyXG5cdFx0dmFyIGFpbVJvdGF0aW9uID0gZW50aXR5LmdldChDb21wb25lbnRULkFJTSkuYWltUm90YXRpb247XHJcblx0XHR2YXIgcHJldmlvdXNSb3RYID0gYWltUm90YXRpb24ueDtcclxuXHRcdHZhciBwcmV2aW91c1JvdFkgPSBhaW1Sb3RhdGlvbi55O1xyXG5cdFx0YWltUm90YXRpb24ueSAtPSBpbnB1dC5tb3VzZU1vdmVtZW50WCAqIHRoaXMubWFuYWdlci5nZXRTaW5nbGV0b24oQ29tcG9uZW50VC5TRVRUSU5HUykudHVyblNwZWVkO1xyXG5cdFx0YWltUm90YXRpb24ueCAtPSBpbnB1dC5tb3VzZU1vdmVtZW50WSAqIHRoaXMubWFuYWdlci5nZXRTaW5nbGV0b24oQ29tcG9uZW50VC5TRVRUSU5HUykudHVyblNwZWVkO1xyXG5cdFx0YWltUm90YXRpb24ueCA9IExNYXRoLmNsYW1wKGFpbVJvdGF0aW9uLngsIC1Db25zdGFudHMuUElfVFdPLCBDb25zdGFudHMuUElfVFdPKTtcclxuXHRcdHZhciBpc1R1cm5pbmcgPSBwcmV2aW91c1JvdFggIT0gYWltUm90YXRpb24ueCB8fCBwcmV2aW91c1JvdFkgIT0gYWltUm90YXRpb24ueTtcclxuXHJcblx0XHRpZihpc01vdmluZyB8fCBpc1R1cm5pbmcpIHtcclxuXHRcdFx0Ly9TZW5kIHN0YXRlIHRvIHNlcnZlclxyXG5cdFx0fVxyXG5cdFx0aWYgKGlzTW92aW5nKSB7XHJcblx0XHRcdGNhbWVyYS5wb3NpdGlvbi5hZGRWZWN0b3JzKGVudGl0eVBvc2l0aW9uLCBjYW1lcmFPZmZzZXQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGlzVHVybmluZykge1xyXG5cdFx0XHRjYW1lcmEucm90YXRpb24uY29weShhaW1Sb3RhdGlvbik7XHJcblx0XHRcdHZhciBlbnRpdHlSb3RhdGlvbiA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5UUkFOU0ZPUk0pLnJvdGF0aW9uO1xyXG5cdFx0XHRlbnRpdHlSb3RhdGlvbi5zZXQoZW50aXR5Um90YXRpb24ueCwgYWltUm90YXRpb24ueSwgZW50aXR5Um90YXRpb24ueik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpcnN0UGVyc29uU3lzdGVtO1xyXG4iLCJ2YXIgVXRpbHMgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL1V0aWxzXCIpO1xyXG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9Db25zdGFudHNcIik7XHJcbnZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBJbnB1dFN5c3RlbSBleHRlbmRzIEVDUy5TeXN0ZW0ge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgVXRpbHMuYmluZCh0aGlzLCB0aGlzLm9uTW91c2VEb3duKSwgZmFsc2UpO1xyXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBVdGlscy5iaW5kKHRoaXMsIHRoaXMub25Nb3VzZU1vdmUpLCBmYWxzZSk7XHJcblx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCBVdGlscy5iaW5kKHRoaXMsIHRoaXMub25Nb3VzZVVwKSwgZmFsc2UpO1xyXG5cdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgVXRpbHMuYmluZCh0aGlzLCB0aGlzLm9uS2V5RG93biksIGZhbHNlKTtcclxuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBVdGlscy5iaW5kKHRoaXMsIHRoaXMub25LZXlVcCksIGZhbHNlKTtcclxuXHR9XHJcblx0b25Nb3VzZURvd24oZXZlbnQpIHtcclxuXHRcdGlmICghdGhpcy5pbnB1dC5lbmFibGVkKSByZXR1cm47XHJcblx0XHRzd2l0Y2goZXZlbnQuYnV0dG9uKSB7XHJcblx0XHRcdGNhc2UgMDpcclxuXHRcdFx0XHR0aGlzLmlucHV0LmxlZnRNb3VzZUNsaWNrID0gdHJ1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSAyOlxyXG5cdFx0XHRcdHRoaXMuaW5wdXQucmlnaHRNb3VzZUNsaWNrID0gdHJ1ZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblx0b25Nb3VzZU1vdmUoZXZlbnQpIHtcclxuXHRcdGlmICghdGhpcy5pbnB1dC5lbmFibGVkKSByZXR1cm47XHJcblx0XHRldmVudCA9IGV2ZW50IHx8IHdpbmRvdy5ldmVudDtcclxuXHRcdHRoaXMuaW5wdXQuYWNjdW11bGF0ZWRNb3VzZVggKz0gZXZlbnQubW92ZW1lbnRYO1xyXG5cdFx0dGhpcy5pbnB1dC5hY2N1bXVsYXRlZE1vdXNlWSArPSBldmVudC5tb3ZlbWVudFk7XHJcblx0fVxyXG5cdG9uTW91c2VVcChldmVudCkge1xyXG5cdFx0aWYgKCF0aGlzLmlucHV0LmVuYWJsZWQpIHJldHVybjtcclxuXHRcdHN3aXRjaChldmVudC5idXR0b24pIHtcclxuXHRcdFx0Y2FzZSAwOlxyXG5cdFx0XHRcdHRoaXMuaW5wdXQubGVmdE1vdXNlQ2xpY2sgPSBmYWxzZTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSAyOlxyXG5cdFx0XHRcdHRoaXMuaW5wdXQucmlnaHRNb3VzZUNsaWNrID0gZmFsc2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cdG9uS2V5RG93bihldmVudCkge1xyXG5cdFx0aWYgKCF0aGlzLmlucHV0LmVuYWJsZWQpIHJldHVybjtcclxuXHRcdHN3aXRjaChldmVudC5rZXlDb2RlKSB7XHJcblx0XHRcdGNhc2UgODc6IC8qVyovIHRoaXMuaW5wdXQubW92ZUZvcndhcmQgPSBDb25zdGFudHMuUFJFU1NFRDsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNjU6IC8qQSovIHRoaXMuaW5wdXQubW92ZUxlZnQgPSBDb25zdGFudHMuUFJFU1NFRDsgYnJlYWs7XHJcblx0XHRcdGNhc2UgODM6IC8qUyovIHRoaXMuaW5wdXQubW92ZUJhY2t3YXJkID0gQ29uc3RhbnRzLlBSRVNTRUQ7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDY4OiAvKkQqLyB0aGlzLmlucHV0Lm1vdmVSaWdodCA9IENvbnN0YW50cy5QUkVTU0VEOyBicmVhaztcclxuXHJcblx0XHRcdGNhc2UgODI6IC8qUiovIHRoaXMuaW5wdXQubW92ZVVwID0gQ29uc3RhbnRzLlBSRVNTRUQ7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDcwOiAvKkYqLyB0aGlzLmlucHV0Lm1vdmVEb3duID0gQ29uc3RhbnRzLlBSRVNTRUQ7IGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAxNjogLypTaGlmdCovIHRoaXMuaW5wdXQuc3ByaW50ID0gQ29uc3RhbnRzLlBSRVNTRUQ7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDMyOiAvKlNwYWNlKi8gdGhpcy5pbnB1dC5qdW1wID0gQ29uc3RhbnRzLlBSRVNTRUQ7IGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRvbktleVVwKGV2ZW50KSB7XHJcblx0XHRpZiAoIXRoaXMuaW5wdXQuZW5hYmxlZCkgcmV0dXJuO1xyXG5cdFx0c3dpdGNoKGV2ZW50LmtleUNvZGUpIHtcclxuXHRcdFx0Y2FzZSA4NzogLypXKi8gdGhpcy5pbnB1dC5tb3ZlRm9yd2FyZCA9IENvbnN0YW50cy5SRUxFQVNFRDsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNjU6IC8qQSovIHRoaXMuaW5wdXQubW92ZUxlZnQgPSBDb25zdGFudHMuUkVMRUFTRUQ7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDgzOiAvKlMqLyB0aGlzLmlucHV0Lm1vdmVCYWNrd2FyZCA9IENvbnN0YW50cy5SRUxFQVNFRDsgYnJlYWs7XHJcblx0XHRcdGNhc2UgNjg6IC8qRCovIHRoaXMuaW5wdXQubW92ZVJpZ2h0ID0gQ29uc3RhbnRzLlJFTEVBU0VEOyBicmVhaztcclxuXHJcblx0XHRcdGNhc2UgODI6IC8qUiovIHRoaXMuaW5wdXQubW92ZVVwID0gQ29uc3RhbnRzLlJFTEVBU0VEOyBicmVhaztcclxuXHRcdFx0Y2FzZSA3MDogLypGKi8gdGhpcy5pbnB1dC5tb3ZlRG93biA9IENvbnN0YW50cy5SRUxFQVNFRDsgYnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlIDE2OiAvKlNoaWZ0Ki8gdGhpcy5pbnB1dC5zcHJpbnQgPSBDb25zdGFudHMuUkVMRUFTRUQ7IGJyZWFrO1xyXG5cdFx0XHRjYXNlIDMyOiAvKlNwYWNlKi8gdGhpcy5pbnB1dC5qdW1wID0gQ29uc3RhbnRzLlJFTEVBU0VEOyBicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblx0dGVzdChlbnRpdHkpIHtcclxuXHRcdHJldHVybiBlbnRpdHkuY29udGFpbnMoQ29tcG9uZW50VC5JTlBVVCk7XHJcblx0fVxyXG5cdGVudGVyKGVudGl0eSkge1xyXG5cdFx0dGhpcy5pbnB1dCA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5JTlBVVCk7XHJcblx0fVxyXG5cdHVwZGF0ZShlbnRpdHkpIHtcclxuXHRcdHRoaXMuaW5wdXQubW91c2VNb3ZlbWVudFggPSB0aGlzLmlucHV0LmFjY3VtdWxhdGVkTW91c2VYO1xyXG5cdFx0dGhpcy5pbnB1dC5tb3VzZU1vdmVtZW50WSA9IHRoaXMuaW5wdXQuYWNjdW11bGF0ZWRNb3VzZVk7XHJcblxyXG5cdFx0dGhpcy5pbnB1dC5hY2N1bXVsYXRlZE1vdXNlWCA9IDA7XHJcblx0XHR0aGlzLmlucHV0LmFjY3VtdWxhdGVkTW91c2VZID0gMDtcclxuXHR9XHJcblx0ZXhpdChlbnRpdHkpIHtcclxuXHRcdGVudGl0eS5nZXQoQ29tcG9uZW50VC5JTlBVVCkuZW5hYmxlZCA9IGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dFN5c3RlbTtcclxuIiwidmFyIENvbnN0YW50cyA9IHJlcXVpcmUoXCIuLi8uLi9jb21tb24vQ29uc3RhbnRzXCIpO1xyXG52YXIgTE1hdGggPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL21hdGgvTE1hdGhcIik7XHJcbnZhciBDb21wb25lbnRUID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvQ29tcG9uZW50VFwiKTtcclxuXHJcbnZhciBFQ1MgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9FQ1NcIik7XHJcblxyXG5jbGFzcyBNb3ZlbWVudEJsZW5kU3lzdGVtIGV4dGVuZHMgRUNTLlN5c3RlbSB7XHJcblx0dGVzdChlbnRpdHkpIHtcclxuXHRcdHJldHVybiBlbnRpdHkuY29udGFpbnMoQ29tcG9uZW50VC5BTklNQVRJT04pXHJcblx0XHRcdCYmIGVudGl0eS5jb250YWlucyhDb21wb25lbnRULk1PVkVfQkxFTkQpO1xyXG5cdH1cclxuXHRlbnRlcihlbnRpdHkpIHtcclxuXHRcdHZhciBhbmltYXRvciA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5BTklNQVRJT04pO1xyXG5cdFx0dmFyIG1vdmVCbGVuZCA9IGVudGl0eS5nZXQoQ29tcG9uZW50VC5NT1ZFX0JMRU5EKTtcclxuXHJcblx0XHRtb3ZlQmxlbmQuaWRsZUFuaW1hdGlvbiA9IGFuaW1hdG9yLmFuaW1hdGlvbnMuZ2V0KENvbnN0YW50cy5JRExFX0FOSU0pLnBsYXkoKTtcclxuXHRcdG1vdmVCbGVuZC5mb3J3YXJkQW5pbWF0aW9uID0gYW5pbWF0b3IuYW5pbWF0aW9ucy5nZXQoQ29uc3RhbnRzLkZPUldBUkRfQU5JTSkucGxheSgpO1xyXG5cdFx0bW92ZUJsZW5kLmxlZnRBbmltYXRpb24gPSBhbmltYXRvci5hbmltYXRpb25zLmdldChDb25zdGFudHMuTF9TVFJBRkVfQU5JTSkucGxheSgpO1xyXG5cdFx0bW92ZUJsZW5kLnJpZ2h0QW5pbWF0aW9uID0gYW5pbWF0b3IuYW5pbWF0aW9ucy5nZXQoQ29uc3RhbnRzLlJfU1RSQUZFX0FOSU0pLnBsYXkoKTtcclxuXHR9XHJcblx0dXBkYXRlKGVudGl0eSwgZGVsdGEpIHtcclxuXHRcdHZhciBtb3ZlQmxlbmQgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9WRV9CTEVORCk7XHJcblxyXG5cdFx0bW92ZUJsZW5kLmRlbHRhRm9yd2FyZCA9IExNYXRoLmxlcnAobW92ZUJsZW5kLmRlbHRhRm9yd2FyZCwgbW92ZUJsZW5kLnRhcmdldERlbHRhRm9yd2FyZCwgMC4yKTtcclxuXHRcdG1vdmVCbGVuZC5kZWx0YVJpZ2h0ID0gTE1hdGgubGVycChtb3ZlQmxlbmQuZGVsdGFSaWdodCwgbW92ZUJsZW5kLnRhcmdldERlbHRhUmlnaHQsIDAuMik7XHJcblxyXG5cdFx0dmFyIGRGID0gbW92ZUJsZW5kLmRlbHRhRm9yd2FyZDtcclxuXHRcdHZhciBkUiA9IG1vdmVCbGVuZC5kZWx0YVJpZ2h0O1xyXG5cclxuXHRcdHZhciBjb21iaW5lZERlbHRhID0gTWF0aC5hYnMoZEYpICsgTWF0aC5hYnMoZFIpO1xyXG5cdFx0dmFyIGlkbGVXZWlnaHQgPSAxIC8gKGNvbWJpbmVkRGVsdGEgKyAxKTtcclxuXHRcdG1vdmVCbGVuZC5pZGxlQW5pbWF0aW9uLnNldEVmZmVjdGl2ZVdlaWdodChtb3ZlQmxlbmQuaWRsZVdlaWdodCk7XHJcblxyXG5cdFx0aWYgKE1hdGguYWJzKGRGKSArIE1hdGguYWJzKGRSKSA8IG1vdmVCbGVuZC5yZXN0b3JlUmF0ZSAmJiBtb3ZlQmxlbmQuaWRsZVdlaWdodCA8IDEpIHtcclxuXHRcdFx0bW92ZUJsZW5kLmlkbGVXZWlnaHQgPSBMTWF0aC5sZXJwKG1vdmVCbGVuZC5pZGxlV2VpZ2h0LCAxLCBtb3ZlQmxlbmQucmVzdG9yZVJhdGUgLyAzKTtcclxuXHRcdH0gZWxzZSBpZiAoTWF0aC5hYnMoZEYpICsgTWF0aC5hYnMoZFIpID49IG1vdmVCbGVuZC5yZXN0b3JlUmF0ZSkge1xyXG5cdFx0XHRtb3ZlQmxlbmQuaWRsZVdlaWdodCA9IExNYXRoLmxlcnAobW92ZUJsZW5kLmlkbGVXZWlnaHQsIDAsIG1vdmVCbGVuZC5yZXN0b3JlUmF0ZSk7XHJcblx0XHR9XHJcblx0XHRpZiAobW92ZUJsZW5kLmlkbGVXZWlnaHQgPj0gMSkge1xyXG5cdFx0XHRtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi50aW1lID0gMDtcclxuXHRcdFx0bW92ZUJsZW5kLmxlZnRBbmltYXRpb24udGltZSA9IDA7XHJcblx0XHRcdG1vdmVCbGVuZC5yaWdodEFuaW1hdGlvbi50aW1lID0gMDtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgZm9yd2FyZFRpbWUgPSAyIC8gKDEgKyBNYXRoLnBvdyg1LCAtNSAqIGRGKSkgLSAxO1xyXG5cdFx0dmFyIG5vdEZvcndhcmQgPSBNYXRoLmFicyhkUik7XHJcblx0XHRtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi5zZXRFZmZlY3RpdmVUaW1lU2NhbGUoZm9yd2FyZFRpbWUpLnNldEVmZmVjdGl2ZVdlaWdodCgoMSAtIG1vdmVCbGVuZC5pZGxlV2VpZ2h0KSAqICgxIC0gbm90Rm9yd2FyZCAqIG5vdEZvcndhcmQgKiBub3RGb3J3YXJkKSAqIE1hdGguYWJzKGRGKSk7XHJcblxyXG5cdFx0Ly9DYWxpYnJhdGUgdGltaW5nIGZvciBsZWZ0IGFuaW1hdGlvblxyXG5cdFx0dmFyIGxlZnRUaW1lID0gMiAvICgxICsgTWF0aC5wb3coNSwgLTUgKiAtZFIpKSAtIDE7XHJcblx0XHRpZiAobW92ZUJsZW5kLnRhcmdldERlbHRhRm9yd2FyZCA+IDAuMSAmJiAtbW92ZUJsZW5kLnRhcmdldERlbHRhUmlnaHQgPiAwLjEpIHsgLy9Gb3J3YXJkIExlZnRcclxuXHRcdFx0aWYgKGZvcndhcmRUaW1lID4gbGVmdFRpbWUpIHsgLy9sZWZ0VGltZSBpcyBhbHdheXMgcG9zaXRpdmVcclxuXHRcdFx0XHRtb3ZlQmxlbmQubGVmdEFuaW1hdGlvbi50aW1lID0gbW92ZUJsZW5kLmZvcndhcmRBbmltYXRpb24udGltZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuIFx0XHRcdFx0bW92ZUJsZW5kLmZvcndhcmRBbmltYXRpb24udGltZSA9IG1vdmVCbGVuZC5sZWZ0QW5pbWF0aW9uLnRpbWU7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoLW1vdmVCbGVuZC50YXJnZXREZWx0YUZvcndhcmQgPiAwLjEgJiYgbW92ZUJsZW5kLnRhcmdldERlbHRhUmlnaHQgPiAwLjEpIHsgLy9CYWNrd2FyZCBSaWdodFxyXG5cdFx0XHRpZiAoZm9yd2FyZFRpbWUgPCBsZWZ0VGltZSkgeyAvL2xlZnRUaW1lIGlzIGFsd2F5cyBuZWdhdGl2ZVxyXG5cdFx0XHRcdG1vdmVCbGVuZC5sZWZ0QW5pbWF0aW9uLnRpbWUgPSBtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi50aW1lO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG4gXHRcdFx0XHRtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi50aW1lID0gbW92ZUJsZW5kLmxlZnRBbmltYXRpb24udGltZTsgLy9Qcm9ibGVtYXRpY1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly9DYWxpYnJhdGUgdGltaW5nIGZvciByaWdodCBhbmltYXRpb25cclxuXHRcdHZhciByaWdodFRpbWUgPSAyIC8gKDEgKyBNYXRoLnBvdyg1LCAtNSAqIGRSKSkgLSAxO1xyXG5cdFx0aWYgKG1vdmVCbGVuZC50YXJnZXREZWx0YUZvcndhcmQgPiAwLjEgJiYgbW92ZUJsZW5kLnRhcmdldERlbHRhUmlnaHQgPiAwLjEpIHsgLy9Gb3J3YXJkIFJpZ2h0XHJcblx0XHRcdGlmIChmb3J3YXJkVGltZSA+IHJpZ2h0VGltZSkge1xyXG5cdFx0XHRcdG1vdmVCbGVuZC5yaWdodEFuaW1hdGlvbi50aW1lID0gbW92ZUJsZW5kLmZvcndhcmRBbmltYXRpb24udGltZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuIFx0XHRcdFx0bW92ZUJsZW5kLmZvcndhcmRBbmltYXRpb24udGltZSA9IG1vdmVCbGVuZC5yaWdodEFuaW1hdGlvbi50aW1lO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKC1tb3ZlQmxlbmQudGFyZ2V0RGVsdGFGb3J3YXJkID4gMC4xICYmIC1tb3ZlQmxlbmQudGFyZ2V0RGVsdGFSaWdodCA+IDAuMSkgeyAvL0JhY2t3YXJkIExlZnRcclxuXHRcdFx0aWYgKGZvcndhcmRUaW1lIDwgcmlnaHRUaW1lKSB7XHJcblx0XHRcdFx0bW92ZUJsZW5kLnJpZ2h0QW5pbWF0aW9uLnRpbWUgPSBtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi50aW1lO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG4gXHRcdFx0XHRtb3ZlQmxlbmQuZm9yd2FyZEFuaW1hdGlvbi50aW1lID0gbW92ZUJsZW5kLnJpZ2h0QW5pbWF0aW9uLnRpbWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRpZiAobW92ZUJsZW5kLnRhcmdldERlbHRhRm9yd2FyZCA+IC0wLjEpIHtcclxuXHRcdFx0bW92ZUJsZW5kLmVuZERlbHRhUmlnaHQgPSBkUjtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1vdmVCbGVuZC5lbmREZWx0YVJpZ2h0ID0gLWRSO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1vdmVCbGVuZC5sZWZ0QW5pbWF0aW9uLnNldEVmZmVjdGl2ZVRpbWVTY2FsZShsZWZ0VGltZSkuc2V0RWZmZWN0aXZlV2VpZ2h0KExNYXRoLmxlcnAobW92ZUJsZW5kLmxlZnRBbmltYXRpb24ud2VpZ2h0LCAtbW92ZUJsZW5kLmVuZERlbHRhUmlnaHQsIDAuMSkpO1xyXG5cdFx0bW92ZUJsZW5kLnJpZ2h0QW5pbWF0aW9uLnNldEVmZmVjdGl2ZVRpbWVTY2FsZShyaWdodFRpbWUpLnNldEVmZmVjdGl2ZVdlaWdodChMTWF0aC5sZXJwKG1vdmVCbGVuZC5yaWdodEFuaW1hdGlvbi53ZWlnaHQsIG1vdmVCbGVuZC5lbmREZWx0YVJpZ2h0LCAwLjEpKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTW92ZW1lbnRCbGVuZFN5c3RlbTtcclxuIiwidmFyIENvbXBvbmVudFQgPSByZXF1aXJlKFwiLi4vLi4vY29tbW9uL2Vjcy9Db21wb25lbnRUXCIpO1xyXG5cclxudmFyIEFzc2V0cyA9IHJlcXVpcmUoXCIuLi8uLi9Bc3NldHNcIik7XHJcblxyXG52YXIgRUNTID0gcmVxdWlyZShcIi4uLy4uL2NvbW1vbi9lY3MvRUNTXCIpO1xyXG5cclxuY2xhc3MgUmVuZGVyU3lzdGVtIGV4dGVuZHMgRUNTLlN5c3RlbSB7XHJcblx0Y29uc3RydWN0b3Ioc2NlbmUpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnNjZW5lID0gc2NlbmU7XHJcblx0fVxyXG5cdHN0YXRpYyBpbml0TW9kZWwoZW50aXR5LCBhc3NldE5hbWUpIHtcclxuXHRcdGlmICghKGVudGl0eS5jb250YWlucyhDb21wb25lbnRULlRSQU5TRk9STSkgJiYgZW50aXR5LmNvbnRhaW5zKENvbXBvbmVudFQuTU9ERUwpKSkge1xyXG5cdFx0XHR0aHJvdyBcImVudGl0eSBkb2VzIG5vdCBjb250YWluIGEgXFxcIlRyYW5zZm9ybVxcXCIgYW5kIGEgXFxcIk1vZGVsXFxcIlwiO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblx0XHR2YXIgcG9zID0gZW50aXR5LmdldChDb21wb25lbnRULlRSQU5TRk9STSkucG9zaXRpb247XHJcblx0XHR2YXIgbW9kZWwgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpO1xyXG5cclxuXHRcdGVudGl0eS5nZXQoQ29tcG9uZW50VC5NT0RFTCkubW9kZWxJbmZvID0gQXNzZXRzLmdldChhc3NldE5hbWUpLmNyZWF0ZUNsb25lKCk7XHJcblx0XHRlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1lc2ggPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1vZGVsSW5mby5tZXNoO1xyXG5cdFx0ZW50aXR5LmdldChDb21wb25lbnRULk1PREVMKS5tZXNoLnBvc2l0aW9uLnNldChwb3MueCwgcG9zLnksIHBvcy56KTtcclxuXHR9XHJcblx0dGVzdChlbnRpdHkpIHtcclxuXHRcdHJldHVybiBlbnRpdHkuY29udGFpbnMoQ29tcG9uZW50VC5UUkFOU0ZPUk0pXHJcblx0XHRcdCYmIGVudGl0eS5jb250YWlucyhDb21wb25lbnRULk1PREVMKTtcclxuXHR9XHJcblx0ZW50ZXIoZW50aXR5KSB7XHJcblx0XHR0aGlzLnNjZW5lLmFkZChlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1lc2gpO1xyXG5cdH1cclxuXHR1cGRhdGUoZW50aXR5KSB7XHJcblx0XHR2YXIgdHJhbnNmb3JtID0gZW50aXR5LmdldChDb21wb25lbnRULlRSQU5TRk9STSk7XHJcblx0XHR2YXIgbW9kZWwgPSBlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpO1xyXG5cclxuXHRcdGVudGl0eS5nZXQoQ29tcG9uZW50VC5NT0RFTCkubWVzaC5wb3NpdGlvbi5hZGRWZWN0b3JzKHRyYW5zZm9ybS5wb3NpdGlvbiwgZW50aXR5LmdldChDb21wb25lbnRULk1PREVMKS5tb2RlbE9mZnNldCk7XHJcblx0XHRlbnRpdHkuZ2V0KENvbXBvbmVudFQuTU9ERUwpLm1lc2gucm90YXRpb24uY29weSh0cmFuc2Zvcm0ucm90YXRpb24pO1xyXG5cdH1cclxuXHRleGl0KGVudGl0eSkge1xyXG5cdFx0dGhpcy5zY2VuZS5yZW1vdmUoZW50aXR5LmdldChDb21wb25lbnRULk1PREVMKS5tZXNoKTtcclxuXHR9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVuZGVyU3lzdGVtO1xyXG4iXX0=
