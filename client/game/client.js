var screenW;
var screenH;

var Constants = require("./Constants");

var FPSController = require("./FPSController");
var MapGenerator = require("./MapGenerator");

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
	constructor(x = 0, y = 1000, z = 0) {
		super(x, y, z);

		const MOVEMENT_SPEED = 5;
		const TURN_SPEED = 0.001;

		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.position.x = x;
		this.camera.position.y = y;
		this.camera.position.z = z;

		this.controller = new FPSController(this.camera, graphics.renderer.domElement);
		this.controller.speed = MOVEMENT_SPEED;
		this.controller.turnSpeed = TURN_SPEED;
		this.controller.addPointUnlockListener(function() {
			graphics.menuOpacity = 0;
		});
	}
	update(delta) {
		this.controller.update(delta);
	}
	render() {
		//TODO if the clientPlayer is renderer, it should be rendererd here
	}
}

const socket = io();
socket.on("test", function(username, room) {
	console.log(username); //TODO remove
	console.log(room); //TODO remove
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

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMapSoft = true; // default THREE.PCFShadowMap

		document.body.appendChild(this.renderer.domElement);

		this.domElement = this.renderer.domElement;

		this.initMenu();
		this.initGame();
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
			main.player.controller.lock();
			document.getElementById("blocker").style.opacity = 0;
			graphics.menuOpacity = 1;

			socket.emit(Constants.SOCKET_PLAYER_LOGIN, roomIDInput.value, usernameInput.value);
			roomIDInput.value = "";
			usernameInput.value = "";
		});
	},
	initGame: function() {
		this.lightUp();

		// sphere existence is good for testing
		this.testSphere();

		this.interpretMap(main.map, main.mapSize, main.mapSize);
	},
	render: function() {
		if (this.menuOpacity < 1) {
			this.menuOpacity += 0.01;
			document.getElementById("blocker").style.opacity = this.menuOpacity;
		}
		this.renderer.setClearColor(0x0a0806, 1);
      this.renderer.setPixelRatio(window.devicePixelRatio);

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
	},
	updateSize: function() {
		screenW = window.innerWidth ||
	   	document.documentElement.clientWidth ||
	    	document.body.clientWidth;
	  	screenH = window.innerHeight ||
	    	document.documentElement.clientHeight ||
	    	document.body.clientHeight;
			/*
		if (graphics.do.width != screenW) {
		   canvas.width = screenW;
		}
		if (canvas.height != screenH) {
			canvas.height = screenH;
		}*/
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
