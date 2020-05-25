var canvas;
var screenW;
var screenH;
var ctx;

const FPS = 60;

class Coord {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	toIndex(width) {
		return this.x + this.y * width;
	}
}

class Entity {
	constructor(x, y, z) {
		this.xpos = x;
		this.ypos = y;
		this.zpos = z;
	}
	update() {}
	render() {}
}

class ClientPlayer extends Entity{
	constructor(x = 0, y = 400, z = 0) {
		super(x, y, z);
		this.rot_x = 0;
		this.rot_y = 0;
		this.rot_z = 0;

		const MOVEMENT_SPEED = 20;
		const TURN_SPEED = 0.001;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 100000);
		this.controller = new FPSController(this.camera, graphics.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;

		//Temporary
		graphics.renderer.domElement.onclick = () => {
			this.controller.lock();
		};
	}
	update(delta) {
		this.controller.update(delta);
	}
	render() {
		//TODO if the clientPlayer is renderer, it should be rendererd here
	}
}

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

		this.domElement = domElement
		this.domElement.requestPointerLock = domElement.requestPointerLock || domElement.mozRequestPointerLock;
		document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

		this.initInput();

		domElement.requestPointerLock();
	}
	initInput() {
		document.addEventListener('mousemove', bind(this, this.onMouseMove), false);
		document.addEventListener('keydown', bind(this, this.onKeyDown), false);
		document.addEventListener('keyup', bind(this, this.onKeyUp), false);

		function bind(scope, fn) {
			return function() {
				fn.apply(scope, arguments);
			};
		};
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
	update(delta) {
		if (this.moveForward) this.camera.translateZ(-this.speed * delta);
		if (this.moveBackward) this.camera.translateZ(this.speed * delta);
		if (this.moveLeft) this.camera.translateX(-this.speed * delta);
		if (this.moveRight) this.camera.translateX(this.speed * delta);
		if (this.moveUp) this.camera.translateY(this.speed * delta);
		if (this.moveDown) this.camera.translateY(-this.speed * delta);
	}
	lock() {
		this.domElement.requestPointerLock();
	}
	unlock() {
		document.exitPointerLock();
	}
}

