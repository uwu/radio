using UwuRadio.Server.Services;

namespace UwuRadio.Server;

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album)
{
	public string Id => Name.ToLowerInvariant() + "|" + Artist.ToLowerInvariant();
}

public record TransitSong(string Name, string Artist, string? DlUrl, string? ArtUrl, string? Album)
{
	public TransitSong(Song song, DownloadService dlService) : this(song.Name,
																	song.Artist,
																	dlService.GetUrl(song),
																	song.ArtUrl,
																	song.Album)
	{
	}
}