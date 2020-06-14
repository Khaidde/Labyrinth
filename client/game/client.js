var screenW;
var screenH;

var Constants = require("./Constants");

var World = require("./world/World");

const socket = io();
socket.on("test", function(username, room) {
	console.log(username); //TODO remove
	console.log(room); //TODO remove
});

const main = {
	init: function() {
		this.world = new World();
		main.initMenu();
	},
	initMenu: function() {
		this.menuOpacity = 1;
		var blocker = document.getElementById("blocker");
		var login = document.getElementById("login");

		var roomIDInput = document.getElementById("roomIDInput")
		var usernameInput = document.getElementById("usernameInput");
		var btn = document.getElementById("playBtn");

		//https://stackoverflow.com/questions/469357/html-text-input-allow-only-numeric-input
		function setInputFilter(textbox, inputFilter) {
			["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
			 	textbox.addEventListener(event, function() {
			   	if (inputFilter(this.value)) {
			   		this.oldValue = this.value;
			     		this.oldSelectionStart = this.selectionStart;
			     		this.oldSelectionEnd = this.selectionEnd;
			   	} else if (this.hasOwnProperty("oldValue")) {
			     		this.value = this.oldValue;
			     		this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
			   	} else {
			     		this.value = "";
			   	}
			 	});
			});
		}
		setInputFilter(roomIDInput, function(value) {return /^\d*\.?\d*$/.test(value);});

		btn.addEventListener("click", function() {
			if (usernameInput.value.length < 1) return;
			main.world.player.controller.lock();
			document.getElementById("blocker").style.opacity = 0;
			main.menuOpacity = 1;

			socket.emit(Constants.SOCKET_PLAYER_LOGIN, roomIDInput.value, usernameInput.value);
			roomIDInput.value = "";
			usernameInput.value = "";
		});

		this.world.player.controller.addPointUnlockListener(function() {
			main.menuOpacity = 0;
			console.log("?");
		});
	},
	update: function(delta) {
		this.updateSize();

		this.world.adjustWindowSize(screenW, screenH);
		this.world.update(delta);
	},
	render: function() {
		if (this.menuOpacity < 1) {
			this.menuOpacity += 0.01;
			document.getElementById("blocker").style.opacity = this.menuOpacity;
		}
		this.world.render();
	},
	updateSize: function() {
		screenW = window.innerWidth ||
	   	document.documentElement.clientWidth ||
	    	document.body.clientWidth;
	  	screenH = window.innerHeight ||
	    	document.documentElement.clientHeight ||
	    	document.body.clientHeight;
	}
}

window.onload =
	function Game() {
		document.body.style.marginTop = 0;
    	document.body.style.marginLeft = 0;
    	document.body.style.marginBottom = 0;
    	document.body.style.marginUp = 0;

		main.updateSize();
		main.init();

		var lastUpdateTime = (new Date()).getTime();
		setInterval(function() {
			var currentTime = (new Date()).getTime();
			var delta = currentTime - lastUpdateTime;
    		main.update(delta);
    		main.render();
			lastUpdateTime = currentTime;
  		}, 1000 / Constants.FPS);
  	}
