using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace UwuRadio.Server;

[SuppressMessage("ReSharper", "UnassignedField.Global")]
[SuppressMessage("ReSharper", "FieldCanBeMadeReadOnly.Global")]
// ReSharper disable once ClassNeverInstantiated.Global
public class Constants
{
#if DEBUG
	private const string ConstantsPath = "constants.debug.json";
#else
	private const string ConstantsPath = "constants.json";
#endif

	public static Constants
		C = JsonSerializer.Deserialize<Constants>(File.OpenRead(ConstantsPath))!;

	/// <summary>
	///     Time between this song ending and the next being queued to start
	/// </summary>
	public int BufferTime { get; set; }

	/// <summary>
	///     Time remaining when the next song should be broadcasted for preloading
	/// </summary>
	public int PreloadTime { get; set; }

	/// <summary>
	///     The URL route to build download urls from
	/// </summary>
	public string ServerDlUrl { get; set; } = null!;

	/// <summary>
	///     Where to find yt-dlp
	/// </summary>
	public string YtDlpPath { get; set; } = null!;

	/// <summary>
	///     Downloaded files are saved here and removed on app exit
	/// </summary>
	public string CacheFolder { get; set; } = null!;

	/// <summary>
	///     Where the raw data is stored
	/// </summary>
	public string IngestFolder { get; set; } = null!;
	
	// these two are not in the JSON but are here for convenience
	public string IngestSubmittersFolder => Path.Combine(IngestFolder, "submitters");
	public string IngestChannelsFolder => Path.Combine(IngestFolder, "channels");
}
