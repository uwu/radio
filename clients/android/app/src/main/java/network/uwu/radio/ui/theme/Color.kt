package network.uwu.radio.ui.theme

import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

fun colorScheme(
    background: Color = Color.Black,
    inverseBackground: Color = Color.White,
    onBackground: Color = Color.White,
    inverseOnBackground: Color = Color.Black
): ColorScheme {
    return ColorScheme(
        background = background,
        inverseBackground = inverseBackground,
        onBackground = onBackground,
        inverseOnBackground = inverseOnBackground
    )
}

@Stable
class ColorScheme(
    background: Color,
    inverseBackground: Color,
    onBackground: Color,
    inverseOnBackground: Color
) {
    var background by mutableStateOf(background)
        internal set

    var inverseBackground by mutableStateOf(inverseBackground)
        internal set

    var onBackground by mutableStateOf(onBackground)
        internal set

    var inverseOnBackground by mutableStateOf(inverseOnBackground)
        internal set
}