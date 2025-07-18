namespace UwuRadio.Server;

public record Song(
	string  Name,
	string  Artist,
	string? SortArtist,
	string  StreamUrl,
	string? ArtUrl,
	string? Album,
	string  Submitter)
{
	private string? _id;
	public  string  Id => _id ??= Helpers.ComputeSongId(this);

	public string SortOrArtist => SortArtist ?? Artist;
}

public record TransitSong(
	string  Name,
	string  Artist,
	string? SortArtist,
	string? DlUrl,
	string? SourceUrl,
	string? ArtUrl,
	string? Album,
	string  Submitter,
	string? Quote,
	double? Length)
{
	public TransitSong(Song song, string? quote, double? length) : this(song.Name,
														song.Artist,
														song.SortArtist,
														Constants.C.ServerDlUrl + song.Id,
														song.StreamUrl,
														song.ArtUrl,
														song.Album,
														song.Submitter,
														quote,
														length)
	{
	}
}
