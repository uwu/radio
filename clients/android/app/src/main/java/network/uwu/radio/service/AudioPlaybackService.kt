package network.uwu.radio.service

import android.net.Uri
import android.os.Bundle
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import network.uwu.radio.domain.model.DomainSongData
import network.uwu.radio.domain.repository.SessionRepository
import org.koin.android.ext.android.inject

class AudioPlaybackService : MediaSessionService() {

    private val repository: SessionRepository by inject()

    private lateinit var player: Player
    private lateinit var mediaSession: MediaSession

    private val job = SupervisorJob()
    private val coroutineScope = CoroutineScope(Dispatchers.IO + job)

    override fun onCreate() {
        super.onCreate()
        player = ExoPlayer.Builder(this).build()
        mediaSession = MediaSession
            .Builder(this, player)
            .setCallback(MediaSessionCallback())
            .build()

        coroutineScope.launch {
            repository.observeSongData()
                .onEach {
                    withContext(Dispatchers.Main) {
                        player.addMediaItem(it.first.toMediaItem())
                        player.seekTo(
                            0,
                            (((System.currentTimeMillis() / 1000) - it.first.startTime) * 1000)
                        )
                        player.prepare()
                        player.play()
                        player.addMediaItem(it.second.toMediaItem())
                    }
                }
                .launchIn(this)

            repository.observeNextSong()
                .onEach {
                    withContext(Dispatchers.Main) {
                        if (!player.hasNextMediaItem()) {
                            player.addMediaItem(it.toMediaItem())
                        }
                    }
                }
                .launchIn(this)

            repository.connectSyncClient()
            repository.requestData()
        }
    }

    override fun onGetSession(
        controllerInfo: MediaSession.ControllerInfo
    ): MediaSession = mediaSession

    override fun onDestroy() {
        job.cancel()
        player.release()
        mediaSession.release()
        super.onDestroy()
    }

    private fun DomainSongData.toMediaItem(): MediaItem {
        return MediaItem.Builder()
            .setMediaMetadata(
                MediaMetadata.Builder()
                    .setArtist(songArtist)
                    .setArtworkUri(songArtworkUrl?.let { Uri.parse(it) })
                    .setTitle(songName)
                    .setExtras(Bundle().apply {
                        putString("SUBMITTER_NAME", submitterName)
                        putString("SUBMITTER_QUOTE", submitterQuote)
                        putLong("START_TIME", startTime)
                    })
                    .build()
            )
            .setUri(Uri.parse(songUrl))
            .build()
    }

    //TODO adjust the button layout somehow
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    inner class MediaSessionCallback : MediaSession.Callback {
        override fun onConnect(
            session: MediaSession,
            controller: MediaSession.ControllerInfo
        ): MediaSession.ConnectionResult {
            return MediaSession.ConnectionResult.accept(
                SessionCommands.EMPTY,
                Player.Commands.Builder()
                    .add(Player.COMMAND_GET_TIMELINE)
                    .build()
            )
        }
    }
}
