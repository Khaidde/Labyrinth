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

var World = require("./world/World");

const socket = io();

const main = {
	init: function() {
		Assets.init();
		main.initMenu();
		main.initPause();

		socket.on(Constants.NET_INIT_WORLD, function(worldInfo) {
			main.world = new World(socket, worldInfo);
			/*
			main.world.controller.addPointUnlockListener(function() {
				main.world.controller.enabled = false;
				main.pauseMenuOpacity = 0.01;
				document.getElementById("pauseMenu").style.opacity = 1;
				document.getElementById("pauseMenu").style.pointerEvents = "auto";
			});
			main.world.controller.lock();
			*/
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

			//main.world.controller.lock();
			//main.world.controller.enabled = true;
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
			//main.world.controller.turnSpeed = mouseSensitivityOutput.value / 2000;
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

},{"./Assets":1,"./common/Constants":3,"./world/World":14}],3:[function(require,module,exports){
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
	TRANSFORM: "transform",
	MODEL: "model"
}

module.exports = ComponentT;

},{}],8:[function(require,module,exports){
const Utils = require("../Utils");

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
}

module.exports = {
	Manager: Manager,
	Entity: Entity,
	Component: Component,
	System: System
}

},{"../Utils":5,"./Component":6,"./Entity":9,"./System":11}],9:[function(require,module,exports){
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
			throw "entity {" + this + "} does not contain system {" + system + "}";
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

},{"../Utils":5,"./EntityT":10}],10:[function(require,module,exports){
const EntityT = {
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

},{"../Utils":5}],12:[function(require,module,exports){
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

},{"../common/Constants":3,"./PlateFrame":13}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{"../common/Constants":3,"../common/Math/LMath":4,"../common/Utils":5,"../common/ecs/ComponentT":7,"../common/ecs/ECS":8,"../common/ecs/EntityT":10,"./BufferMapBlock":12,"./entity/Player":17,"./system/RenderSystem":18}],15:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class ModelComponent extends ECS.Component {
	constructor() {
		super(ComponentT.MODEL, {
			assetName: "",
			modelInfo: undefined,
			mesh: undefined,
			isVisible: true,
			modelOffset: new THREE.Vector3(0, 0, 0)
		});
	}
}

module.exports = ModelComponent;

},{"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],16:[function(require,module,exports){
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

},{"../../common/Constants":3,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}],17:[function(require,module,exports){
var EntityT = require("../../common/ecs/EntityT");

var ECS = require("../../common/ecs/ECS");

var TransformComponent = require("../component/TransformComponent");
var ModelComponent = require("../component/ModelComponent");

class Player extends ECS.Entity {
	constructor(id) {
		super(id, EntityT.PLAYER);
		this.addArrayOfComponents([
			new TransformComponent(),
			new ModelComponent()
		]);
	}
}

module.exports = Player;

},{"../../common/ecs/ECS":8,"../../common/ecs/EntityT":10,"../component/ModelComponent":15,"../component/TransformComponent":16}],18:[function(require,module,exports){
var ComponentT = require("../../common/ecs/ComponentT");

var Assets = require("../../Assets");

var ECS = require("../../common/ecs/ECS");

class RenderSystem extends ECS.System {
	constructor(scene) {
		super();
		this.scene = scene;
	}
	test(entity) {
		return entity.contains(ComponentT.TRANSFORM)
			&& entity.contains(ComponentT.MODEL);
	}
	enter(entity) {
		var pos = entity.get(ComponentT.TRANSFORM).position;
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).modelInfo = Assets.get(entity.get(ComponentT.MODEL).assetName).createClone();
		entity.get(ComponentT.MODEL).mesh = entity.get(ComponentT.MODEL).modelInfo.mesh;
		entity.get(ComponentT.MODEL).mesh.position.set(pos.x, pos.y, pos.z);
		this.scene.add(entity.get(ComponentT.MODEL).mesh);
	}
	update(entity) {
		var transform = entity.get(ComponentT.TRANSFORM);
		var model = entity.get(ComponentT.MODEL);

		entity.get(ComponentT.MODEL).mesh.position.addVectors(transform.position, entity.get(ComponentT.MODEL).modelOffset);
		entity.get(ComponentT.MODEL).mesh.rotation.copy(transform.rotation);
	}
	exit(entity) { //Called when the entity is removed from the system
		this.scene.remove(entity.get(ComponentT.MODEL).mesh);
	}
}

module.exports = RenderSystem;

},{"../../Assets":1,"../../common/ecs/ComponentT":7,"../../common/ecs/ECS":8}]},{},[2]);
