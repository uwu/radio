package network.uwu.radio.di

import network.uwu.radio.domain.repository.MainRepository
import network.uwu.radio.domain.repository.MainRepositoryImpl
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.bind
import org.koin.dsl.module

val mainModule = module {
    singleOf(::MainRepositoryImpl) bind MainRepository::class
}
