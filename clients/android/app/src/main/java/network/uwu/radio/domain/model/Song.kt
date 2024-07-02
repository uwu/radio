package network.uwu.radio.domain.model

data class DomainSongData(
	val songName: String,
	val songArtist: String,
	val songUrl: String,
	val songArtworkUrl: String?,
	val submitterName: String,
	val submitterQuote: String?,
	val startTime: Long
)
