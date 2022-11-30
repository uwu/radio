package network.uwu.radio.di

import network.uwu.radio.domain.repository.SessionRepository
import network.uwu.radio.domain.repository.SessionRepositoryImpl
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.bind
import org.koin.dsl.module

val mainModule = module {
    singleOf(::SessionRepositoryImpl) bind SessionRepository::class
}
