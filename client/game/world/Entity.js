var Constants = require("../common/Constants");

class Entity {
	constructor(x, y, z, world) {
		this.position = new THREE.Vector3(x, y, z);
		this.world = world;

		this.positionBuffer = [];
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
	}
	dispose() {
		if (this.boundingBoxDebugMesh != undefined) this.world.scene.remove(this.boundingBoxDebugMesh);
	}
	insertPositionWithTime(timestamp, state) {
		this.positionBuffer.push({
			time: timestamp,
			state: state
		})
	}
	update(delta) {}
	updateBoundingBox() {
		if (this.boundingBoxDebugMesh != undefined) {
			this.boundingBoxDebugMesh.position.set(this.position.x + this.boundingPosOffset.x, this.position.y + this.boundingPosOffset.y, this.position.z + this.boundingPosOffset.z);
		}
	}
}

module.exports = Entity;
