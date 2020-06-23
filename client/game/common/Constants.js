var Constants = {
	FPS: 60,
	SERVER_SEND_RATE: 10,
	MAP_BLOCK_LENGTH: 5,

	SOCKET_PLAYER_LOGIN: "socket_player_login",
	SOCKET_PLAYER_LEAVE_ROOM: "socket_player_leave",

	INITIALIZE_MAP: "init_map",
	WORLD_STATE_UPDATE: "state_update",
	CLIENT_POSE_CHANGE: "client_pose_change",

	//TODO delete these
	ADD_PLAYER: "new_player",
	REMOVE_PLAYER: "remove_player",
	CLIENT_TO_SERVER_UPDATE_PLAYER_POSITION: "client_update_player_pos",
	SERVER_TO_CLIENT_UPDATE_PLAYER_POSITION: "server_update_player_pos"
}

module.exports = Constants;
