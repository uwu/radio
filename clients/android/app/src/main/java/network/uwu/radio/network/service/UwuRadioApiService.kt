package network.uwu.radio.network.service

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import network.uwu.radio.network.dto.ApiSubmitter
import network.uwu.radio.network.dto.ApiSubmitters

interface UwuRadioApiService {

    suspend fun getSubmitters(): List<ApiSubmitter>

}

class UwuRadioApiServiceImpl(
    private val client: HttpClient
) : UwuRadioApiService {

    private val submitters = mutableListOf<ApiSubmitter>()

    override suspend fun getSubmitters(): List<ApiSubmitter> {
        return withContext(Dispatchers.IO) {
            submitters.ifEmpty {
                val apiSubmitters = client.get(getDataUrl()).body<ApiSubmitters>().submitters
                submitters.addAll(apiSubmitters)
                apiSubmitters
            }
        }
    }

    companion object {
        private const val BASE_URL = "https://radio.alyxia.dev/api"

        fun getDataUrl(): String {
            return "$BASE_URL/data"
        }
    }
}
