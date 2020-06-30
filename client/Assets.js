const Assets = {
	loadingPercent: 0,
	modelAssets: new Map(),
	init() {
		THREE.DefaultLoadingManager.onStart = function ( url, itemsLoaded, itemsTotal ) {
			console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
		};

		THREE.DefaultLoadingManager.onLoad = function ( ) {
			console.log( 'Loading Complete!');
		};

		THREE.DefaultLoadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
			console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
			Assets.loadingPercent = itemsLoaded / itemsTotal;
		};

		THREE.DefaultLoadingManager.onError = function ( url ) {
			console.log( 'There was an error loading ' + url );
		};
		Assets.loadFont();

		//Load models:
		Assets.loadModel("Player", "client/models/Player/Player.gltf");
	},
	loadFont() {
		var textLoad = new THREE.FontLoader();
   	textLoad.load("client/fonts/Aldo the Apache_Regular.json", function ( font ) {
			Assets.DEFAULT_FONT = font;
   	});
	},
	loadModel(name, path, callback) {
		var loader = new THREE.GLTFLoader();
		loader.load(path, (object) => {
			Assets.modelAssets.set(name, object);
			if (callback != undefined) callback(object);
    	});
	},
	getGLTFModel(name) {
		return Assets.modelAssets.get(name);
	},
	getModelClone(name) {
		return clone(Assets.modelAssets.get(name).scene.children[0]);
	}
}

function clone(source) { //Copied from Three.js SkeletonUtils
	var sourceLookup = new Map();
	var cloneLookup = new Map();

	var clone = source.clone();

	parallelTraverse( source, clone, function ( sourceNode, clonedNode ) {

		sourceLookup.set( clonedNode, sourceNode );
		cloneLookup.set( sourceNode, clonedNode );

	} );

	clone.traverse( function ( node ) {
		if ( ! node.isSkinnedMesh ) return;

		var clonedMesh = node;
		var sourceMesh = sourceLookup.get( node );
		var sourceBones = sourceMesh.skeleton.bones;

		clonedMesh.skeleton = sourceMesh.skeleton.clone();
		clonedMesh.bindMatrix.copy( sourceMesh.bindMatrix );
		clonedMesh.skeleton.bones = sourceBones.map( function ( bone ) {
			return cloneLookup.get( bone );
		} );
		clonedMesh.bind( clonedMesh.skeleton, clonedMesh.bindMatrix );
	} );
	return clone;
}

function parallelTraverse( a, b, callback ) {
	callback( a, b );
	for ( var i = 0; i < a.children.length; i ++ ) {
		parallelTraverse( a.children[ i ], b.children[ i ], callback );
	}
}

module.exports = Assets;
