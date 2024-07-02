package network.uwu.radio.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import network.uwu.radio.ui.component.LocalContentColor
import network.uwu.radio.ui.component.LocalTextStyle

@Composable
fun UwuRadioTheme(
	colorScheme: ColorScheme = colorScheme(),
	typography: Typography = typography(),
	content: @Composable () -> Unit
) {
	CompositionLocalProvider(
		LocalTypography provides typography,
		LocalColorScheme provides colorScheme,
		LocalTextStyle provides typography.body,
		LocalContentColor provides colorScheme.onBackground,
		content = content
	)
}

object UwuRadioTheme {

	val colorScheme
		@Composable
		@ReadOnlyComposable
		get() = LocalColorScheme.current

	val typography
		@Composable
		@ReadOnlyComposable
		get() = LocalTypography.current

}

private val LocalColorScheme = staticCompositionLocalOf { colorScheme() }
private val LocalTypography = staticCompositionLocalOf { typography() }
