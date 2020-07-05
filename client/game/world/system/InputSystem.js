var Utils = require("../../common/Utils");
var ComponentT = require("../../common/ecs/ComponentT");

var ECS = require("../../common/ecs/ECS");

class InputSystem extends ECS.System {
	constructor() {
		super();
		document.addEventListener("mousedown", Utils.bind(this, this.onMouseDown), false);
		document.addEventListener("mousemove", Utils.bind(this, this.onMouseMove), false);
		document.addEventListener("mouseup", Utils.bind(this, this.onMouseUp), false);
		document.addEventListener("keydown", Utils.bind(this, this.onKeyDown), false);
		document.addEventListener("keyup", Utils.bind(this, this.onKeyUp), false);
	}
	onMouseDown(event) {
		if (!this.input.enabled) return;
		switch(event.button) {
			case 0:
				this.input.leftMouseClick = true;
				break;
			case 2:
				this.input.rightMouseClick = true;
				break;
		}
	}
	onMouseMove(event) {
		if (!this.input.enabled) return;
		event = event || window.event;
		this.input.accumulatedMouseX += event.movementX;
		this.input.accumulatedMouseY += event.movementY;
		/*
		this.input.mouseX = event.pageX;
		this.input.mouseY = event.pageY;
		if (this.input.lastTickMouseX === -1 || this.input.lastTickMouseY === -1) {
			this.input.lastTickMouseX = event.pageX;
			this.input.lastTickMouseY = event.pageY;
		}*/
	}
	onMouseUp(event) {
		if (!this.input.enabled) return;
		switch(event.button) {
			case 0:
				this.input.leftMouseClick = false;
				break;
			case 2:
				this.input.rightMouseClick = false;
				break;
		}
	}
	onKeyDown(event) {
		if (!this.input.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.input.moveForward = true; break;
			case 65: /*A*/ this.input.moveLeft = true; break;
			case 83: /*S*/ this.input.moveBackward = true; break;
			case 68: /*D*/ this.input.moveRight = true; break;

			case 82: /*R*/ this.input.moveUp = true; break;
			case 70: /*F*/ this.input.moveDown = true; break;

			case 16: /*Shift*/ this.input.sprint = true; break;
			case 32: /*Space*/ this.input.jump = true; break;
		}
	}
	onKeyUp(event) {
		if (!this.input.enabled) return;
		switch(event.keyCode) {
			case 87: /*W*/ this.input.moveForward = false; break;
			case 65: /*A*/ this.input.moveLeft = false; break;
			case 83: /*S*/ this.input.moveBackward = false; break;
			case 68: /*D*/ this.input.moveRight = false; break;

			case 82: /*R*/ this.input.moveUp = false; break;
			case 70: /*F*/ this.input.moveDown = false; break;

			case 16: /*Shift*/ this.input.sprint = false; break;
			case 32: /*Space*/ this.input.jump = false; break;
		}
	}
	test(entity) {
		return entity.contains(ComponentT.INPUT);
	}
	enter(entity) {
		this.input = entity.get(ComponentT.INPUT);
	}
	update(entity) {
		this.input.mouseMovementX = this.input.accumulatedMouseX;
		this.input.mouseMovementY = this.input.accumulatedMouseY;

		this.input.accumulatedMouseX = 0;
		this.input.accumulatedMouseY = 0;
	}
	exit(entity) {
		entity.get(ComponentT.INPUT).enabled = false;
	}
}

module.exports = InputSystem;
