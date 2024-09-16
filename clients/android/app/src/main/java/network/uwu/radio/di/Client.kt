package network.uwu.radio.di

import com.microsoft.signalr.HubConnectionBuilder
import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.ANDROID
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import network.uwu.radio.BuildConfig
import network.uwu.radio.network.UwuRadioApiService
import network.uwu.radio.network.UwuRadioSyncService
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val clientModule = module {
	single {
		HubConnectionBuilder.create("https://radio.k6.tf/sync")
			.build()
	}
	single {
		HttpClient(Android) {
			install(ContentNegotiation) {
				json(Json { ignoreUnknownKeys = true })
			}
			if (BuildConfig.DEBUG) {
				install(Logging) {
					logger = Logger.ANDROID
					level = LogLevel.ALL
				}
			}
		}
	}
	singleOf(::UwuRadioSyncService)
	singleOf(::UwuRadioApiService)
}
