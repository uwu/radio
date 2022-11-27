package network.uwu.radio.ui.component

import android.widget.SeekBar
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import network.uwu.radio.ui.theme.UwuRadioTheme

@Composable
fun SeekBar(
    progress: Float,
    leadingItem: @Composable () -> Unit,
    trailingItem: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = UwuRadioTheme.colorScheme.onBackground,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            CompositionLocalProvider(
                LocalTextStyle provides UwuRadioTheme.typography.body,
                LocalContentColor provides color
            ) {
                leadingItem()
                trailingItem()
            }
        }
        Canvas(Modifier.fillMaxWidth()) {
            drawLine(
                color = color,
                start = Offset(0f, size.height / 2f),
                end = Offset(progress * size.width, size.height / 2f),
                strokeWidth = 2f
            )
        }
    }
}