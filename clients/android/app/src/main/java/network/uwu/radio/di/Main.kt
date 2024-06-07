package network.uwu.radio.di

import network.uwu.radio.domain.SessionRepository
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val mainModule = module {
	singleOf(::SessionRepository)
}
