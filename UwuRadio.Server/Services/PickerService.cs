namespace UwuRadio.Server.Services;

/*
 * Take the list of songs and split it into three
 * Make your queue consist of a randomly picked 2/3 of that
 * Run through the queue as normal, and when you reach the end:
 *
 * | former queue half : latter queue half |  | unpicked songs |
 *
 * Form a new queue of the former third and unpicked songs:
 *
 * | former queue half : unpicked songs |  | latter queue half |
 *
 * And shuffle the full queue:
 *
 * |      queue      | | unpicked songs |
 *
 *
 * This system gives a bias against recent songs, but it avoids the drawback
 * of just excluding the most recent half of the queue, in which the queue is
 * consisted of the full ingest:
 * the problem that that would essentially split the ingest into two halves,
 * where we alternate between them, albeit randomly within each half.
 *
 * This is non-ideal, and this thirds system allows songs to move around the queue
 * and intermingle over time.
 *
 * Hopefully this should lead to better shuffling? let's see!
 *  -- Yellowsink
 */

/// <summary>
///     Selects new songs
/// </summary>
public class PickerService
{
	private DataService _dataService;
	
	private Song[] _queue;
	private Song[] _unpickedSongs;

	private int _queuePos;

	public PickerService(DataService dataService)
	{
		_dataService = dataService;
		
		var allSongs = SpotifyShuffle(_dataService.Songs).ToArray();
		var queueSize = 2 * (allSongs.Length / 3);

		_queue         = new Song[queueSize];
		_unpickedSongs = new Song[allSongs.Length - queueSize];

		MemCopy(allSongs, _queue,         0,         0);
		MemCopy(allSongs, _unpickedSongs, queueSize, 0);

		ShuffleQueue();
	}

	public (Song, string?) SelectSong()
	{
		_queuePos++;

		if (_queuePos >= _queue.Length)
		{
			_queuePos -= _queue.Length;
			ShuffleQueue();
		}

		var song   = _queue[_queuePos];
		var quotes = _dataService.Submitters[song.Submitter].Quotes;
		var quote = quotes.Length > 0 ? quotes[Random.Shared.Next(quotes.Length)] : null;
		
		return (song, quote);
	}

	private void ShuffleQueue()
	{
		var halfQueueSize    = _queue.Length / 2;
		var newUnpickedSongs = new Song[halfQueueSize];
		var newQueue         = new Song[halfQueueSize + _unpickedSongs.Length];

		MemCopy(_queue,         newUnpickedSongs, halfQueueSize, 0);
		MemCopy(_queue,         newQueue,         0,             0, halfQueueSize);
		MemCopy(_unpickedSongs, newQueue,         0,             halfQueueSize);

		_unpickedSongs = newUnpickedSongs;

		_queue = SpotifyShuffle(newQueue).ToArray();
	}

	private static void FisherYatesShuffle<T>(IList<T> arr)
	{
		for (var i = arr.Count - 1; i >= 1; i--)
		{
			var j = Random.Shared.Next(i);
			(arr[i], arr[j]) = (arr[j], arr[i]);
		}
	}

	// https://engineering.atspotify.com/2014/02/how-to-shuffle-songs
	// https://codegolf.stackexchange.com/questions/198094
	private static IEnumerable<Song> SpotifyShuffle(IEnumerable<Song> arr) => arr
		.GroupBy(song => song.SortOrArtist.ToLowerInvariant())
		.SelectMany(
		    group =>
		    {
			    var groupArr = group.ToArray();
			    FisherYatesShuffle(groupArr);
				
				var groupOset = Random.Shared.NextDouble() * (1.0 / groupArr.Length);

			    return groupArr.Select((song, idx) =>
				{
					var songOset = Random.Shared.NextDouble() * (0.2 / groupArr.Length)
								 - (0.1 / groupArr.Length);

					var pos = (double) idx / groupArr.Length + groupOset + songOset;
					
					return (song, pos);
				});
			})
		.OrderBy(t => t.Item2)
		.Select(t => t.Item1);

	private static void MemCopy<T>(T[] src, T[] dest, int srcIdx, int destIdx, int count = -1)
	{
		if (count == -1) count = dest.Length - destIdx;

		var destSpan = new Span<T>(dest, destIdx, count);
		var srcSpan  = new ReadOnlySpan<T>(src, srcIdx, count);
		srcSpan.CopyTo(destSpan);
	}
}
