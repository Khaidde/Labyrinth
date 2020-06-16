var Entity = require("./Entity");

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
	usernameLoad(username){
      var textLoad = new THREE.FontLoader();
      var textGeom;
      textLoad.load( '../Aldo the Apache_Regular.json', function ( font ) {
          textGeom = new THREE.TextBufferGeometry( username, {
              font: font,
              size: length/(2*username.length),
              height: 0.1,
              curveSegments: 12,
              bevelEnabled: false,
//                    bevelThickness: length/2,
//                    bevelSize: length/3,
//                    bevelOffset: 0,
//                    bevelSegments: 5
          } );
          var textMat = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff });
          textMesh = new THREE.Mesh(textGeom, textMat);
          textMesh.position.x = 3*length;
          textMesh.position.y = 2*length;
          textMesh.position.z = 4*length;
          this.world.scene.add(textMesh);
      } );
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
}

module.exports = OpponentPlayer;
