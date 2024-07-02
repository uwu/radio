package network.uwu.radio.ui.screen.home

import android.app.Application
import android.content.ComponentName
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import network.uwu.radio.service.AudioPlaybackService
import network.uwu.radio.util.TimeRepresentable

class HomeViewModel(application: Application) : AndroidViewModel(application) {

	private val sessionToken = SessionToken(
		application,
		ComponentName(application, AudioPlaybackService::class.java)
	)
	private val mediaControllerFuture =
		MediaController.Builder(application, sessionToken).buildAsync()

	private val _state = MutableStateFlow<HomeScreenState>(HomeScreenState.Loading)
	val state = _state.asStateFlow()

	private val _progress = MutableStateFlow(HomeScreenProgress.Zero)
	val progress = _progress.asStateFlow()

	override fun onCleared() {
		super.onCleared()
		MediaController.releaseFuture(mediaControllerFuture)
	}

	init {
		mediaControllerFuture.addListener({
			val mediaController = mediaControllerFuture.get()
			mediaController.addListener(object : Player.Listener {
				override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
					if (mediaItem != null) {
						_state.value = HomeScreenState.Success(
							songArtworkUrl = mediaItem.mediaMetadata.artworkUri?.toString(),
							songName = mediaItem.mediaMetadata.title.toString(),
							songArtist = mediaItem.mediaMetadata.artist.toString(),
							submitter = mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_NAME")!!,
							quote = mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_QUOTE"),
						)
					}
				}
			})

			viewModelScope.launch {
				while (true) {
					_progress.value = HomeScreenProgress(
						currentTime = TimeRepresentable(mediaController.currentPosition),
						totalTime = TimeRepresentable(mediaController.duration),
						progress = mediaController.currentPosition.toFloat() / mediaController.duration.toFloat()
					)
					delay(1000L)
				}
			}
		}, MoreExecutors.directExecutor())
	}
}
