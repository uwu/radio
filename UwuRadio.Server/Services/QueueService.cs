using System.Text.Json;

namespace UwuRadio.Server.Services;

/// <summary>
/// The data ingest for one submitter
/// </summary>
public class SubmitterIngest
{
	public Song[] Songs { get; set; } = null!;

	public string   Name   { get; set; } = null!;
	public string   PfpUrl { get; set; } = null!;
	public string[] Quotes { get; set; } = null!;
}

public record Submitter(string Name, string PfpUrl, string[] Quotes);

/// <summary>
/// Keeps track of all songs and selects new songs
/// </summary>
public class QueueService
{
	public          Song[]                        AllSongs   = Array.Empty<Song>();
	public readonly Dictionary<string, Submitter> Submitters = new();

	private readonly Random _rand = new();

	private readonly Song[] _queue;
	private          int    _queuePos;

	public QueueService()
	{
		DiskIngest();
		_queue   = AllSongs;
		ShuffleQueue();
	}

	private static bool IngestInvalid(SubmitterIngest ingest)
		=> string.IsNullOrWhiteSpace(ingest.Name) || string.IsNullOrWhiteSpace(ingest.PfpUrl)
												  || ingest.Songs.Any(s => string.IsNullOrWhiteSpace(s.Name)
																		|| string.IsNullOrWhiteSpace(s.Artist)
																		|| string.IsNullOrWhiteSpace(s.StreamUrl))
												  || ingest.Quotes == null!;

	private void DiskIngest()
	{
		var ingests = Directory.GetFiles(Constants.IngestFolder)
								.Select(file =>
								 {
									 var txt      = File.ReadAllText(file);
									 var ingested = JsonSerializer.Deserialize<SubmitterIngest>(txt);
									 if (ingested == null || IngestInvalid(ingested))
										 throw new
											 InvalidDataException($"Failure ingesting {file}, ingest did not pass validation.");
									 return ingested;
								 })
								.ToArray();

		AllSongs = ingests.SelectMany(ingest => ingest.Songs.Select(s => s with { Submitter = ingest.Name }))
						  .ToArray();

		foreach (var ingest in ingests)
			Submitters[ingest.Name] = new Submitter(ingest.Name, ingest.PfpUrl, ingest.Quotes);
	}

	public Song SelectSong()
	{
		_queuePos++;

		if (_queuePos >= _queue.Length)
		{
			_queuePos = 0;
			ShuffleQueue();
		}

		return _queue[_queuePos];
	}

	private void ShuffleQueue()
	{
		for (var n = _queue.Length - 1; n > 0; n--)
		{
			var k = _rand.Next(n + 1);
			(_queue[k], _queue[n]) = (_queue[n], _queue[k]);
		}
	}
}