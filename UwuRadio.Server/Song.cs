using UwuRadio.Server.Services;

namespace UwuRadio.Server;

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album, string Submitter)
{
	public string Id => Name.ToLowerInvariant() + "|" + Artist.ToLowerInvariant();
}

public record TransitSong(string Name, string Artist, string? DlUrl, string? ArtUrl, string? Album)
{
	public TransitSong(Song song) : this(song.Name,
										 song.Artist,
										 Constants.ServerDlUrl + song.Id,
										 song.ArtUrl,
										 song.Album)
	{
	}
}