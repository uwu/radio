package network.uwu.radio.di

import network.uwu.radio.ui.screen.home.HomeViewModel
import org.koin.androidx.viewmodel.dsl.viewModelOf
import org.koin.dsl.module

val homeModule = module {
	viewModelOf(::HomeViewModel)
}
