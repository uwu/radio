package network.uwu.radio.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import network.uwu.radio.network.dto.ApiSubmitter
import network.uwu.radio.network.dto.ApiSubmitters

class UwuRadioApiService(
	private val client: HttpClient
) {

	private val submitters = mutableListOf<ApiSubmitter>()

	suspend fun getSubmitters(): List<ApiSubmitter> {
		return withContext(Dispatchers.IO) {
			if (submitters.isEmpty()) {
				val apiSubmitters = client.get(getDataUrl()).body<ApiSubmitters>().submitters
				submitters.addAll(apiSubmitters)
			}
			submitters
		}
	}

	companion object {
		private const val BASE_URL = "https://radio.k6.tf/api"

		fun getDataUrl(): String {
			return "$BASE_URL/data"
		}
	}
}
