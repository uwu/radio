namespace UwuRadio.Server.Services;

public record FileInfo(Song song, FileInfo file, string hash, TimeSpan length);

/// <summary>
/// This service downloads songs when required and keeps track of them on disk
/// </summary>
public class DownloadService
{
	public void EnsureDownloaded(Song song) => throw new NotImplementedException();

	public bool IsDownloaded(Song song) => throw new NotImplementedException();
	
	public FileInfo GetFileInfo(Song song) => throw new NotImplementedException();
}