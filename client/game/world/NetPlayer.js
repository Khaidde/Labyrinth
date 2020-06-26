var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");
var Constants = require("../common/Constants");
var Assets = require("../../Assets");

class NetPlayer extends Entity {
	constructor(socketID, name, x, y, z, rot_x, rot_y, world) {
		super(x, y, z, world);
		this.name = name;
		this.socketID = socketID;

		if (this.world.clientSocketID != this.socketID) {
			//Init Model Mesh and Animation testing
			this.withModel("Player");
			this.mixer = new THREE.AnimationMixer(this.model);
			this.mixer.clipAction(Assets.getGLTFModel("Player").animations[2]).setDuration(1.3).play();

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

			//Init collision box
			this.withBoundingBox(new THREE.BoxGeometry(2, 2, 2), new THREE.Vector3(0, 0, -0.2));
		}
	}
	dispose() {
		super.dispose();
		if (this.world.clientSocketID != this.socketID) {
			this.world.scene.remove(this.usernameMesh);
		}
	}
	update(delta) {
		super.update(delta);
		if (this.world.clientSocketID != this.socketID) {
			this.updatePlayerName();
			if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) this.updateBoundingBox();
			if (this.mixer != undefined) this.mixer.update(delta * 0.001);
		}
	}
	setPlayerPose(x, y, z, rot_x, rot_y) {
		if (this.world.clientSocketID == this.socketID) throw "function can't be used by client player";
		this.position.set(x, y, z);
		this.rot_x = rot_x;
		this.rot_y = rot_y;
	}
	updatePlayerName() {
		if (this.world.clientSocketID == this.socketID) throw "function can't be used by client player";
		this.usernameMesh.position.set(this.position.x, this.position.y + Constants.MAP_BLOCK_LENGTH / 2, this.position.z);
		this.usernameMesh.lookAt(this.world.camera.position);
	}
}

module.exports = NetPlayer;
