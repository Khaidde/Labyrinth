var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");

class OpponentPlayer extends Entity {
	constructor(world, x, y, z, rot_x, rot_y, name, socketID) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
		this.model = new THREE.Mesh(geometry, material);
		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
		this.world.scene.add(this.model);

		this.usernameLoad(this.name);
	}
	dispose() {
		this.scene.remove(this.model);
		this.scene.remove(this.textMesh);
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

         self.textMesh.position.x = self.model.position.x;
         self.textMesh.position.y = self.model.position.y+BufferMapBlock.LENGTH/4;
         self.textMesh.position.z = self.model.position.z;
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
	updatePlayerName(){
		this.textMesh.lookAt(this.world.player.camera.position);
		this.textMesh.position.x = this.model.position.x;
		this.textMesh.position.y = this.model.position.y + BufferMapBlock.LENGTH/4;
		this.textMesh.position.z = this.model.position.z;
	}
}

module.exports = OpponentPlayer;
