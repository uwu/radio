package network.uwu.radio.network

import com.microsoft.signalr.HubConnection
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import network.uwu.radio.network.dto.ApiNextBroadcast
import network.uwu.radio.network.dto.ApiReceiveState
import network.uwu.radio.network.dto.ApiSong
import kotlin.coroutines.resume

class UwuRadioSyncService(
	private val hubConnection: HubConnection
) {
	
	sealed interface ClientState {
		data object Disconnected : ClientState
		data object Connected : ClientState
	}

	private val _clientState = MutableStateFlow<ClientState>(ClientState.Disconnected)
	val clientState = _clientState.asStateFlow()

	suspend fun connect() {
		suspendCancellableCoroutine { continuation ->
			val disposable = hubConnection.start()
				.subscribe(
					{
						_clientState.value = ClientState.Connected
						continuation.resume(Unit)
					},
					{
						_clientState.value = ClientState.Disconnected
						continuation.cancel(it)
					}
				)
			continuation.invokeOnCancellation {
				_clientState.tryEmit(ClientState.Disconnected)
				hubConnection.close()
				disposable.dispose()
			}
		}
	}

	suspend fun requestState() {
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

	suspend fun requestSeekPosition() {
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

	fun observeNextBroadcast(): Flow<ApiNextBroadcast> {
		return callbackFlow {
			val subscription = hubConnection.on("BroadcastNext", { song, startTime ->
				trySend(ApiNextBroadcast(song, startTime))
			}, ApiSong::class.java, Long::class.java)

			awaitClose {
				subscription.unsubscribe()
			}
		}
	}

	fun observeReceiveState(): Flow<ApiReceiveState> {
		return callbackFlow {
			val subscription = hubConnection.on(
				"ReceiveState",
				{ currentSong, currentStartTime, nextSong, nextStartTime ->
					trySend(
						ApiReceiveState(
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

	fun observeSeekPosition(): Flow<Long> {
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
