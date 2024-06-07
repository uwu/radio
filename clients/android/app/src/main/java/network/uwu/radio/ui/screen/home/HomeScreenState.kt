package network.uwu.radio.ui.screen.home

import network.uwu.radio.util.TimeRepresentable

sealed interface HomeScreenState {

	data object Loading : HomeScreenState

	data class Success(
		val songArtworkUrl: String?,
		val songName: String,
		val songArtist: String,
		val submitter: String,
		val quote: String?,
	) : HomeScreenState

}

data class HomeScreenProgress(
	val currentTime: TimeRepresentable,
	val totalTime: TimeRepresentable,
	val progress: Float
) {
	companion object {
		val Zero = HomeScreenProgress(
			currentTime = TimeRepresentable(0),
			totalTime = TimeRepresentable(0),
			progress = 0f
		)
	}
}
