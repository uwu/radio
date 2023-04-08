namespace UwuRadio.Server;

public record Channel(string Name, Song[] Songs, string? Category = null);

public record Song(string Name,      string Artist, string StreamUrl, string? ArtUrl, string? Album,
				   string Submitter, string[]? Channels = null, bool? IncludeInGlobal = null)
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

public record IngestChannel(string Name, string? Category = null)
{
	public Channel ToChannel(Song[] songs) => new(Name, songs, Category);
}

public record IngestSubmitter(string Name, string PfpUrl, string[] Quotes, Song[] Songs)
{
	public Submitter ToSubmitter() => new(Name, PfpUrl, Quotes);
}