using System.Text.Json;

namespace UwuRadio.Server.Services;

/// <summary>
/// Ingests and stores data
/// </summary>
public class DataService
{
	public readonly Dictionary<string, Channel>   Channels    = new();
	public readonly Dictionary<string, Submitter> Submitters  = new();
	public          Song[]                        GlobalSongs = Array.Empty<Song>();

	private static readonly JsonSerializerOptions JsonOpts = new()
	{
		ReadCommentHandling = JsonCommentHandling.Skip
	};

	public DataService()
	{
		IngestSubmitters();
		IngestChannels();

		Helpers.Log(
			nameof(DataService),
			$@"Ingest successful:
  - {Channels.Values.Sum(c => c.Songs.Length)} total songs
  - {Channels.Count} channels
  - {Submitters.Count} submitters"
		);
	}

	private static bool SongInvalid(Song s)
		=> string.IsNullOrWhiteSpace(s.Name) || string.IsNullOrWhiteSpace(s.Artist)
											 || string.IsNullOrWhiteSpace(s.StreamUrl);

	private static bool SubmitterInvalid(Submitter submitter)
		=> string.IsNullOrWhiteSpace(submitter.Name) || string.IsNullOrWhiteSpace(submitter.PfpUrl)
													 || submitter.Quotes == null!;

	private bool ChannelInvalid(Channel channel)
		=> !Submitters.ContainsKey(channel.Submitter) || string.IsNullOrWhiteSpace(channel.Name)
													  || channel.Songs == null!
													  || channel.Songs.Any(SongInvalid);

	private void IngestSubmitters()
	{
		var ingests = Directory.GetFiles(Constants.C.IngestSubmittersFolder)
.Select(
									file =>
									{
										var txt = File.ReadAllText(file);
										var ingested
											= JsonSerializer.Deserialize<Submitter>(txt, JsonOpts);
										if (ingested == null || SubmitterInvalid(ingested))
											throw new InvalidDataException(
												$"Failure ingesting submitter {file}, ingest did not pass validation."
											);

										return ingested;
									}
								)
.ToArray();

		foreach (var ingest in ingests) Submitters[ingest.Name] = ingest;
	}

	private void IngestChannels()
	{
		var ingests = Directory.GetFiles(Constants.C.IngestChannelsFolder)
.Select(
									file =>
									{
										var txt = File.ReadAllText(file);
										var ingested
											= JsonSerializer.Deserialize<Channel>(txt, JsonOpts);
										if (ingested == null || ChannelInvalid(ingested))
											throw new InvalidDataException(
												$"Failure ingesting channel {file}, ingest did not pass validation."
											);

										return ingested;
									}
								)
.ToArray();

		foreach (var ingest in ingests)
			Channels[ingest.Name] = ingest;

		GlobalSongs = Channels.Values.Where(c => !c.NoGlobal).SelectMany(c => c.Songs).ToArray();
	}
}
