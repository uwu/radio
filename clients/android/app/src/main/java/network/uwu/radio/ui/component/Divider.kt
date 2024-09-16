package network.uwu.radio.ui.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import network.uwu.radio.ui.theme.UwuRadioTheme

@Composable
fun Divider(
	modifier: Modifier = Modifier,
	thickness: Dp = Dp.Hairline,
	color: Color = UwuRadioTheme.colorScheme.onBackground
) {
	Canvas(
		modifier = modifier.height(thickness)
	) {
		drawLine(
			color = color,
			start = Offset(0f, 0f),
			end = Offset(size.width, size.height)
		)
	}
}
