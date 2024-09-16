package network.uwu.radio.ui

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.ui.Modifier
import network.uwu.radio.ui.screen.home.HomeScreen
import network.uwu.radio.ui.theme.UwuRadioTheme

class MainActivity : ComponentActivity() {

	override fun onCreate(savedInstanceState: Bundle?) {
		enableEdgeToEdge(
			statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
			navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT)
		)
		super.onCreate(savedInstanceState)

		setContent {
			UwuRadioTheme {
				val backgroundColor = UwuRadioTheme.colorScheme.background
				Box(modifier = Modifier
					.systemBarsPadding()
					.background(backgroundColor)) {
					HomeScreen()
				}
			}
		}
	}
}
