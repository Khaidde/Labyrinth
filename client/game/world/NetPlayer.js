var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");
var Constants = require("../Constants");

class NetPlayer extends Entity {
	constructor(world, x, y, z, rot_x, rot_y, name, socketID) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		this.modelLoad(x, y, z);

		this.usernameLoad(this.name);
	}
	dispose() {
		this.world.scene.remove(this.model);
		this.world.scene.remove(this.textMesh);
	}
	modelLoad(){
		var loader = new THREE.GLTFLoader();
		var self = this;
		loader.load('client/models/PREMADE_Helmet/DamagedHelmet.gltf', (gltf) => {
      	self.model = gltf.scene.children[0];
			self.model.position.x = self.position.x;
			self.model.position.y = self.position.y;
			self.model.position.z = self.position.z;
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
            size: Constants.MAP_BLOCK_LENGTH/(3*username.length),
            height: 0.1,
            curveSegments: 12,
            bevelEnabled: false,
   		});
         var textMat = new THREE.MeshBasicMaterial( { color: 0xffffff});
			textGeom.center();
         self.textMesh = new THREE.Mesh(textGeom, textMat);

         self.textMesh.position.x = self.position.x;
         self.textMesh.position.y = self.position.y+Constants.MAP_BLOCK_LENGTH/4;
         self.textMesh.position.z = self.position.z;

			self.textMesh.lookAt(self.world.player.camera.position);
         self.world.scene.add(self.textMesh);
   	});
	}
	update(delta) {
		this.updatePlayerName();
	}
	setPlayerPose(x, y, z, rot_x, rot_y) {
		this.position.x = x;
		this.position.y = y;
		this.position.z = z;
		this.rot_x = rot_x;
		this.rot_y = rot_y;

		if (this.model == undefined) return; //TODO temporary fix
		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
	}
	updatePlayerName() {
		if (this.textMesh == undefined) return; //TODO temporary fix
		this.textMesh.lookAt(this.world.player.camera.position);
		this.textMesh.position.x = this.position.x;
		this.textMesh.position.y = this.position.y + Constants.MAP_BLOCK_LENGTH/4;
		this.textMesh.position.z = this.position.z;
	}
}

module.exports = NetPlayer;
