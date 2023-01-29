package network.uwu.radio.ui.screen

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import network.uwu.radio.R
import network.uwu.radio.ui.component.SeekBar
import network.uwu.radio.ui.component.Text
import network.uwu.radio.ui.theme.UwuRadioTheme
import network.uwu.radio.ui.viewmodel.HomeViewModel
import org.koin.androidx.compose.koinViewModel

@Composable
fun HomeScreen() { 
		val viewModel: HomeViewModel = koinViewModel()
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Box(
                modifier = Modifier
										.fillMaxWidth()
										.padding(12.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(stringResource(R.string.home_title), style = UwuRadioTheme.typography.title)
            }
            val borderColor = UwuRadioTheme.colorScheme.onBackground
            Canvas(
                modifier = Modifier
										.fillMaxWidth()
										.height(Dp.Hairline)
            ) {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, size.height)
                )
            }
        }
        Box(
            modifier = Modifier
								.fillMaxWidth()
								.weight(1f)
								.padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            when (viewModel.loading) {
                true -> {
                    Text(
                        stringResource(id = R.string.home_loading),
                        style = UwuRadioTheme.typography.title
                    )
                }
                false -> {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.SpaceEvenly,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
														Artwork(viewModel.artUrl)
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = stringResource(R.string.home_song_name, viewModel.name),
                                    style = UwuRadioTheme.typography.title.copy(textAlign = TextAlign.Center)
                                )
                                Text(
                                    text = stringResource(
                                        R.string.home_song_artist,
                                        viewModel.artist
                                    ),
                                    style = UwuRadioTheme.typography.subtitle.copy(textAlign = TextAlign.Center)
                                )
                                Text(
                                    text = stringResource(
                                        R.string.home_song_submission,
                                        viewModel.submitter
                                    ),
                                    style = UwuRadioTheme.typography.label.copy(textAlign = TextAlign.Center)
                                )
                            }
                            SeekBar(
                                modifier = Modifier.fillMaxWidth(),
                                progress = viewModel.progress,
                                leadingItem = {
                                    Text(viewModel.currentTime)
                                },
                                trailingItem = {
                                    Text(viewModel.totalTime)
                                }
                            )
                        }
                        Text(
                            text = viewModel.quote?.let { stringResource(R.string.home_song_quote, it) } ?: "",
                            style = UwuRadioTheme.typography.body.copy(textAlign = TextAlign.Center)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Artwork(
		url: String?,
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
				modifier = modifier
						.fillMaxWidth()
						.aspectRatio(1f / 1f)
						.border(Dp.Hairline, UwuRadioTheme.colorScheme.onBackground),
				model = image,
				contentDescription = null,
		)
}
