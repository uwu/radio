package network.uwu.radio.di

import com.microsoft.signalr.HubConnectionBuilder
import io.ktor.client.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json
import network.uwu.radio.BuildConfig
import network.uwu.radio.network.service.UwuRadioApiService
import network.uwu.radio.network.service.UwuRadioApiServiceImpl
import network.uwu.radio.network.service.UwuRadioSyncService
import network.uwu.radio.network.service.UwuRadioSyncServiceImpl
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.bind
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
    singleOf(::UwuRadioSyncServiceImpl) bind UwuRadioSyncService::class
    singleOf(::UwuRadioApiServiceImpl) bind UwuRadioApiService::class
}
