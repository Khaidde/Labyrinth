var Entity = require("./Entity");
var BufferMapBlock = require("./BufferMapBlock");

var Constants = require("../common/Constants");
var EntityType = require("../common/EntityType");
var Assets = require("../../Assets");

class NetPlayer extends Entity {
	constructor(id, world, socketID, name) {
		super(id, EntityType.PLAYER, world);
		this.name = name;
		this.socketID = socketID;
		this.isClientPlayer = (this.world.clientSocketID == this.socketID);

		//TODO assign these to unqiue item entities
		this.leftHandItem = undefined;
		this.rightHandItem = undefined;

		this.withModel("Player");
		this.withModelOffset(new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET - 1.8, 0));
		this.modelInfo.spliceBones("Idle", ["Head", "Neck", "ElbowL", "ElbowR", "HandL", "HandR"]);
		this.modelInfo.spliceBones("Walk", ["ElbowL", "ElbowR", "HandL", "HandR"]);
		this.modelInfo.compileClips();
		this.model.traverse(o => {
			if (o.isBone) {
				switch (o.name) {
				case "Head":
					this.head = o;
					break;
				case "ShoulderL":
					this.shoulderL = o;
					break;
				case "ShoulderR":
					this.shoulderR = o;
					break;
				case "HandL":
					this.handL = o;
					break;
				case "HandR":
					this.handR = o;
					break;
				case "ElbowL":
					this.elbowL = o;
					break;
				case "ElbowR":
					this.elbowR = o;
					break;
				}
			}
			if (o.isMesh && this.isClientPlayer) {
				var invisibleMaterial = o.material.clone();
				invisibleMaterial.visible = false;
				o.material = invisibleMaterial;
			}
		});

		this.activeAction = this.animations.get("Idle");
		this.activeAction.play();

		this.pistolModelL = Assets.get("Pistol").createClone().mesh;
		this.pistolModelL.position.set(0, 1.2, 0);
		this.handL.add(this.pistolModelL);

		this.pistolModelR = Assets.get("Pistol").createClone().mesh;
		this.pistolModelR.position.set(0, 1.2, 0);
		this.handR.add(this.pistolModelR);

		this.handItemRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
		this.pistolModelL.quaternion.multiply(this.handItemRotation);
		this.pistolModelR.quaternion.multiply(this.handItemRotation);

		//Init collision box
		this.withBoundingBox(new THREE.BoxGeometry(2, 2, 2), new THREE.Vector3(0, 0, -0.2));

		if (!this.isClientPlayer) {
			/*
			document.addEventListener('keydown', (event) => {
				if (event.keyCode == 32) {
					self.fadeToActionAnim("Jump", 0.2);
					function restore() {
						self.mixer.removeEventListener("finished", restore);
						self.fadeToActionAnim("Idle", 0.2);
					}
					self.mixer.addEventListener("finished", restore);
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
		}
	}
	withController(controller) {
		this.controller = controller
	}
	dispose() {
		super.dispose();
		if (!this.isClientPlayer) {
			this.world.scene.remove(this.usernameMesh);
		}
	}
	update(delta) {
		super.update(delta);

		if (!this.isClientPlayer) {
			this.usernameMesh.position.addVectors(this.position, new THREE.Vector3(0, Constants.PLAYER_HEIGHT_OFFSET * 5/3, 0));
			this.usernameMesh.lookAt(this.world.camera.position);
		}
		if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) this.updateBoundingBox();

		this.mixer.update(delta * 0.001);

		//Hold out left-hand item
		this.elbowL.rotation.x = 0;
		this.elbowL.rotation.y = 0;
		this.elbowL.rotation.z = Math.PI / 8;
		this.shoulderL.rotation.x = Math.PI;
		this.shoulderL.rotation.y = 0;
		this.shoulderL.rotation.z = this.targetingRotX + Math.PI * 1/3;

		//Hold out right-hand item
		this.elbowR.rotation.x = 0;
		this.elbowR.rotation.y = 0;
		this.elbowR.rotation.z = Math.PI / 8;
		this.shoulderR.rotation.x = Math.PI;
		this.shoulderR.rotation.y = 0;
		this.shoulderR.rotation.z = this.targetingRotX + Math.PI * 1/3;

		this.head.rotation.x = 0;
		this.head.rotation.y = 0;
		this.head.rotation.z = -this.targetingRotX;
	}
	updatePlayerPose(x, y, z, rot_x, rot_y) {
		this.predictAnimation(x, y, z, rot_y);
		this.position.set(x, y, z);
		this.targetingRotX = rot_x;
		this.targetingRotY = rot_y;
		this.rotation.set(0, rot_y, 0)
	}
	setActionAnim(name, duration, timeScale=1) {
		if (this.currentActionName == name) {
			if (this.activeAction.getEffectiveTimeScale() != timeScale) {
				this.activeAction.setEffectiveTimeScale(timeScale);
			}
			return;
		}
		var previousAction = this.activeAction;
		this.activeAction = this.animations.get(name);
		this.currentActionName = name;

		this.activeAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(timeScale).play();
		this.activeAction.stopFading();
		previousAction.crossFadeTo(this.activeAction, duration);
	}
	predictAnimation(x, y, z, rot_y) {
		if (this.position.x != x || this.position.z != z) {
			var timeScale = 1;
			if (this.position.x > x) timeScale = -1;
			this.setActionAnim("Walk", 0.2, timeScale);
		} else {
			this.setActionAnim("Idle", 0.2);
		}
	}
}

module.exports = NetPlayer;
