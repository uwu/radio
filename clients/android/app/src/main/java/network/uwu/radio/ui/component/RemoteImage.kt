package network.uwu.radio.ui.component

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest

@Composable
fun RemoteImage(
	url: String,
	modifier: Modifier = Modifier
) {
	val context = LocalContext.current
	val image = remember(context, url) {
		ImageRequest.Builder(context)
			.data(url)
			.diskCachePolicy(CachePolicy.ENABLED)
			.diskCacheKey(url)
			.build()
	}
	AsyncImage(
		modifier = modifier,
		model = image,
		contentDescription = null
	)
}
