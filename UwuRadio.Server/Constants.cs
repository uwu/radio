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
	///     Proxy that yt-dlp should use, empty for none
	/// </summary>
	public string YtDlpProxy { get; set; } = null!;

	/// <summary>
	///     Downloaded files are saved here and removed on app exit
	/// </summary>
	public string CacheFolder { get; set; } = null!;

	/// <summary>
	///     Where the raw data is stored
	/// </summary>
	public string IngestFolder { get; set; } = null!;

	/// <summary>
	/// The ffmpeg `-f:a` flag
	/// </summary>
	public string AudioFormat { get; set; } = null!;

	/// <summary>
	/// The ffmpeg `-q:a` flag
	/// </summary>
	public string AudioQScale { get; set; } = null!;

	/// <summary>
	/// The ffmpeg `-b:a` flag
	/// </summary>
	public string AudioBitrate { get; set; } = null!;

	/// <summary>
	/// The target Integrated LUFS
	/// </summary>
	public double AudioNormIntegrated { get; set; }
	
	/// <summary>
	/// Allow to clip the audio by at most this much dB True Peak
	/// </summary>
	public double AudioNormMaxClip { get; set; }
}
