namespace UwuRadio.Server;

public record Channel(string Submitter, string Name, Song[] Songs, string? Category = null,
					  bool   NoGlobal = false);

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album,
				   string Submitter)
{
	// lazy & cached
	private string? _id;
	public  string  Id => _id ??= Helpers.ComputeSongId(this);
}

public record TransitSong(string  Name,   string  Artist, string? DlUrl, string? SourceUrl,
						  string? ArtUrl, string? Album,  string  Submitter)
{
	public TransitSong(Song song) : this(
		song.Name,
		song.Artist,
		Constants.C.ServerDlUrl + song.Id,
		song.StreamUrl,
		song.ArtUrl,
		song.Album,
		song.Submitter
	)
	{
	}
}

public record Submitter(string Name, string PfpUrl, string[] Quotes);