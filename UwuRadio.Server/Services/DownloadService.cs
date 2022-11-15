using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using NodaTime;

namespace UwuRadio.Server.Services;

public record SongFileInfo(FileInfo File, string Md5, Duration Length);

/// <summary>
/// This service downloads songs when required and keeps track of them on disk
/// </summary>
public class DownloadService : IDisposable
{
	private readonly Dictionary<string, SongFileInfo> _fileInfos = new();

	private          bool        _isCurrentlyDownloading;
	private readonly Queue<Song> _downloadQueue = new();

	public DownloadService() => Directory.CreateDirectory(Constants.CacheFolder);

	public void Dispose() => Directory.Delete(Constants.CacheFolder, true);

	public void EnsureDownloaded(Song song)
	{
		if (IsDownloaded(song)) return;

		_downloadQueue.Enqueue(song);
		if (!_isCurrentlyDownloading) StartDownloading();
	}

	public bool IsDownloaded(string id)   => _fileInfos.ContainsKey(id);
	public bool IsDownloaded(Song   song) => IsDownloaded(song.Id);

	public SongFileInfo GetFileInfo(string id) => _fileInfos[id];
	public SongFileInfo GetFileInfo(Song song) => GetFileInfo(song.Id);

	public string? GetUrl(Song song)
	{
		if (IsDownloaded(song))
			return Constants.ServerDlUrl + GetFileInfo(song).Md5;
		return null;
	}

	private async void StartDownloading()
	{
		_isCurrentlyDownloading = true;
		while (_downloadQueue.Count > 0)
		{
			var song = _downloadQueue.Dequeue();
			_fileInfos[song.Id] = await DownloadSong(song.StreamUrl);
		}
	}

	private async Task<SongFileInfo> DownloadSong(string url)
	{
		var tempFolder = Path.GetTempPath();


		var isYtUrl = url.Contains("youtube.com") || url.Contains("youtu.be");

		// %(ext)s is a pattern that tells YTDL to insert the correct file extension
		var args = $"\"{url}\" --print-json --quiet";

		if (isYtUrl) args += " -f bestaudio --extract-audio --audio-format mp3 --audio-quality 0";

		var startOptions = new ProcessStartInfo(Constants.YtDlpPath, args)
		{
			WorkingDirectory       = tempFolder,
			RedirectStandardOutput = true
		};

		var process = Process.Start(startOptions);
		await process!.WaitForExitAsync();
		var stdOut = await process.StandardOutput.ReadToEndAsync();

		var ytdlOutput = JsonSerializer.Deserialize<YtdlOutputObject>(stdOut)!;

		if (isYtUrl)
		{
			// yt-dlp claims that its downloaded a webm (which to be fair it has)
			// but its been transcoded to mp3.
			ytdlOutput.Filename  = ytdlOutput.Filename[Range.EndAt(ytdlOutput.Filename.Length - 5)] + ".mp3";
			ytdlOutput.Extension = "mp3";
		}

		var tempPath = Path.Combine(tempFolder, ytdlOutput.Filename);
		var ext      = new FileInfo(tempPath).Extension;

		var hash = Helpers.MD5(await File.ReadAllBytesAsync(tempPath));

		var cachePath = Path.Combine(Constants.CacheFolder, hash + ext);
		File.Move(tempPath, cachePath, true);

		return new SongFileInfo(new FileInfo(cachePath), hash, Helpers.ParseDuration(ytdlOutput.DurationString));
	}

	/// <summary>
	///     Please ignore outside of DownloadService: exists to read the output of YTDL
	/// </summary>
	public class YtdlOutputObject
	{
		[JsonPropertyName("filename")]
		public string Filename { get; set; } = null!;

		[JsonPropertyName("ext")]
		public string Extension { get; set; } = null!;

		[JsonPropertyName("duration_string")]
		public string DurationString { get; set; } = null!;
	}
}