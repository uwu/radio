package network.uwu.radio.ui.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel

class HomeViewModel : ViewModel() {

    private var _totalTime: Long = 0
    private var _currentTime: Long = 0

    var artUrl by mutableStateOf<String?>(null)
        private set

    var name by mutableStateOf("")
        private set

    var artist by mutableStateOf("")
        private set

    var submitter by mutableStateOf("")
        private set

    var quote by mutableStateOf<String?>(null)
        private set

    var totalTime by mutableStateOf("")
        private set

    var currentTime by mutableStateOf("")
        private set

    var progress by mutableStateOf(0f)
        private set

    var loading by mutableStateOf(true)
        private set

    fun updateArtworkUrl(url: String) {
        artUrl = url
    }

    fun updateName(name: String) {
        this.name = name
    }

    fun updateArtist(artist: String) {
        this.artist = artist
    }

    fun updateSubmitter(submitter: String) {
        this.submitter = submitter
    }

    fun updateQuote(quote: String?) {
        this.quote = quote
    }

    fun updateTotalTime(millis: Long) {
        val seconds = millis / 1000
        _totalTime = millis
        totalTime = String.format("%01d:%02d", seconds / 60, seconds % 60)
    }

    fun updateCurrentTime(millis: Long) {
        val seconds = millis / 1000
        _currentTime = millis
        currentTime = String.format("%01d:%02d", seconds / 60, seconds % 60)
        progress = _currentTime.toFloat() / _totalTime.toFloat()
    }

    fun updateLoading(loading: Boolean) {
        this.loading = loading
    }

}
