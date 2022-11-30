package network.uwu.radio.domain.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import network.uwu.radio.domain.model.DomainSongData
import network.uwu.radio.network.dto.ApiSong
import network.uwu.radio.network.service.ClientState
import network.uwu.radio.network.service.UwuRadioApiService
import network.uwu.radio.network.service.UwuRadioSyncService

interface SessionRepository {

    suspend fun connectSyncClient()

    suspend fun requestData()

    suspend fun getRandomQuote(submitter: String): String?

    fun observeSyncClientState(): Flow<ClientState>

    fun observeProgressbar(): Flow<Long>
    fun observeSongData(): Flow<Pair<DomainSongData, DomainSongData>>
    fun observeNextSong(): Flow<DomainSongData>

}

class SessionRepositoryImpl(
    private val uwuRadioSyncService: UwuRadioSyncService,
    private val uwuRadioApiService: UwuRadioApiService
) : SessionRepository {

    override suspend fun connectSyncClient() {
        uwuRadioSyncService.connect()
    }

    override suspend fun requestData() {
        uwuRadioSyncService.requestState()
    }

    override fun observeSyncClientState(): Flow<ClientState> {
        return uwuRadioSyncService.observeClientState()
    }

    override fun observeProgressbar(): Flow<Long> {
        return uwuRadioSyncService.observeSeekPosition()
    }

    override fun observeSongData(): Flow<Pair<DomainSongData, DomainSongData>> {
        return uwuRadioSyncService.observeReceiveState()
            .map {
                it.currentSong.toDomain(
                    startTime = it.currentStarted
                ) to it.nextSong.toDomain()
            }
    }

    override fun observeNextSong(): Flow<DomainSongData> {
        return uwuRadioSyncService.observeNextBroadcast()
            .map {
                it.song.toDomain()
            }
    }

    override suspend fun getRandomQuote(submitter: String): String? {
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
