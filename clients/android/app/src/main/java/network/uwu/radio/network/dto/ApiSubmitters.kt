package network.uwu.radio.network.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiSubmitters(
	@SerialName("submitters")
	val submitters: List<ApiSubmitter>
)

@Serializable
data class ApiSubmitter(
	@SerialName("name")
	val name: String,

	@SerialName("pfpUrl")
	val pfpUrl: String,

	@SerialName("quotes")
	val quotes: List<String>,
)
