using System.Collections.Immutable;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;

namespace UwuRadio.Server.Services;

/// <summary>
/// Ingests and stores data
/// </summary>
public class DataService
{
	public           IImmutableDictionary<string, Channel> Channels;

	public IImmutableDictionary<string, Submitter> Submitters;
	public Song[]                                  GlobalSongs = Array.Empty<Song>();

	private static readonly JsonSerializerOptions JsonOpts = new()
	{
		ReadCommentHandling = JsonCommentHandling.Skip
	};

	// ReSharper disable once SuggestBaseTypeForParameterInConstructor
	public DataService(ILogger<DataService> logger)
	{
		var                  rawChannels   = IngestChannels();
		var                  rawSubmitters = IngestSubmitters();
		PostProcessIngests(rawChannels, rawSubmitters);

		logger.LogInformation(
			@"Ingest successful:
  - {Sum} total songs
  - {ChannelCount} channels
  - {SubmitterCount} submitters",
			Channels!.Values.Sum(c => c.Songs.Length),
			Channels.Count,
			Submitters!.Count
		);
	}

	private static bool SongInvalid(Song s)
		=> string.IsNullOrWhiteSpace(s.Name) || string.IsNullOrWhiteSpace(s.Artist)
											 || string.IsNullOrWhiteSpace(s.StreamUrl)
											 || ((s.Channels == null || s.Channels.Length == 0)
											  && s.IncludeInGlobal == false);

	private static bool SubmitterInvalid(IngestSubmitter submitter)
		=> string.IsNullOrWhiteSpace(submitter.Name) || string.IsNullOrWhiteSpace(submitter.PfpUrl)
													 || submitter.Quotes == null!
													 || submitter.Songs.Any(SongInvalid);

	private static bool ChannelInvalid(IngestChannel channel)
		=> string.IsNullOrWhiteSpace(channel.Name);

	private static Dictionary<string, IngestSubmitter> IngestSubmitters()
	{
		var ingests = Directory.GetFiles(Constants.C.IngestSubmittersFolder)
.Select(
									file =>
									{
										var txt = File.ReadAllText(file);
										var ingested
											= JsonSerializer.Deserialize<IngestSubmitter>(
												txt,
												JsonOpts
											);
										if (ingested == null || SubmitterInvalid(ingested))
											throw new InvalidDataException(
												$"Failure ingesting submitter {file}, ingest did not pass validation."
											);

										return ingested;
									}
								)
.ToArray();

		return ingests.ToDictionary(s => s.Name);
	}

	private static Dictionary<string, IngestChannel> IngestChannels()
	{
		var ingests = Directory.GetFiles(Constants.C.IngestChannelsFolder)
.Select(
									file =>
									{
										var txt = File.ReadAllText(file);
										var ingested
											= JsonSerializer.Deserialize<IngestChannel>(
												txt,
												JsonOpts
											);
										if (ingested == null || ChannelInvalid(ingested))
											throw new InvalidDataException(
												$"Failure ingesting channel {file}, ingest did not pass validation."
											);

										return ingested;
									}
								)
.ToArray();

		return ingests.ToDictionary(i => i.Name);
	}

	/// <summary>
	/// Makes sure songs end up where they should be
	/// </summary>
	private void PostProcessIngests(Dictionary<string, IngestChannel>   rawChannels,
									Dictionary<string, IngestSubmitter> rawSubmitters)
	{
		var globalSongs  = new List<Song>();
		var channelSongs = new Dictionary<string, List<Song>>();

		foreach (var submitter in rawSubmitters.Values)
		{
			channelSongs[submitter.Name] = new List<Song>();

			foreach (var song in submitter.Songs)
			{
				if (song.Channels == null || song.Channels.Length == 0)
				{
					// not in any explicit channels
					if (song.IncludeInGlobal == false)
						throw new Exception("song passed validation but should not have, bailing");

					globalSongs.Add(song);
					channelSongs[submitter.Name].Add(song);
				}
				else
				{
					if (song.IncludeInGlobal == true)
					{
						globalSongs.Add(song);
						channelSongs[submitter.Name].Add(song);
					}

					foreach (var chan in song.Channels)
						if (channelSongs.TryGetValue(chan, out var cSongs))
							cSongs.Add(song);
						else channelSongs[chan] = new List<Song> { song };
				}
			}
		}

		GlobalSongs = globalSongs.ToArray();

		Channels = rawChannels
				  .Select(
					   pair => new KeyValuePair<string, Channel>(
						   pair.Key,
						   pair.Value.ToChannel(channelSongs[pair.Key].ToArray())
					   )
				   )
				  .Concat(
					   rawSubmitters.Select(
						   pair => new KeyValuePair<string, Channel>(
							   pair.Key,
							   new Channel(pair.Key, channelSongs[pair.Key].ToArray())
						   )
					   )
				   )
				  .ToImmutableDictionary();

		Submitters = rawSubmitters.Select(
									   pair => new KeyValuePair<string, Submitter>(
										   pair.Key,
										   pair.Value.ToSubmitter()
									   )
								   )
								  .ToImmutableDictionary();
	}
}