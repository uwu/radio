namespace UwuRadio.Server;

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album, string Submitter)
{
	public string Id => Name.ToLowerInvariant() + "|" + Artist.ToLowerInvariant();
}

public record TransitSong(string Name, string Artist, string? DlUrl, string? SourceUrl, string? ArtUrl, string? Album, string Submitter)
{
	public TransitSong(Song song) : this(song.Name,
										 song.Artist,
										 Constants.C.ServerDlUrl + song.Id,
										 song.StreamUrl,
										 song.ArtUrl,
										 song.Album,
										 song.Submitter)
	{
	}
}
