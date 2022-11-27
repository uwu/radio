package network.uwu.radio.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import network.uwu.radio.R

private val fontFamily = FontFamily(
    Font(R.font.ibmplexmono_extralight, weight = FontWeight.ExtraLight),
    Font(R.font.ibmplexmono_light, weight = FontWeight.Light),
    Font(R.font.ibmplexmono_regular, weight = FontWeight.Normal),
    Font(R.font.ibmplexmono_medium, weight = FontWeight.Medium),
    Font(R.font.ibmplexmono_semibold, weight = FontWeight.SemiBold),
    Font(R.font.ibmplexmono_bold, weight = FontWeight.Bold),
)

fun typography(
    title: TextStyle = TextStyle(
        fontFamily = fontFamily,
        fontSize = 20.sp,
        lineHeight = 28.sp
    ),
    subtitle: TextStyle = TextStyle(
        fontFamily = fontFamily,
        fontSize = 18.sp,
        lineHeight = 28.sp
    ),
    body: TextStyle = TextStyle(
        fontFamily = fontFamily,
        fontSize = 16.sp,
        lineHeight = 24.sp
    ),
    label: TextStyle = TextStyle(
        fontFamily = fontFamily,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
): Typography {
    return Typography(
        title = title,
        subtitle = subtitle,
        body = body,
        label = label,
    )
}

@Immutable
data class Typography(
    val title: TextStyle,
    val subtitle: TextStyle,
    val body: TextStyle,
    val label: TextStyle,
)
