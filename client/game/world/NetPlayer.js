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
			//Init Model Mesh
			this.withModel("Player");
			var modelMat = new THREE.MeshPhongMaterial({color: 0xffff00, side: THREE.FrontSide});
			this.model.children.forEach(child => {
				if (child.type == "SkinnedMesh") {
					child.material.color = new THREE.Color(0xff0000);
					child.material.metalness = 0.1;
				}
			});

			//Init animations
			this.mixer = new THREE.AnimationMixer(this.model);
			this.animations = new Map();
			var self = this;
			Assets.getGLTFModel("Player").animations.forEach((animation) => {
				var action = self.mixer.clipAction(animation);
				if (animation.name == "Jump") {
					action.clampWhenFinished = true;
        			action.loop = THREE.LoopOnce;
				}
				self.animations.set(animation.name, action);
			});
			this.activeAction = this.animations.get("Idle");
			this.activeAction.play();

			/*
			document.addEventListener('keydown', (event) => {
				if (event.keyCode == 32) {
					self.fadeToActionAnim("Jump", 0.2);
					function restore() {
						self.mixer.removeEventListener("finished", restore);
						self.fadeToActionAnim("Idle", 0.2);
					}
					self.mixer.addEventListener("finished", restore);
				} else if (event.keyCode == 87) {
					if (this.activeAction !== this.animations.get("Walk")) {
						self.fadeToActionAnim("Walk", 0.2);
					}
				}
			}, false);
			document.addEventListener('keyup', (event) => {
				if (event.keyCode == 87) {
					if (this.activeAction !== this.animations.get("Idle")) {
						self.fadeToActionAnim("Idle", 0.2);
					}
				}
			}, false);*/

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
	fadeToActionAnim(name, duration) {
		var previousAction = this.activeAction;
		this.activeAction = this.animations.get(name);
		this.currentActionName = name;

		if (previousAction !== this.activeAction) {
			previousAction.fadeOut(duration);
		}

		this.activeAction
			.reset()
			.setEffectiveTimeScale(1)
			.setEffectiveWeight(1)
			.fadeIn(duration)
			.play();
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
		if (this.position.x != x || this.position.y != y || this.position.z != z) {
			if (this.currentActionName != "Walk") {
				this.fadeToActionAnim("Walk", 0.2);
			}
		} else {
			if (this.currentActionName != "Idle") {
				this.fadeToActionAnim("Idle", 0.2);
			}
		}
		this.position.set(x, y, z);
		this.rot_x = rot_x;
		this.rot_y = rot_y;
		this.model.quaternion.setFromEuler(new THREE.Euler(0, this.rot_y, 0, 'YXZ'));
	}
	updatePlayerName() {
		if (this.world.clientSocketID == this.socketID) throw "function can't be used by client player";
		this.usernameMesh.position.set(this.position.x, this.position.y + Constants.MAP_BLOCK_LENGTH / 2, this.position.z);
		this.usernameMesh.lookAt(this.world.camera.position);
	}
}

module.exports = NetPlayer;