class MapGenerator {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.cellW = (width - 1) / 2;
		this.cellH = (width - 1) / 2;
	}
	static get WALL_HEIGHT() { return 10; }
	static get FLOOR_HEIGHT() { return 0; }
	generate() {
		if (this.width % 2 == 0 || this.height % 2 == 0) {
			throw "width and height of map must be odd";
		}
		this.map = [];
		for (var y = 0; y < this.height; y++) {
			for (var x = 0; x < this.width; x++) {
				this.setMap(x, y, MapGenerator.WALL_HEIGHT);
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
			&& this.getMap((cellX - 1) * 2 + 1, cellY * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX - 1 + cellY * this.cellW);
		if (cellX + 1 < this.cellW && !adjacentMap.includes(cellX + 1 + cellY * this.cellW)
			&& this.getMap((cellX + 1) * 2 + 1, cellY * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + 1 + cellY * this.cellW);
		if (cellY - 1 >= 0 && !adjacentMap.includes(cellX + (cellY - 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY - 1) * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + (cellY - 1) * this.cellW);
		if (cellY + 1 < this.cellH && !adjacentMap.includes(cellX + (cellY + 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY + 1) * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + (cellY + 1) * this.cellW);

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

var socket = io();
socket.on("hello", function() {
	console.log("hello server!");
});

const graphics = {
	testMap: [],
	mapBlock: class {
		constructor(l, r, t, b, x, y, alt){
      	this.left = l;
      	this.right = r;
         this.top = t;
         this.bottom = b;
         this.centerX = x;
         this.centerY = alt;
         this.centerZ = y;
		}
		static get LENGTH() {return 1000;}
      create() {
      	var geomTile = new THREE. BoxBufferGeometry(graphics.mapBlock.LENGTH,10,graphics.mapBlock.LENGTH);

         var boxMatF = new THREE.MeshPhongMaterial();
         var boxMatC = new THREE.MeshPhongMaterial();
         var boxMatW = new THREE.MeshPhongMaterial({color: 0x444444});

         var meshF = new THREE.Mesh(geomTile, boxMatF);
         meshF.material.color.setHex(0x650000);

         meshF.receiveShadow = true; //default
//                meshC.material.color.setHex(0x555555);
      	meshF.position.set(this.centerX, this.centerY, this.centerZ);
//                meshC.position.set(this.centerX, this.centerY+graphics.mapBlock.LENGTH, this.centerZ);

			if (this.left) {
         	var meshL = new THREE.Mesh(geomTile, boxMatW);
            meshL.castShadow = true;
            meshL.receiveShadow = true;
            meshL.position.set(this.centerX - graphics.mapBlock.LENGTH/2,this.centerY+graphics.mapBlock.LENGTH/2, this.centerZ);
            meshL.rotation.z = 90*Math.PI/180;
            graphics.scene.add(meshL);
			}
			if (this.right) {
         	var meshR = new THREE.Mesh(geomTile, boxMatW);
            meshR.castShadow = true;
            meshR.receiveShadow = true;
            meshR.position.set(this.centerX + graphics.mapBlock.LENGTH/2,this.centerY+graphics.mapBlock.LENGTH/2, this.centerZ);
            meshR.rotation.z = 90*Math.PI/180;
            graphics.scene.add(meshR);
			}
         if (this.top) {
         	var meshT = new THREE.Mesh(geomTile, boxMatW);
            meshT.castShadow = true;
            meshT.receiveShadow = true;
            meshT.position.set(this.centerX,this.centerY+graphics.mapBlock.LENGTH/2, this.centerZ-graphics.mapBlock.LENGTH/2);
            meshT.rotation.x = 90*Math.PI/180;
            graphics.scene.add(meshT);
			}
         if (this.bottom) {
         	var meshB = new THREE.Mesh(geomTile, boxMatW);
            meshB.castShadow = true;
            meshB.receiveShadow = true;
            meshB.position.set(this.centerX,this.centerY+graphics.mapBlock.LENGTH/2, this.centerZ+graphics.mapBlock.LENGTH/2);
            meshB.rotation.x = 90*Math.PI/180;
            graphics.scene.add(meshB);
			}
         graphics.scene.add(meshF);
   	}
	},
	init: function() {
		this.scene = new THREE.Scene();

		this.lightUp();

		// sphere existence is good for testing
		this.testSphere();

		this.interpretMap(main.map, main.mapSize, main.mapSize);

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMapSoft = true; // default THREE.PCFShadowMap

		document.body.appendChild(this.renderer.domElement);
	},
	render: function() {
		this.renderer.setClearColor( 0x0a0806, 1);
      this.renderer.setPixelRatio( window.devicePixelRatio );

      this.renderer.setSize(screenW, screenH);
      this.renderer.render(this.scene, main.player.camera);
	},
	lightUp: function(){
		var light = new THREE.AmbientLight( 0x008080, 1.35 ); // soft white light
		this.scene.add( light );

		var pLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
		pLight.decay = 2;
		pLight.position.set( 5000, 5000, 5000 );
		pLight.castShadow = true;
		pLight.shadow.bias = 0.0001;
		this.scene.add( pLight );
	},
	testSphere: function() {
		var geometry = new THREE.SphereGeometry( 600, 50, 50 );
      var material = new THREE.MeshStandardMaterial( {wireframe:false} );
      var mesh = new THREE.Mesh( geometry, material );
      mesh.material.color.setHex( 0xffff00 );
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.y = 800;
		this.scene.add( mesh );
	},
	interpretMap: function(map, width, height) {
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var l, r, t, b;

				if (map[x + y * width] == undefined)
					continue;

				if (y == 0) {
					t = true;
					b = !(map[x + (y + 1) * width]);
				} else if (y == height - 1) {
					t = !(map[x + (y - 1) * width]);
					b = true;
				} else {
					t = !(map[x + (y - 1) * width]);
					b = !(map[x + (y + 1) * width]);
				}

				if (x == 0) {
					l = true;
					r = !(map[(x + 1) + y * width]);
				} else if (x == width - 1) {
					l = !(map[(x - 1) + y * width]);
					r = true;
				} else {
					l = !(map[(x - 1) + y * width]);
					r = !(map[(x + 1) + y * width]);
				}

				block = new graphics.mapBlock(l, r, t, b, x*graphics.mapBlock.LENGTH, y*graphics.mapBlock.LENGTH, map[x + y * width]);
				graphics.testMap[x + y * width] = block;
				block.create();
			}
		}
	}
}

const main = {
	init: function() {
		this.mapSize = 51;
		this.mapGenerator = new MapGenerator(this.mapSize, this.mapSize);
		this.map = this.mapGenerator.generate();

		graphics.init();

		this.player = new ClientPlayer();
	},
	update: function(delta) {
		this.updateSize();

		this.player.update(delta);
	},
	render: function() {
		graphics.render();


		this.clearCanvas();
		ctx.fillStyle = "#0000FF";
		var rectSize = 5;
		for (var y = 0; y < this.mapSize; y++) {
			for (var x = 0; x < this.mapSize; x++) {
				if (this.map[x + y * this.mapSize] == MapGenerator.WALL_HEIGHT) {
					ctx.fillRect(x * rectSize, y * rectSize, rectSize, rectSize);
				}
			}
		}
	},
	BACKGROUND_COLOR: "#FF00FF",
	clearCanvas: function() {
		ctx.globalAlpha = 1;
		ctx.fillStyle = this.BACKGROUND_COLOR;
		ctx.fillRect(0, 0, screenW, screenH);
	},
	updateSize: function() {
		screenW = window.innerWidth ||
	   	document.documentElement.clientWidth ||
	    	document.body.clientWidth;
	  	screenH = window.innerHeight ||
	    	document.documentElement.clientHeight ||
	    	document.body.clientHeight;
		if (canvas.width != screenW) {
		   canvas.width = screenW;
		}
		if (canvas.height != screenH) {
			canvas.height = screenH;
		}
	}
}

window.onload =
	function Game() {
		document.body.style.marginTop = 0;
    	document.body.style.marginLeft = 0;
    	document.body.style.marginBottom = 0;
    	document.body.style.marginUp = 0;

		this.canvas = document.createElement("canvas");
    	this.ctx = this.canvas.getContext("2d");
		main.updateSize();
		main.init();

		var lastUpdateTime = (new Date()).getTime();
		setInterval(function() {
			var currentTime = (new Date()).getTime();
			var delta = currentTime - lastUpdateTime;
    		main.update(delta);
    		main.render();
			lastUpdateTime = currentTime;
  		}, 1000 / FPS);
  	}
