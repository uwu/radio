namespace UwuRadio.Server;

public record Song(string Name, string Artist, string StreamUrl, string? ArtUrl, string? Album)
{
	public string Id => Name.ToLowerInvariant() + "|" + Artist.ToLowerInvariant();
}