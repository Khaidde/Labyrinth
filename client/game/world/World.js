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

		this.mapSize = 5;
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
		this.renderer.compile(this.scene, this.player.camera);
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
