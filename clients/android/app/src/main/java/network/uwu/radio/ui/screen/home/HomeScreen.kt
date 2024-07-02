package network.uwu.radio.ui.screen.home

import android.content.res.Configuration
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import network.uwu.radio.R
import network.uwu.radio.ui.component.Divider
import network.uwu.radio.ui.component.LocalTextStyle
import network.uwu.radio.ui.component.ProgressBar
import network.uwu.radio.ui.component.RemoteImage
import network.uwu.radio.ui.component.Text
import network.uwu.radio.ui.theme.UwuRadioTheme
import org.koin.androidx.compose.koinViewModel

@Composable
fun HomeScreen() {
	val viewModel: HomeViewModel = koinViewModel()
	val state by viewModel.state.collectAsStateWithLifecycle()
	val progress by viewModel.progress.collectAsStateWithLifecycle()
	Column(
		modifier = Modifier.fillMaxSize(),
		verticalArrangement = Arrangement.spacedBy(4.dp)
	) {
		Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
			Box(
				modifier = Modifier
					.fillMaxWidth()
					.padding(12.dp),
				contentAlignment = Alignment.Center
			) {
				Text(stringResource(R.string.home_title), style = UwuRadioTheme.typography.title)
			}
			Divider(modifier = Modifier.fillMaxWidth())
		}
		Box(
			modifier = Modifier
				.fillMaxWidth()
				.weight(1f)
				.padding(16.dp),
			contentAlignment = Alignment.Center
		) {
			// Kotlin bug, smart casting doesn't work without this
			when (val state = state) {
				is HomeScreenState.Loading -> {
					HomeScreenLayout(
						artwork = {
							Image(
								painter = painterResource(R.drawable.ic_thumbnail),
								contentDescription = null
							)
						},
						name = { Text(stringResource(R.string.home_loading)) },
						artist = { Text("???") },
						submitter = { Text("???") },
						progress = {
							ProgressBar(
								modifier = Modifier.fillMaxWidth(),
								progress = 1f,
								leadingItem = { Text("?:??") },
								trailingItem = { Text("?:??") }
							)
						},
						quote = { Text("") }
					)
				}

				is HomeScreenState.Success -> {
					HomeScreenLayout(
						artwork = {
							if (state.songArtworkUrl != null) {
								RemoteImage(state.songArtworkUrl)
							}
						},
						name = { Text(stringResource(R.string.home_song_name, state.songName)) },
						artist = { Text(stringResource(R.string.home_song_artist, state.songArtist)) },
						submitter = { Text(stringResource(R.string.home_song_submission, state.submitter)) },
						progress = {
							ProgressBar(
								modifier = Modifier.fillMaxWidth(),
								progress = progress.progress,
								leadingItem = {
									Text(progress.currentTime.toString())
								},
								trailingItem = {
									Text(progress.totalTime.toString())
								}
							)
						},
						quote = {
							if (state.quote != null) {
								Text(stringResource(R.string.home_song_quote, state.quote))
							} else {
								Text("")
							}
						}
					)
				}
			}
		}
	}
}

@Composable
private fun HomeScreenLayout(
	modifier: Modifier = Modifier,
	artwork: @Composable () -> Unit,
	name: @Composable () -> Unit,
	artist: @Composable () -> Unit,
	submitter: @Composable () -> Unit,
	progress: @Composable () -> Unit,
	quote: @Composable () -> Unit,
) {
	val configuration = LocalConfiguration.current
	val orientation = configuration.orientation
	if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
		Row(
			modifier = modifier
				.heightIn(max = 350.dp)
				.widthIn(max = 1000.dp),
			verticalAlignment = Alignment.CenterVertically,
			horizontalArrangement = Arrangement.spacedBy(32.dp)
		) {
			Box(
				modifier = Modifier
					.fillMaxHeight()
					.aspectRatio(1f),
				propagateMinConstraints = true
			) {
				artwork()
			}
			Column(
				modifier = Modifier.weight(1f),
				verticalArrangement = Arrangement.spacedBy(16.dp),
				horizontalAlignment = Alignment.CenterHorizontally
			) {
				Column(
					modifier = Modifier.fillMaxWidth(),
					verticalArrangement = Arrangement.spacedBy(8.dp),
					horizontalAlignment = Alignment.CenterHorizontally
				) {
					CompositionLocalProvider(
						LocalTextStyle provides UwuRadioTheme.typography.title,
						content = name
					)
					CompositionLocalProvider(
						LocalTextStyle provides UwuRadioTheme.typography.subtitle,
						content = artist
					)
					CompositionLocalProvider(
						LocalTextStyle provides UwuRadioTheme.typography.label,
						content = submitter
					)
				}
				progress()
				CompositionLocalProvider(
					LocalTextStyle provides UwuRadioTheme.typography.body.copy(textAlign = TextAlign.Center),
					content = quote
				)
			}
		}
	} else {
		Column(
			modifier = modifier.widthIn(max = 600.dp),
			verticalArrangement = Arrangement.spacedBy(16.dp),
			horizontalAlignment = Alignment.CenterHorizontally
		) {
			Box(
				modifier = Modifier
					.fillMaxWidth()
					.aspectRatio(1f),
				propagateMinConstraints = true
			) {
				artwork()
			}
			Column(
				modifier = Modifier.fillMaxWidth(),
				verticalArrangement = Arrangement.spacedBy(8.dp),
				horizontalAlignment = Alignment.CenterHorizontally
			) {
				CompositionLocalProvider(
					LocalTextStyle provides UwuRadioTheme.typography.title.copy(textAlign = TextAlign.Center),
					content = name
				)
				CompositionLocalProvider(
					LocalTextStyle provides UwuRadioTheme.typography.subtitle.copy(textAlign = TextAlign.Center),
					content = artist
				)
				CompositionLocalProvider(
					LocalTextStyle provides UwuRadioTheme.typography.label.copy(textAlign = TextAlign.Center),
					content = submitter
				)
			}
			progress()
			CompositionLocalProvider(
				LocalTextStyle provides UwuRadioTheme.typography.body.copy(textAlign = TextAlign.Center),
				content = quote
			)
		}
	}
}
