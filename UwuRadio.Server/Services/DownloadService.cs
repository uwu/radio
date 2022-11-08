using NodaTime;

namespace UwuRadio.Server.Services;

public record SongFileInfo(FileInfo File, string Md5, Duration Length);

/// <summary>
/// This service downloads songs when required and keeps track of them on disk
/// </summary>
public class DownloadService
{
	public void EnsureDownloaded(Song song) => throw new NotImplementedException();

	public bool IsDownloaded(Song song) => throw new NotImplementedException();

	public SongFileInfo GetFileInfo(Song song) => throw new NotImplementedException();

	public void AttachUrl(ref Song song)
	{
		if (IsDownloaded(song))
			song = song with
			{
				DlUrl = Constants.ServerDlUrl + GetFileInfo(song).Md5
			};
	}
}