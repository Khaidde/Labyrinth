var Constants = require("../common/Constants");
var Assets = require("../../Assets");

class Entity {
	constructor(x, y, z, world) {
		this.position = new THREE.Vector3(x, y, z);
		this.rotation = new THREE.Euler(0, 0, 0, "YXZ");
		this.world = world;

		this.positionBuffer = [];
	}
	withRotation(rot_x, rot_y, rot_z) {
		this.rotation.set(rot_x, rot_y, rot_z);
		return this;
	}
	withModel(assetName) {
		this.modelInfo = Assets.get(assetName).createClone();
		this.model = this.modelInfo.mesh;
		this.mixer = this.modelInfo.mixer;
		this.animations = this.modelInfo.animations;
		this.model.position.set(this.position.x, this.position.y, this.position.z);
		this.world.scene.add(this.model);
		this.modelOffset = new THREE.Vector3();
		return this;
	}
	withModelOffset(offset) {
		this.modelOffset = offset;
		return this;
	}
	withBoundingBox(boundingGeometry, posOffset = new THREE.Vector3(0, 0, 0)) {
		this.boundingGeometry = boundingGeometry;
		this.boundingPosOffset = posOffset;

		if (Constants.DEBUG_SHOW_ENTITY_BOUNDING_BOXES) {
			var wireMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe:true } );
			this.boundingBoxDebugMesh = new THREE.Mesh( this.boundingGeometry, wireMaterial );
			this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
			this.world.scene.add( this.boundingBoxDebugMesh );
		}
		return this;
	}
	dispose() {
		if (this.model != undefined) this.world.scene.remove(this.model);
		if (this.boundingBoxDebugMesh != undefined) this.world.scene.remove(this.boundingBoxDebugMesh);
	}
	insertPositionWithTime(timestamp, state) {
		this.positionBuffer.push({
			time: timestamp,
			state: state
		})
	}
	update(delta) {
		if (this.model != undefined) {
			this.model.position.addVectors(this.position, this.modelOffset);
			this.model.rotation.copy(this.rotation);
		}
	}
	updateBoundingBox() {
		if (this.boundingBoxDebugMesh != undefined) this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
	}
}

module.exports = Entity;
