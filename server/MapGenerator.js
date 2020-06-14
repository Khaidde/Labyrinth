class MapGenerator {
	constructor(width, height) {
		this.width = width;
		this.height = height;

		this.cellW = (width - 1) / 2;
		this.cellH = (width - 1) / 2;
	}
	static get WALL_HEIGHT() { return 10; }
	static get FLOOR_HEIGHT() { return 0; }
	generate() {
		if (this.width % 2 == 0 || this.height % 2 == 0) {
			throw "width and height of map must be odd";
		}
		this.map = [];
		for (var y = 0; y < this.height; y++) {
			for (var x = 0; x < this.width; x++) {
				this.setMap(x, y, MapGenerator.WALL_HEIGHT);
			}
		}
		var randX = Math.floor(Math.random() * this.cellW);
		var randY = Math.floor(Math.random() * this.cellH);
		this.iterateMazeGeneration(randX, randY, []);

		/*
		var rX;
		var rY;
		for (var i = 0; i < 10; i++) {
			rX = Math.floor(Math.random() * this.cellW);
			rY = Math.floor(Math.random() * this.cellH) + (rX + 1) % 2;
			this.setMap(rX * 2 + 1, rY * 2, MapGenerator.FLOOR_HEIGHT);
		}

		for (var yi = 0; yi < this.height; yi++) {
			for (var xi = 0; xi < this.width; xi++) {
				if (this.getMap(xi, yi) == MapGenerator.WALL_HEIGHT) {
					if (this.getMap(xi + 1, yi) == MapGenerator.FLOOR_HEIGHT) {
						if (this.getMap(xi - 1, yi) == MapGenerator.FLOOR_HEIGHT) {
							if (this.getMap(xi, yi + 1) == MapGenerator.FLOOR_HEIGHT) {
								if (this.getMap(xi, yi - 1) == MapGenerator.FLOOR_HEIGHT) {
									this.setMap(xi, yi, MapGenerator.FLOOR_HEIGHT);
								}
							}
						}
					}
				}
			}
		}

		this.createRoom(11, 11, 7, 7);
		*/

		return this.map;
	}
	iterateMazeGeneration(cellX, cellY, adjacentMap) {
		this.setMap(cellX * 2 + 1, cellY * 2 + 1, MapGenerator.FLOOR_HEIGHT);

		if (cellX - 1 >= 0 && !adjacentMap.includes(cellX - 1 + cellY * this.cellW)
			&& this.getMap((cellX - 1) * 2 + 1, cellY * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX - 1 + cellY * this.cellW);
		if (cellX + 1 < this.cellW && !adjacentMap.includes(cellX + 1 + cellY * this.cellW)
			&& this.getMap((cellX + 1) * 2 + 1, cellY * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + 1 + cellY * this.cellW);
		if (cellY - 1 >= 0 && !adjacentMap.includes(cellX + (cellY - 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY - 1) * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + (cellY - 1) * this.cellW);
		if (cellY + 1 < this.cellH && !adjacentMap.includes(cellX + (cellY + 1) * this.cellW)
			&& this.getMap(cellX * 2 + 1, (cellY + 1) * 2 + 1,) == MapGenerator.WALL_HEIGHT) adjacentMap.push(cellX + (cellY + 1) * this.cellW);

		if (adjacentMap.length == 0) return;

		var randNewMark = adjacentMap.splice(Math.floor(Math.random() * adjacentMap.length), 1)[0];
		var newMarkX = randNewMark % this.cellW;
		var newMarkY = Math.floor(randNewMark / this.cellW);

		var neighbors = this.findOpenNeighbors(newMarkX, newMarkY);
		var randNeighbor = neighbors.splice(Math.floor(Math.random() * neighbors.length), 1)[0];
		this.setMap(((randNeighbor % this.cellW) + newMarkX) + 1, ((Math.floor(randNeighbor / this.cellW)) + newMarkY) + 1, MapGenerator.FLOOR_HEIGHT);

		this.iterateMazeGeneration(newMarkX, newMarkY, adjacentMap);
	}
	findOpenNeighbors(cellX, cellY) {
		var neighbors = [];
		if (cellX - 1 >= 0
			&& this.map[((cellX - 1) * 2 + 1) + (cellY * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX - 1 + cellY * this.cellW);
		if (cellX + 1 < this.cellW
			&& this.map[((cellX + 1) * 2 + 1) + (cellY * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + 1 + cellY * this.cellW);
		if (cellY - 1 >= 0
			&& this.map[(cellX * 2 + 1) + ((cellY - 1) * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + (cellY - 1) * this.cellW);
		if (cellY + 1 < this.cellH
			&& this.map[(cellX * 2 + 1) + ((cellY + 1) * 2 + 1) * this.width] == MapGenerator.FLOOR_HEIGHT)
			neighbors.push(cellX + (cellY + 1) * this.cellW);
		return neighbors;
	}
	createRoom(x, y, roomWidth, roomHeight) {
		if (x < 0 || x + roomWidth >= this.width || y < 0 || y + roomHeight >= this.height) {
			throw "invalid room creation of position (" + x + "," + y + ") with width: " + roomWidth + ", height: " + roomHeight;
		}
		for (var yo = 0; yo < roomHeight; yo++) {
			for (var xo = 0; xo < roomWidth; xo++) {
				this.setMap(x + xo, y + yo, MapGenerator.FLOOR_HEIGHT);
			}
		}
	}
	setMap(x, y, value) {
		this.map[x + y * this.width] = value;
	}
	getMap(x, y) {
		return this.map[x + y * this.width];
	}
}

module.exports = MapGenerator;
