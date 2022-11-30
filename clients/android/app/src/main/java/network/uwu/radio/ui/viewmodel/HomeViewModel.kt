package network.uwu.radio.ui.viewmodel

import android.app.Application
import android.content.ComponentName
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import network.uwu.radio.service.AudioPlaybackService

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val sessionToken = SessionToken(
        application,
        ComponentName(application, AudioPlaybackService::class.java)
    )
    private val mediaControllerFuture = MediaController.Builder(application, sessionToken).buildAsync()

    private var _totalTime: Long = 0
    private var _currentTime: Long = 0

    var artUrl by mutableStateOf<String?>(null)
        private set

    var name by mutableStateOf("")
        private set

    var artist by mutableStateOf("")
        private set

    var submitter by mutableStateOf("")
        private set

    var quote by mutableStateOf<String?>(null)
        private set

    var totalTime by mutableStateOf("")
        private set

    var currentTime by mutableStateOf("")
        private set

    var progress by mutableStateOf(0f)
        private set

    var loading by mutableStateOf(true)
        private set

    fun updateArtworkUrl(url: String) {
        artUrl = url
    }

    fun updateName(name: String) {
        this.name = name
    }

    fun updateArtist(artist: String) {
        this.artist = artist
    }

    fun updateSubmitter(submitter: String) {
        this.submitter = submitter
    }

    fun updateQuote(quote: String?) {
        this.quote = quote
    }

    fun updateTotalTime(millis: Long) {
        val seconds = millis / 1000
        _totalTime = millis
        totalTime = String.format("%01d:%02d", seconds / 60, seconds % 60)
    }

    fun updateCurrentTime(millis: Long) {
        val seconds = millis / 1000
        _currentTime = millis
        currentTime = String.format("%01d:%02d", seconds / 60, seconds % 60)
        progress = _currentTime.toFloat() / _totalTime.toFloat()
    }

    fun updateLoading(loading: Boolean) {
        this.loading = loading
    }

    override fun onCleared() {
        super.onCleared()
        MediaController.releaseFuture(mediaControllerFuture)
    }

    init {
        mediaControllerFuture.addListener({
            val mediaController = mediaControllerFuture.get()
            mediaController.addListener(PlayerListener(mediaController))

            updateUi(mediaController.currentMediaItem)
            updateState(mediaController.playbackState, mediaController.duration)

            viewModelScope.launch {
                observeProgress(mediaController)
            }
        }, MoreExecutors.directExecutor())
    }

    private tailrec suspend fun observeProgress(controller: MediaController) {
        if (controller.isPlaying) {
            updateCurrentTime(controller.currentPosition)
        }
        delay(1000L)
        observeProgress(controller)
    }

    private fun updateUi(mediaItem: MediaItem?) {
        if (mediaItem != null) {
            updateName(mediaItem.mediaMetadata.title.toString())
            updateArtworkUrl(mediaItem.mediaMetadata.artworkUri!!.toString())
            updateArtist(mediaItem.mediaMetadata.artist.toString())
            updateQuote(mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_QUOTE"))
            updateSubmitter(mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_NAME")!!)
        }
    }

    fun updateState(playbackState: Int, totalDuration: Long) {
        when (playbackState) {
            Player.STATE_READY -> {
                updateTotalTime(totalDuration)
                updateLoading(false)
            }
            else -> {
                updateLoading(true)
            }
        }
    }

    inner class PlayerListener(
        private val mediaController: MediaController
    ) : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            updateUi(mediaItem)
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            updateState(playbackState, mediaController.duration)
        }
    }
}
