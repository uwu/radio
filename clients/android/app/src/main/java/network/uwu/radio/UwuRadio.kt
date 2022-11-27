package network.uwu.radio

import android.app.Application
import network.uwu.radio.di.clientModule
import network.uwu.radio.di.homeModule
import network.uwu.radio.di.mainModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

class UwuRadio : Application() {

    override fun onCreate() {
        super.onCreate()

        startKoin {
            androidContext(this@UwuRadio)

            modules(clientModule, mainModule, homeModule)
        }
    }

}