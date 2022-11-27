package network.uwu.radio.network.service

import com.microsoft.signalr.HubConnection
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import network.uwu.radio.network.dto.ApiSong
import kotlin.coroutines.resume

data class NextBroadcastData(
    val song: ApiSong,
    val startTime: Long
)

data class ReceiveStateData(
    val currentSong: ApiSong,
    val currentStarted: Long,
    val nextSong: ApiSong,
    val nextStart: Long,
)

sealed interface ClientState {
    object Disconnected : ClientState
    object Connected : ClientState
}

interface UwuRadioSyncService {

    suspend fun connect()
    suspend fun requestState()
    suspend fun requestSeekPosition()

    fun observeClientState(): Flow<ClientState>

    fun observeNextBroadcast(): Flow<NextBroadcastData>
    fun observeReceiveState(): Flow<ReceiveStateData>
    fun observeSeekPosition(): Flow<Long>

}

class UwuRadioSyncServiceImpl(
    private val hubConnection: HubConnection
) : UwuRadioSyncService {

    private val clientState = MutableSharedFlow<ClientState>(replay = 1)

    override suspend fun connect() {
        suspendCancellableCoroutine { continuation ->
            val disposable = hubConnection.start()
                .subscribe(
                    {
                        clientState.tryEmit(ClientState.Connected)
                        continuation.resume(Unit)
                    },
                    {
                        clientState.tryEmit(ClientState.Disconnected)
                        continuation.cancel(it)
                    }
                )
            continuation.invokeOnCancellation {
                clientState.tryEmit(ClientState.Disconnected)
                hubConnection.close()
                disposable.dispose()
            }
        }
    }

    override suspend fun requestState() {
        suspendCancellableCoroutine { continuation ->
            val disposable = hubConnection.invoke("RequestState")
                .subscribe(
                    {
                        continuation.resume(Unit)
                    },
                    {
                        continuation.cancel(it)
                    }
                )
            continuation.invokeOnCancellation {
                disposable.dispose()
            }
        }
    }

    override suspend fun requestSeekPosition() {
        suspendCancellableCoroutine { continuation ->
            val disposable = hubConnection.invoke("RequestSeekPos")
                .subscribe(
                    {
                        continuation.resume(Unit)
                    },
                    {
                        continuation.cancel(it)
                    }
                )
            continuation.invokeOnCancellation {
                disposable.dispose()
            }
        }
    }

    override fun observeClientState(): Flow<ClientState> {
        return clientState
    }

    override fun observeNextBroadcast(): Flow<NextBroadcastData> {
        return callbackFlow {
            val subscription = hubConnection.on("BroadcastNext", { song, startTime ->
                trySend(NextBroadcastData(song, startTime))
            }, ApiSong::class.java, Long::class.java)

            awaitClose {
                subscription.unsubscribe()
            }
        }
    }

    override fun observeReceiveState(): Flow<ReceiveStateData> {
        return callbackFlow {
            val subscription = hubConnection.on(
                "ReceiveState",
                { currentSong, currentStartTime, nextSong, nextStartTime ->
                    trySend(
                        ReceiveStateData(
                            currentSong,
                            currentStartTime,
                            nextSong,
                            nextStartTime
                        )
                    )
                },
                ApiSong::class.java, Long::class.java, ApiSong::class.java, Long::class.java
            )

            awaitClose {
                subscription.unsubscribe()
            }
        }
    }

    override fun observeSeekPosition(): Flow<Long> {
        return callbackFlow {
            val subscription = hubConnection.on("ReceiveSeekPos", { currentStarted ->
                trySend(currentStarted)
            }, Long::class.java)

            awaitClose {
                subscription.unsubscribe()
            }
        }
    }

}
