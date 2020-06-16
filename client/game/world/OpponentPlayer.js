var Entity = require("./Entity");

class OpponentPlayer extends Entity {
	constructor(world, x, y, z, rot_x, rot_y, name, socketID) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		var size = 1;
		var geometry = new THREE.BoxGeometry( size, size, size );
		var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );

		usernameLoad(this.name);

		this.model = new THREE.Mesh(geometry, material);
		this.model.position.x = x;
		this.model.position.y = y;
		this.model.position.z = z;
		this.world.scene.add(this.model);
	}
	usernameLoad(username){
		var textLoad = new THREE.FontLoader();
    var textGeom;
    textLoad.load( '../Aldo the Apache_Regular.json', function ( font ) {
        textGeom = new THREE.TextBufferGeometry( username, {
            font: font,
            size: length/(4*username.length),
            height: 0.1,
            curveSegments: 12,
            bevelEnabled: false,
        } );
        var textMat = new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff });
        textMesh = new THREE.Mesh(textGeom, textMat);
        textMesh.position.x = this.model.position.x;
        textMesh.position.y = this.model.position.y+BufferMapBlock.LENGTH/5;
        textMesh.position.z = this.model.position.z;
        scene.add(textMesh);
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
