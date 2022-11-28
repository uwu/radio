package network.uwu.radio

import android.content.ComponentName
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import com.google.common.util.concurrent.ListenableFuture
import com.google.common.util.concurrent.MoreExecutors
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import network.uwu.radio.domain.model.DomainSongData
import network.uwu.radio.domain.repository.MainRepository
import network.uwu.radio.network.service.ClientState
import network.uwu.radio.service.AudioPlaybackService
import network.uwu.radio.ui.screen.HomeScreen
import network.uwu.radio.ui.theme.UwuRadioTheme
import network.uwu.radio.ui.viewmodel.HomeViewModel
import org.koin.android.ext.android.inject
import org.koin.androidx.viewmodel.ext.android.viewModel
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class MainActivity : ComponentActivity() {

    private val mainRepository: MainRepository by inject()
    private val homeViewModel: HomeViewModel by viewModel()

    private lateinit var sessionToken: SessionToken
    private lateinit var mediaControllerFuture: ListenableFuture<MediaController>

    override fun onStart() {
        super.onStart()
        sessionToken = SessionToken(this, ComponentName(this, AudioPlaybackService::class.java))
        mediaControllerFuture = MediaController.Builder(this, sessionToken).buildAsync()
        lifecycleScope.launchWhenStarted {
            val mediaController = suspendCoroutine {
                mediaControllerFuture.addListener({
                    it.resume(mediaControllerFuture.get())
                }, MoreExecutors.directExecutor())
            }

            mediaController.addListener(object : Player.Listener {
                override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
                    if (mediaItem != null) {
                        homeViewModel.updateName(mediaItem.mediaMetadata.title.toString())
                        homeViewModel.updateArtworkUrl(mediaItem.mediaMetadata.artworkUri!!.toString())
                        homeViewModel.updateArtist(mediaItem.mediaMetadata.artist.toString())
                        homeViewModel.updateQuote(mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_QUOTE"))
                        homeViewModel.updateSubmitter(mediaItem.mediaMetadata.extras!!.getString("SUBMITTER_NAME")!!)
                    }
                }

                override fun onPlaybackStateChanged(playbackState: Int) {
                    when (playbackState) {
                        Player.STATE_READY -> {
                            homeViewModel.updateTotalTime(mediaController.duration)
                            homeViewModel.updateLoading(false)
                        }
                        else -> {
                            homeViewModel.updateLoading(true)
                        }
                    }
                }
            })

            mainRepository.observeSongData()
                .onEach {
                    mediaController.addMediaItem(it.first.toMediaItem())
                    mediaController.seekTo(
                        0,
                        (((System.currentTimeMillis() / 1000) - it.first.startTime) * 1000)
                    )
                    mediaController.prepare()
                    mediaController.play()

                    mediaController.addMediaItem(it.second.toMediaItem())
                }
                .launchIn(this)

            mainRepository.observeNextSong()
                .onEach {
                    if (!mediaController.hasNextMediaItem()) {
                        mediaController.addMediaItem(it.toMediaItem())
                    }
                }
                .launchIn(this)

            observeProgress(mediaController)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launchWhenResumed {
            mainRepository.connectSyncClient()
            mainRepository.observeSyncClientState()
                .onEach {
                    if (it is ClientState.Connected) {
                        mainRepository.requestData()
                    }
                }
                .launchIn(this)
        }

        setContent {
            UwuRadioTheme {
                val backgroundColor = UwuRadioTheme.colorScheme.background
                Box(modifier = Modifier.background(backgroundColor)) {
                    val systemUiController = rememberSystemUiController()
                    SideEffect {
                        systemUiController.setSystemBarsColor(
                            color = backgroundColor,
                            darkIcons = false
                        )
                    }
                    HomeScreen()
                }
            }
        }
    }

    override fun onStop() {
        super.onStop()
        MediaController.releaseFuture(mediaControllerFuture)
    }

    private tailrec suspend fun observeProgress(controller: MediaController) {
        if (controller.isPlaying) {
            homeViewModel.updateCurrentTime(controller.currentPosition)
        }
        delay(1000L)
        observeProgress(controller)
    }

    private fun DomainSongData.toMediaItem(): MediaItem {
        return MediaItem.Builder()
            .setRequestMetadata(
                MediaItem.RequestMetadata.Builder()
                    .setMediaUri(Uri.parse(songUrl))
                    .setExtras(Bundle().apply {
                        putLong("START_TIME", startTime)
                    })
                    .build()
            )
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setArtist(songArtist)
                    .setArtworkUri(songArtworkUrl?.let { Uri.parse(it) } ?: Uri.EMPTY)
                    .setTitle(songName)
                    .setExtras(Bundle().apply {
                        putString("SUBMITTER_NAME", submitterName)
                        putString("SUBMITTER_QUOTE", submitterQuote ?: "")
                    })
                    .build()
            )
            .build()
    }
}
