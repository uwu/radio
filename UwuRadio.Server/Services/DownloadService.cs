using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using NodaTime;

namespace UwuRadio.Server.Services;

public record SongFileInfo(FileInfo File, string Md5, Duration Length);

/// <summary>
///     This service downloads songs when required and keeps track of them on disk
/// </summary>
public class DownloadService
{
	private readonly Queue<Song>                      _downloadQueue     = new();
	private readonly Dictionary<string, SongFileInfo> _fileInfos         = new();
	private readonly HashSet<string>                  _downloadBlacklist = new();

	private bool _isCurrentlyDownloading;

	public DownloadService() { Directory.CreateDirectory(Constants.C.CacheFolder); }

	public bool IsBlacklisted(Song song) => _downloadBlacklist.Contains(song.Id);
	
	public void EnsureDownloaded(Song song)
	{
		if (IsDownloaded(song)) return;
		if (IsBlacklisted(song)) return;
		
		Helpers.Log(nameof(DownloadService), $"Queued {song.Name} for DL");

		_downloadQueue.Enqueue(song);
		if (!_isCurrentlyDownloading) StartDownloading();
	}

	public bool IsDownloaded(string id)   => _fileInfos.ContainsKey(id);
	public bool IsDownloaded(Song   song) => IsDownloaded(song.Id);

	public SongFileInfo GetFileInfo(string id)   => _fileInfos[id];
	public SongFileInfo GetFileInfo(Song   song) => GetFileInfo(song.Id);

	private async void StartDownloading()
	{
		_isCurrentlyDownloading = true;
		while (_downloadQueue.TryDequeue(out var song))
		{
			try { _fileInfos[song.Id] = await DownloadSong(song.StreamUrl); }
			catch (Exception e)
			{
				Helpers.Log(nameof(DownloadService),
							$"Caught exception while downloading {song.Name}! Blacklisting from future download attempts.\n"
						  + e);
				_downloadBlacklist.Add(song.Id);
				continue;
			}
			
			Helpers.Log(nameof(DownloadService), $"Downloaded and cached {song.Name}");
		}

		_isCurrentlyDownloading = false;
	}

	private static async Task<SongFileInfo> DownloadSong(string url)
	{
		var args
			= $"--proxy \"{Constants.C.YtDlpProxy}\" \"{url}\" -O after_move:filepath --quiet --print-json -f bestaudio --extract-audio --audio-quality 0";

		var (rawPath, durationStr) = await InvokeYtDlp(args);

		var tmpHash      = Helpers.MD5(await File.ReadAllBytesAsync(rawPath));
		var tmpCachePath = Path.Combine(Constants.C.CacheFolder, tmpHash);
		
		var loudness = await DSP.MeasureLoudness(rawPath);
		await DSP.Normalize(rawPath, tmpCachePath, loudness);

		var realHash      = Helpers.MD5(await File.ReadAllBytesAsync(tmpCachePath));
		var realCachePath = Path.Combine(Constants.C.CacheFolder, realHash);
		File.Move(tmpCachePath, realCachePath, true);
		
		File.Delete(rawPath);

		return new SongFileInfo(new FileInfo(realCachePath), realHash, Helpers.ParseDuration(durationStr));
	}

	private static async Task<(string, string)> InvokeYtDlp(string args)
	{
		var startOptions = new ProcessStartInfo(Constants.C.YtDlpPath, args)
		{
			WorkingDirectory       = Path.GetTempPath(),
			RedirectStandardOutput = true
		};

		var process = Process.Start(startOptions);
		var stdOut  = (await process!.StandardOutput.ReadToEndAsync()).Split("\n");

		var jsonOut = stdOut[0];
		var rawPath = stdOut[1];

		var durationStr = JsonSerializer.Deserialize<YtdlOutputObject>(jsonOut)!.DurationString;

		return (rawPath, durationStr);
	}

	/// <summary>
	///     Please ignore outside of DownloadService: exists to read the output of YTDL
	/// </summary>
	public class YtdlOutputObject
	{
		[JsonPropertyName("duration_string")]
		public string DurationString { get; set; } = null!;
	}
}
