class MapBlock {
	constructor(l, r, t, b, x, y, alt, scene){
		this.left = l;
		this.right = r;
		this.top = t;
		this.bottom = b;
		this.centerX = x;
		this.centerY = alt;
		this.centerZ = y;

		this.scene = scene;
	}
	static get LENGTH() {return 1000;}
	create() {
		var geomTile = new THREE. BoxBufferGeometry(MapBlock.LENGTH,10,MapBlock.LENGTH);

		var boxMatF = new THREE.MeshPhongMaterial();
		var boxMatC = new THREE.MeshPhongMaterial();
		var boxMatW = new THREE.MeshPhongMaterial({color: 0x444444});

		var meshF = new THREE.Mesh(geomTile, boxMatF);
		meshF.material.color.setHex(0x650000);

		meshF.receiveShadow = true; //default
//                meshC.material.color.setHex(0x555555);
		meshF.position.set(this.centerX, this.centerY, this.centerZ);
//                meshC.position.set(this.centerX, this.centerY+graphics.mapBlock.LENGTH, this.centerZ);

		if (this.left) {
			var meshL = new THREE.Mesh(geomTile, boxMatW);
			meshL.castShadow = true;
			meshL.receiveShadow = true;
			meshL.position.set(this.centerX - MapBlock.LENGTH/2,this.centerY+MapBlock.LENGTH/2, this.centerZ);
			meshL.rotation.z = 90*Math.PI/180;
			this.scene.add(meshL);
		}
		if (this.right) {
			var meshR = new THREE.Mesh(geomTile, boxMatW);
			meshR.castShadow = true;
			meshR.receiveShadow = true;
			meshR.position.set(this.centerX + MapBlock.LENGTH/2,this.centerY+MapBlock.LENGTH/2, this.centerZ);
			meshR.rotation.z = 90*Math.PI/180;
			this.scene.add(meshR);
		}
		if (this.top) {
			var meshT = new THREE.Mesh(geomTile, boxMatW);
			meshT.castShadow = true;
			meshT.receiveShadow = true;
			meshT.position.set(this.centerX,this.centerY+MapBlock.LENGTH/2, this.centerZ-MapBlock.LENGTH/2);
			meshT.rotation.x = 90*Math.PI/180;
			this.scene.add(meshT);
		}
		if (this.bottom) {
			var meshB = new THREE.Mesh(geomTile, boxMatW);
			meshB.castShadow = true;
			meshB.receiveShadow = true;
			meshB.position.set(this.centerX,this.centerY+MapBlock.LENGTH/2, this.centerZ+MapBlock.LENGTH/2);
			meshB.rotation.x = 90*Math.PI/180;
			this.scene.add(meshB);
		}
		this.scene.add(meshF);
	}
}

module.exports = MapBlock;
