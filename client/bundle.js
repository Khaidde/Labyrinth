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
class Component {
	constructor(type, data) {
		this.type = type;
		this.data = data;
	}
}

module.exports = Component;

},{}],3:[function(require,module,exports){
const Utils = require("../common/Utils");

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
	addSystem(system) {
		this.systems.push(system);

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
		return new constructor(id);
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
}

module.exports = {
	Manager: Manager,
	Entity: Entity,
	Component: Component,
	System: System
}

},{"../common/Utils":12,"./Component":2,"./Entity":5,"./System":6}],4:[function(require,module,exports){
const Constants = require("../common/Constants");
const EntityType = require("../common/EntityType");
const ComponentType = require("../common/ComponentType");

const ECS = require("./ECS");

//_______________EXAMPLE USAGE OF ECS_______________//

//========ENTITY CLASSES========//
class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityType.PLAYER);
		this.addArrayOfComponents([
			new TransformComponent(),
			new ModelComponent()
		]);
	}
}

//========COMPONENT CLASSES========//
class TransformComponent extends ECS.Component {
	constructor() {
		super(ComponentType.TRANSFORM, {
			position: new THREE.Vector3(),
			rotation: new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER)
		});
	}
}
class ModelComponent extends ECS.Component {
	constructor() {
		super(ComponentType.MODEL, {
			assetName: ""
		});
	}
}

//========SYSTEM CLASSES========//
class MovementSystem extends ECS.System {
	test(entity) { //Test whether or not the entity's components are compatible with the system
		return entity.contains(ComponentType.TRANSFORM);
	}
	enter(entity) { //Called when the entity is added to the system
		var transform = entity.get(ComponentType.TRANSFORM);
		transform.rotation.set(10, 10, 10);
	}
	update(entity, delta) {
		var transform = entity.get(ComponentType.TRANSFORM);
		transform.position.x += 5 * delta;
		transform.position.y += 5 * delta;
	}
}
class RenderSystem extends ECS.System {
	test(entity) {
		return entity.contains(ComponentType.TRANSFORM)
			&& entity.contains(ComponentType.MODEL);
	}
	update(entity) {
		var transform = entity.get(ComponentType.TRANSFORM);
		var model = entity.get(ComponentType.MODEL);

		var pos = transform.position;
		var x = pos.x;
		var y = pos.y;
		var z = pos.z;

		//"render" the model
		console.log("Model {" + model.assetName + "} has been rendered at coordinate (" + pos.x + "," + pos.y + "," + pos.z + ")");
	}
	exit(entity) { //Called when the entity is removed from the system
		entity.get(ComponentType.MODEL).assetName = "";
		console.log("Entity model has been disposed");
		console.log(entity);
	}
}

var manager = new ECS.Manager();
manager.addArrayOfSystems([
	new MovementSystem(),
	new RenderSystem()
]);

manager.addEntityArchetype(EntityType.PLAYER, Player);

var player = new Player(5); //Assign random id of 5
player.get(ComponentType.TRANSFORM).position.set(10, 20, 30);
player.get(ComponentType.MODEL).assetName = "playerModel.gltf";
manager.addEntity(player);

var player2 = manager.createEntity(EntityType.PLAYER, 11); //Use archetype to create player with random id of 11
player2.get(ComponentType.TRANSFORM).position.set(-11, -13, -15);
player2.get(ComponentType.MODEL).assetName = "playerModel2.gltf";
manager.addEntity(player2);

const TOTAL_UPDATES = 3;
const SIMULATED_ELAPSED_TIME_MS = 5;
for (var i = 0; i < TOTAL_UPDATES; i++) {
	console.log("-----------------------");

	manager.update(SIMULATED_ELAPSED_TIME_MS);

	console.log("-----------------------");
}

//ExepectedOutput:

// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (35,45,30)
// Model {playerModel2.gltf} has been rendered at coordinate (14,12,-15)
// -----------------------
// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (60,70,30)
// Model {playerModel2.gltf} has been rendered at coordinate (39,37,-15)
// -----------------------
// -----------------------
// Model {playerModel.gltf} has been rendered at coordinate (85,95,30)
// Model {playerModel2.gltf} has been rendered at coordinate (64,62,-15)
// -----------------------

},{"../common/ComponentType":8,"../common/Constants":9,"../common/EntityType":10,"./ECS":3}],5:[function(require,module,exports){
const Utils = require("../common/Utils");
const EntityType = require("../common/EntityType");

class Entity {
	constructor(id, type) {
		this.id = id;
		this.type = type ? type : EntityType.GENERIC;

		this.systemsDirty = false;

		this.components = [];
		this.systems = [];
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
			throw "entity {" + this + "} does not contain system {" + system + "}";
		}
	}
	addComponent(component) {
		this.components[component.type] = component.data;
		this.setSystemsDirty();
	}
	addArrayOfComponents(components) {
		for (var i = 0, component; component = components[i]; i++) {
			this.addComponent(component);
		}
	}
	removeComponent(type) {
		if (!this.components[type]) {
			throw "entity {" + this + "} does not contain component {" + type + "}";
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

},{"../common/EntityType":10,"../common/Utils":12}],6:[function(require,module,exports){
const Utils = require("../common/Utils");

class System {
	constructor() {
		this.entities = [];
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
		for (let i = 0, entity; entity = this.entities[0]; i++) {
      	entity.removeSystem(this);
      	this.exit(entity);
   	}
	}
	enter(entity) {}
	test(entity) {
		throw "System {" + this + "} requires a /'test/' function overload";
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

},{"../common/Utils":12}],7:[function(require,module,exports){
var screenW;
var screenH;

var Constants = require("./common/Constants");
var Assets = require("../Assets");

var World = require("./world/World");

var ECStest = require("./ECS/ECSDemo");

const socket = io();

const main = {
	init: function() {
		Assets.init();
		main.initMenu();
		main.initPause();

		socket.on(Constants.NET_INIT_WORLD, function(worldInfo) {
			main.world = new World(socket, worldInfo);
			main.world.controller.addPointUnlockListener(function() {
				main.world.controller.enabled = false;
				main.pauseMenuOpacity = 0.01;
				document.getElementById("pauseMenu").style.opacity = 1;
				document.getElementById("pauseMenu").style.pointerEvents = "auto";
			});
			main.world.controller.lock();
			main.world.updateSize(screenW, screenH);
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

			main.world.controller.lock();
			main.world.controller.enabled = true;
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
				main.world.updateSize(screenW, screenH);
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

},{"../Assets":1,"./ECS/ECSDemo":4,"./common/Constants":9,"./world/World":19}],8:[function(require,module,exports){
const ComponentType = {
	TRANSFORM: "transform",
	MODEL: "model"
}

module.exports = ComponentType;

},{}],9:[function(require,module,exports){
const Constants = {
	FPS: 60,
	FPS_SMOOTHING_WEIGHT_RATIO: 0.9,
	SERVER_SEND_RATE: 20,

	ROTATION_ORDER: "YXZ",

	//World measurement constants
	MAP_BLOCK_LENGTH: 5,
	PLAYER_HEIGHT_OFFSET: 1.8,

	//Debug flags
	DEBUG_SHOW_ENTITY_BOUNDING_BOXES: true,
	DEBUG_DO_ENTITY_INTERPOLATION: true,

	//Networking events
	NET_SOCKET_PLAYER_LOGIN: "socket_player_login",
	NET_SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	NET_SERVER_TO_CLIENT_FORCE_DISCONNECT: "force_disconnect",
	NET_INIT_WORLD: "init_map",
	NET_WORLD_STATE_UPDATE: "state_update",
	NET_CLIENT_POSE_CHANGE: "client_pose_change",
}

module.exports = Constants;

},{}],10:[function(require,module,exports){
const EntityType = {
	GENERIC: "none",
	PLAYER: "player"
}

module.exports = EntityType;

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"../common/Constants":9,"./PlateFrame":18}],14:[function(require,module,exports){
var Constants = require("../common/Constants");
var Assets = require("../../Assets");

var EntityManager = require("./EntityManager");

class Entity {
	constructor(id, type, world) {
		this.id = id;
		this.type = type;
		this.world = world;

		this.position = new THREE.Vector3();
		this.rotation = new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER);

		this.positionBuffer = [];

		EntityManager.addEntity(this);
	}
	setPosition(position) {
		this.position.set(position.x, position.y, position.z);
	}
	setRotation(rotation) {
		this.rotation.set(rotation.x, rotation.y, rotation.z);
	}
	withModel(assetName) {
		this.modelInfo = Assets.get(assetName).createClone();
		this.model = this.modelInfo.mesh;
		this.mixer = this.modelInfo.mixer;
		this.animations = this.modelInfo.animations;
		this.model.position.set(this.position.x, this.position.y, this.position.z);
		this.world.scene.add(this.model);
		this.modelOffset = new THREE.Vector3();
		return this;
	}
	withModelOffset(offset) {
		this.modelOffset = offset;
		return this;
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
		return this;
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
		if (this.model != undefined) {
			this.model.position.addVectors(this.position, this.modelOffset);
			this.model.rotation.copy(this.rotation);
		}
	}
	updateBoundingBox() {
		if (this.boundingBoxDebugMesh != undefined) this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
	}
}

module.exports = Entity;

},{"../../Assets":1,"../common/Constants":9,"./EntityManager":15}],15:[function(require,module,exports){
var Utils = require("../common/Utils");

const EntityManager = {
	entities: [],
	addEntity(entity) {
		this.entities[entity.id] = entity;
	},
	removeEntity(id) {
		var entity = this.entities[id];
    	if (entity != undefined) {
      	Utils.splice(this.entities, id, 1);
    	} else {
			throw "entity {" + entity + "} does not exist and can't be removed";
		}
		entity.dispose();
	},
	dispose() {
		this.entities.forEach(entity => {
			entity.dispose();
		});
	}
}

module.exports = EntityManager;

},{"../common/Utils":12}],16:[function(require,module,exports){
var Utils = require("../common/Utils");
var Constants = require("../common/Constants");

//Adaptation of https://github.com/mrdoob/three.js/blob/master/examples/jsm/controls/PointerLockControls.js
class FirstPersonController {
	constructor(camera, domElement, entity) {
		this.entity = entity;
		this.camera = camera;

		this.speed = 1;
		this.turnSpeed = 0.001;

		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;

		this.moveUp = false;
		this.moveDown = false;

		this.sprinting = false;

		this.position = new THREE.Vector3();
		this.rotation = new THREE.Euler(0, 0, 0, Constants.ROTATION_ORDER);

		this.PI_2 = Math.PI / 2;
		this.vec = new THREE.Vector3();

		this.domElement = domElement;
		this.domElement.requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock;
		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		this.lockCallback = function(){};
		this.unlockCallback = function(){};

		this.enabled = true;
		document.addEventListener("pointerlockchange", Utils.bind(this, this.onPointerlockChange), false);
		document.addEventListener('mousemove', Utils.bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', Utils.bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', Utils.bind(this, this.onKeyUp), false);
	}
	initPose(x, y, z, rotX, rotY, rotZ) {
		this.position.set(x, y, z);
		this.rotation = new THREE.Euler(rotX, rotY, rotZ, Constants.ROTATION_ORDER);

		this.onPoseChange(this.position, this.rotation);
	}
	dispose() {
		this.enabled = false;
	}
	onPoseChange(position, rotation) {
		this.entity.world.socket.emit(Constants.NET_CLIENT_POSE_CHANGE, position, rotation.toVector3());
	}
	addPoseChangeListener(callback) {
		this.onPoseChange = callback;
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

		this.rotation.setFromQuaternion(this.camera.quaternion);

		this.rotation.y -= movementX * this.turnSpeed;
		this.rotation.x -= movementY * this.turnSpeed;

		this.rotation.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.rotation.x));

		this.camera.quaternion.setFromEuler(this.rotation); //TODO move this

		this.isTurning = true;
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

		this.isMoving = !previousPosition.equals(this.position);
		if(this.isMoving || this.isTurning) {
			this.onPoseChange(this.position, this.rotation);
			this.entity.updatePlayerPose(this.position.x, this.position.y, this.position.z, this.rotation.x, this.rotation.y);
			this.camera.position.addVectors(this.position, new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET, 0));
			this.camera.rotation.copy(this.rotation);
			if (this.isTurning) this.isTurning = false;
		}
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

module.exports = FirstPersonController;

},{"../common/Constants":9,"../common/Utils":12}],17:[function(require,module,exports){
var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");

var Constants = require("../common/Constants");
var EntityType = require("../common/EntityType");
var Assets = require("../../Assets");

class NetPlayer extends Entity {
	// constructor(socketID, name, x, y, z, rot_x, rot_y, world) {
	// 	super(x, y, z, world);
	constructor(id, world, socketID, name) {
		super(id, EntityType.PLAYER, world);
		this.name = name;
		this.socketID = socketID;
		this.isClientPlayer = (this.world.socket.id == this.socketID);

		//TODO assign these to unqiue item entities
		this.leftHandItem = undefined;
		this.rightHandItem = undefined;

		this.withModel("Player");
		this.withModelOffset(new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET - 1.8, 0));
		this.modelInfo.spliceBones("Idle", ["Head", "Neck", "ElbowL", "ElbowR", "HandL", "HandR"]);
		this.modelInfo.spliceBones("Walk", ["ElbowL", "ElbowR", "HandL", "HandR"]);
		this.modelInfo.compileClips();
		this.model.traverse(o => {
			if (o.isBone) {
				switch (o.name) {
				case "Head":
					this.head = o;
					break;
				case "ShoulderL":
					this.shoulderL = o;
					break;
				case "ShoulderR":
					this.shoulderR = o;
					break;
				case "HandL":
					this.handL = o;
					break;
				case "HandR":
					this.handR = o;
					break;
				case "ElbowL":
					this.elbowL = o;
					break;
				case "ElbowR":
					this.elbowR = o;
					break;
				}
			}
			if (o.isMesh && this.isClientPlayer) {
				var invisibleMaterial = o.material.clone();
				invisibleMaterial.visible = false;
				o.material = invisibleMaterial;
			}
		});

		this.activeAction = this.animations.get("Idle");
		this.activeAction.play();

		this.pistolModelL = Assets.get("Pistol").createClone().mesh;
		this.pistolModelL.position.set(0, 1.2, 0);
		this.handL.add(this.pistolModelL);

		this.pistolModelR = Assets.get("Pistol").createClone().mesh;
		this.pistolModelR.position.set(0, 1.2, 0);
		this.handR.add(this.pistolModelR);

		this.handItemRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
		this.pistolModelL.quaternion.multiply(this.handItemRotation);
		this.pistolModelR.quaternion.multiply(this.handItemRotation);

		//Init collision box
		this.withBoundingBox(new THREE.BoxGeometry(2, 2, 2), new THREE.Vector3(0, 0, -0.2));

		if (!this.isClientPlayer) {
			/*
			document.addEventListener('keydown', (event) => {
				if (event.keyCode == 32) {
					self.fadeToActionAnim("Jump", 0.2);
					function restore() {
						self.mixer.removeEventListener("finished", restore);
						self.fadeToActionAnim("Idle", 0.2);
					}
					self.mixer.addEventListener("finished", restore);
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

		}
	}
	dispose() {
		super.dispose();
		if (!this.isClientPlayer) {
			this.world.scene.remove(this.usernameMesh);
		}
	}
	update(delta) {
		super.update(delta);
		if (!this.isClientPlayer) {
			this.usernameMesh.position.addVectors(this.position, new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET * 5/3, 0));
			this.usernameMesh.lookAt(this.world.camera.position);
		}
		if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) this.updateBoundingBox();

		this.mixer.update(delta * 0.001);

		this.elbowL.rotation.x = 0;
		this.elbowL.rotation.y = 0;
		this.elbowL.rotation.z = Math.PI / 8;
		this.shoulderL.rotation.x = Math.PI;
		this.shoulderL.rotation.y = 0;
		this.shoulderL.rotation.z = this.targetingRotX + Math.PI * 1/3;

		this.elbowR.rotation.x = 0;
		this.elbowR.rotation.y = 0;
		this.elbowR.rotation.z = Math.PI / 8;
		this.shoulderR.rotation.x = Math.PI;
		this.shoulderR.rotation.y = 0;
		this.shoulderR.rotation.z = this.targetingRotX + Math.PI * 1/3;

		this.head.rotation.x = 0;
		this.head.rotation.y = 0;
		this.head.rotation.z = -this.targetingRotX;
	}
	/*
	setPoseFromController(controller) {
		if (!this.isClientPlayer) throw "function can't be used by non-client players";
		this.predictAnimation(controller.camera.position.x, controller.camera.position.y, controller.camera.position.z, controller.euler.y);

		this.position.addVectors(controller.position, new THREE.Vector3(0, -Constants.PLAYER_HEIGHT_OFFSET, 0));
		this.rotation.set(0, controller.euler.y, 0);
		this.targetingRotX = controller.euler.x;
		this.targetingRotY = controller.euler.y;
	}*/
	updatePlayerPose(x, y, z, rot_x, rot_y) {
		this.predictAnimation(x, y, z, rot_y);
		this.position.set(x, y, z);
		this.targetingRotX = rot_x;
		this.targetingRotY = rot_y;
		this.rotation.set(0, rot_y, 0)
	}
	setActionAnim(name, duration, timeScale=1) {
		if (this.currentActionName == name) {
			if (this.activeAction.getEffectiveTimeScale() != timeScale) {
				this.activeAction.setEffectiveTimeScale(timeScale);
			}
			return;
		}
		var previousAction = this.activeAction;
		this.activeAction = this.animations.get(name);
		this.currentActionName = name;

		this.activeAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(timeScale).play();
		this.activeAction.stopFading();
		previousAction.crossFadeTo(this.activeAction, duration);
	}
	predictAnimation(x, y, z, rot_y) {
		if (this.position.x != x || this.position.z != z) {
			var timeScale = 1;
			if (this.position.x > x) timeScale = -1;
			this.setActionAnim("Walk", 0.2, timeScale);
		} else {
			this.setActionAnim("Idle", 0.2);
		}
	}
}

module.exports = NetPlayer;

},{"../../Assets":1,"../common/Constants":9,"../common/EntityType":10,"./BufferMapBlock":13,"./Entity":14}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
var Constants = require("../common/Constants");
var EntityType = require("../common/EntityType");
var Utils = require("../common/Utils");
var LMath = require("../common/Math/LMath");

var EntityManager = require("./EntityManager");

var Entity = require("./Entity");
var NetPlayer = require("./NetPlayer");
var BufferMapBlock = require("./BufferMapBlock");

var FirstPersonController = require("./FirstPersonController");

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
		this.renderer.setClearColor(0x0a0806, 1);
   	this.renderer.setPixelRatio(window.devicePixelRatio);

		this.domElement = this.renderer.domElement;
		document.body.appendChild(this.domElement);

		//Initialize server listeners
		this.initServerListeners();

		//Initialize players
		this.netPlayers = new Map();
		this.initPlayer(worldInfo);

		this.initMap(worldInfo);
	}
	dispose() {
		this.bufferMapGeom.dispose();
		this.controller.dispose();
		this.scene.dispose();
		this.socket.off(Constants.NET_WORLD_STATE_UPDATE);

		EntityManager.dispose();
		this.domElement.parentElement.removeChild(this.domElement);
	}
	initServerListeners() {
		this.socket.on(Constants.NET_WORLD_STATE_UPDATE, Utils.bind(this, worldInfo => {
			this.updateNetPlayers(worldInfo.entities, worldInfo.removedEntityIDs);
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
				case EntityType.PLAYER:
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
				if (entityOnClient.type == EntityType.PLAYER && entityOnClient.socketID == this.clientPlayer.socketID) return;
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
				if (entityOnClient.type == EntityType.PLAYER && entityOnClient.socketID == this.clientPlayer.socketID) return;
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
		this.controller.update(delta);

		this.netPlayers.forEach((nPlayer) => {
			nPlayer.update(delta);
		});
		if (Constants.DEBUG_DO_ENTITY_INTERPOLATION) this.interpolateEntities();
	}
	interpolateEntities() {
		var delayedTime = Date.now() - (1000.0 / Constants.SERVER_SEND_RATE);
		var last = 0;
		var next = 1;

		EntityManager.entities.forEach(entity => {
			if (entity.type == EntityType.PLAYER && entity.socketID == this.clientPlayer.socketID) return;
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

},{"../common/Constants":9,"../common/EntityType":10,"../common/Math/LMath":11,"../common/Utils":12,"./BufferMapBlock":13,"./Entity":14,"./EntityManager":15,"./FirstPersonController":16,"./NetPlayer":17}]},{},[7]);
