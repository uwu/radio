package network.uwu.radio.util

import java.util.Locale

@JvmInline
value class TimeRepresentable(val millis: Long) {
	override fun toString(): String {
		val seconds = millis / 1000
		val minutes = seconds / 60
		return String.format(Locale.US, "%01d:%02d", minutes, seconds % 60)
	}
}
