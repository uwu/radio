namespace UwuRadio.Server;

public record Channel(string Submitter, string Name, Song[] Songs, string? Category = null,
					  bool   NoGlobal = false);
