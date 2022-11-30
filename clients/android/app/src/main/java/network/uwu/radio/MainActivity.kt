package network.uwu.radio

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import com.google.accompanist.systemuicontroller.rememberSystemUiController
import network.uwu.radio.ui.screen.HomeScreen
import network.uwu.radio.ui.theme.UwuRadioTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            UwuRadioTheme {
                val backgroundColor = UwuRadioTheme.colorScheme.background
                Box(modifier = Modifier.background(backgroundColor)) {
                    val systemUiController = rememberSystemUiController()
                    SideEffect {
                        systemUiController.setSystemBarsColor(
                            color = backgroundColor,
                            darkIcons = false
                        )
                    }
                    HomeScreen()
                }
            }
        }
    }
}
