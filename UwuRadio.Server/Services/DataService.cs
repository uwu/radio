using System.Text.Json;

namespace UwuRadio.Server.Services;

/// <summary>
///     The data ingest for one submitter
/// </summary>
internal class Ingest
{
	public string   Name   { get; set; } = null!;
	public string   PfpUrl { get; set; } = null!;
	public string[] Quotes { get; set; } = null!;
	public Song[]   Songs  { get; set; } = null!;
}

/// <summary>
/// Ingests and stores data
/// </summary>
public class DataService
{
	public          Song[]                        Songs   = Array.Empty<Song>();
	public readonly Dictionary<string, Submitter> Submitters = new();

	public DataService()
	{
		DiskIngest();
		
		Helpers.Log(nameof(DataService), $"Ingested {Songs.Length} songs from {Submitters.Count} submitters");
	}
	
	private static bool IngestInvalid(Ingest ingest)
		=> string.IsNullOrWhiteSpace(ingest.Name) || string.IsNullOrWhiteSpace(ingest.PfpUrl)
												  || ingest.Songs.Any(s => string.IsNullOrWhiteSpace(s.Name)
																		|| string.IsNullOrWhiteSpace(s.Artist)
																		|| string.IsNullOrWhiteSpace(s.StreamUrl))
												  || ingest.Quotes == null!;

	private void DiskIngest()
	{
		var ingests = Directory.GetFiles(Constants.C.IngestFolder)
							   .Select(file =>
								{
									var txt      = File.ReadAllText(file);
									var ingested = JsonSerializer.Deserialize<Ingest>(txt);
									if (ingested == null || IngestInvalid(ingested))
										throw new
											InvalidDataException($"Failure ingesting {file}, ingest did not pass validation.");
									return ingested;
								})
							   .ToArray();

		Songs = ingests.SelectMany(ingest => ingest.Songs.Select(s => s with { Submitter = ingest.Name })).ToArray();

		foreach (var ingest in ingests)
			Submitters[ingest.Name] = new Submitter(ingest.Name, ingest.PfpUrl, ingest.Quotes);
	}
}