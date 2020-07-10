const Constants = {
	//Performance
	FPS: 60,
	FPS_SMOOTHING_WEIGHT_RATIO: 0.9,
	SERVER_SEND_RATE: 20,

	//Animation
	IDLE_ANIM: "Idle",
	FORWARD_ANIM: "Forward",
	L_STRAFE_ANIM: "StrafeLeft",
	R_STRAFE_ANIM: "StrafeRight",
	JUMP_ANIM: "Jump",

	//Math
	ROTATION_ORDER: "YXZ",
	PI_TWO: Math.PI / 2,

	//Movement
	DIAGONAL_SPEED_ADJUSTMENT: 0.7021,
	SPRINT_ADJUSTMENT: 2.1,

	//World measurements
	MAP_BLOCK_LENGTH: 5,
	PLAYER_HEIGHT_OFFSET: 1.8,

	//Debug flags
	DEBUG_SHOW_ENTITY_BOUNDING_BOXES: true,
	DEBUG_DO_ENTITY_INTERPOLATION: true,

	//Miscellaneous
	PRESSED: 1,
	RELEASED: 0,
	TURN_SPEED_ADJUST_RATIO: 0.0005,
	NO_ANIMATION: "no_anim",

	//Networking events
	NET_SOCKET_PLAYER_LOGIN: "socket_player_login",
	NET_SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	NET_SERVER_TO_CLIENT_FORCE_DISCONNECT: "force_disconnect",
	NET_INIT_WORLD: "init_map",
	NET_WORLD_STATE_UPDATE: "state_update",
	NET_CLIENT_POSE_CHANGE: "client_pose_change",
}

module.exports = Constants;
