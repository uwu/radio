package network.uwu.radio.domain

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import network.uwu.radio.domain.model.DomainSongData
import network.uwu.radio.network.UwuRadioApiService
import network.uwu.radio.network.UwuRadioSyncService
import network.uwu.radio.network.dto.ApiSong

class SessionRepository(
	private val uwuRadioSyncService: UwuRadioSyncService,
	private val uwuRadioApiService: UwuRadioApiService
) {

	suspend fun connectSyncClient() {
		uwuRadioSyncService.connect()
	}

	suspend fun requestData() {
		uwuRadioSyncService.requestState()
	}

	fun observeSongData(): Flow<Pair<DomainSongData, DomainSongData>> {
		return uwuRadioSyncService.observeReceiveState()
			.map {
				it.currentSong.toDomain(
					startTime = it.currentStarted
				) to it.nextSong.toDomain()
			}
	}

	fun observeNextSong(): Flow<DomainSongData> {
		return uwuRadioSyncService.observeNextBroadcast()
			.map {
				it.song.toDomain()
			}
	}

	suspend fun getRandomQuote(submitter: String): String? {
		return uwuRadioApiService.getSubmitters()
			.find { it.name == submitter }
			?.quotes
			?.randomOrNull()
	}

	private suspend fun ApiSong.toDomain(startTime: Long = 0L): DomainSongData {
		return DomainSongData(
			songName = name,
			songArtist = artist,
			songArtworkUrl = artUrl,
			songUrl = dlUrl!!,
			submitterName = submitter,
			submitterQuote = getRandomQuote(submitter),
			startTime = startTime
		)
	}
}
