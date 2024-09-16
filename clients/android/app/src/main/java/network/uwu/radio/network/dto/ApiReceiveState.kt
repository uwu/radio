package network.uwu.radio.network.dto

data class ApiReceiveState(
	val currentSong: ApiSong,
	val currentStarted: Long,
	val nextSong: ApiSong,
	val nextStart: Long,
)
