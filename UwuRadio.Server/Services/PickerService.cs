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
public class PickerService /* : IPrettyNamed*/
{
	private readonly DataService _dataService;

	private Song[] _queue         = Array.Empty<Song>();
	private Song[] _unpickedSongs = Array.Empty<Song>();

	private int _queuePos;

	public string? Channel;

	//public string PrettyName => nameof(PickerService) + " - " + (Channel ?? "<global>");

	public PickerService(DataService dataService) => _dataService = dataService;

	private bool _inited;

	// we need our channel set before we can actually init
	private void LateInit()
	{
		if (_inited) return;
		_inited = true;

		var songs = Channel == null
						? _dataService.GlobalSongs
						: _dataService.Channels[Channel!].Songs;

		if (songs.Length < 3)
		{
			_queue = songs;
			return;
		}

		var shuffledSongs = SpotifyShuffle(songs).ToArray();

		var queueSize = 2 * (shuffledSongs.Length / 3);

		_queue         = new Song[queueSize];
		_unpickedSongs = new Song[shuffledSongs.Length - queueSize];

		MemCopy(shuffledSongs, _queue,         0,         0);
		MemCopy(shuffledSongs, _unpickedSongs, queueSize, 0);

		ShuffleQueue();
	}

	public Song SelectSong()
	{
		LateInit();

		if (_queue.Length < 3 && _unpickedSongs.Length == 0)
		{
			var song = _queue[_queuePos++];
			_queuePos %= _queue.Length;
			return song;
		}

		_queuePos++;

		// ReSharper disable once InvertIf
		if (_queuePos >= _queue.Length)
		{
			_queuePos -= _queue.Length;
			ShuffleQueue();
		}

		return _queue[_queuePos];
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
	   .GroupBy(song => song.Submitter + song.Artist)
	   .SelectMany(group =>
			{
				var groupArr = group.ToArray();
				FisherYatesShuffle(groupArr);

				var groupOset = Random.Shared.NextDouble() * (1.0 / groupArr.Length);

				return groupArr.Select((song, idx) =>
					{
						// ReSharper disable once ArrangeRedundantParentheses
						var songOset = Random.Shared.NextDouble() * (0.2 / groupArr.Length)
									 - (0.1 / groupArr.Length);

						var pos = (double) idx / groupArr.Length + groupOset + songOset;

						return (song, pos);
					}
				);
			}
		)
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
