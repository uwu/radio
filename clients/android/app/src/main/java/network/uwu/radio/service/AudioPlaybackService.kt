package network.uwu.radio.service

import android.net.Uri
import androidx.core.os.bundleOf
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.SessionCommands
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import network.uwu.radio.domain.SessionRepository
import network.uwu.radio.domain.model.DomainSongData
import org.koin.android.ext.android.inject

class AudioPlaybackService : MediaSessionService() {

	private val repository: SessionRepository by inject()

	private lateinit var mediaSession: MediaSession

	private val job = SupervisorJob()
	private val coroutineScope = CoroutineScope(Dispatchers.IO + job)

	override fun onCreate() {
		super.onCreate()
		val player = ExoPlayer.Builder(this).build()
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

	override fun onGetSession(controllerInfo: MediaSession.ControllerInfo) = mediaSession

	override fun onDestroy() {
		job.cancel()
		mediaSession.player.release()
		mediaSession.release()
		super.onDestroy()
	}

	private fun DomainSongData.toMediaItem(): MediaItem {
		val mediaMetadata = MediaMetadata.Builder()
			.setArtist(songArtist)
			.setArtworkUri(songArtworkUrl?.let { Uri.parse(it) })
			.setTitle(songName)
			.setExtras(
				bundleOf(
					"SUBMITTER_NAME" to submitterName,
					"SUBMITTER_QUOTE" to submitterQuote,
					"START_TIME" to startTime
				)
			)
			.build()

		return MediaItem.Builder()
			.setMediaMetadata(mediaMetadata)
			.setUri(Uri.parse(songUrl))
			.build()
	}

	@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
	inner class MediaSessionCallback : MediaSession.Callback {
		override fun onConnect(
			session: MediaSession,
			controller: MediaSession.ControllerInfo
		): MediaSession.ConnectionResult {
			val playerCommands = Player.Commands.Builder()
				.add(Player.COMMAND_GET_TIMELINE)
				.add(Player.COMMAND_GET_CURRENT_MEDIA_ITEM)
				.build()
			return MediaSession.ConnectionResult.accept(SessionCommands.EMPTY, playerCommands)
		}
	}
}
