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
