var Constants = {
	FPS: 60,
	SERVER_SEND_RATE: 20,

	//World measurement constants
	MAP_BLOCK_LENGTH: 5,
	PLAYER_HEIGHT_OFFSET: 1.8,
	GRAVITY: 0.001,

	//Debug flags
	DEBUG_SHOW_ENTITY_BOUNDING_BOXES: true,
	DEBUG_DO_ENTITY_INTERPOLATION: true,

	//Networking events
	NET_SOCKET_PLAYER_LOGIN: "socket_player_login",
	NET_SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",
	NET_SERVER_TO_CLIENT_FORCE_DISCONNECT: "force_disconnect",
	NET_INIT_WORLD: "init_map",
	NET_WORLD_STATE_UPDATE: "state_update",
	NET_CLIENT_POSE_CHANGE: "client_pose_change",
}

module.exports = Constants;
