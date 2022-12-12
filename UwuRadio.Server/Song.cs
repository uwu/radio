namespace UwuRadio.Server;

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album, string Submitter)
{
	private string? _Id;
	public string Id => _Id ??= Helpers.ComputeSongId(this);
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
