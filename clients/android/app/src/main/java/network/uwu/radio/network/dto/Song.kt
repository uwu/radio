package network.uwu.radio.network.dto

data class ApiSong(
    val name: String,
    val artist: String,
    val dlUrl: String?,
    val sourceUrl: String?,
    val artUrl: String?,
    val album: String?,
    val submitter: String,
)
