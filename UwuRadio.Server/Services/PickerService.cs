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
	private Song[] _queue;
	private Song[] _unpickedSongs;

	private int _queuePos;

	public PickerService(DataService dataService)
	{
		var queueSize = 2 * (dataService.Songs.Length / 3);
		
		_queue   = new Song[queueSize];
		_unpickedSongs = new Song[dataService.Songs.Length - queueSize];

		MemCopy(dataService.Songs, _queue,         0,         0);
		MemCopy(dataService.Songs, _unpickedSongs, queueSize, 0);
		
		ShuffleQueue();
	}

	public Song SelectSong()
	{
		_queuePos++;

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
		
		MemCopy(_queue, newUnpickedSongs, halfQueueSize, 0);
		MemCopy(_queue, newQueue, 0, 0, halfQueueSize);
		MemCopy(_unpickedSongs, newQueue, 0, halfQueueSize);
		
		_unpickedSongs = newUnpickedSongs;
		_queue         = newQueue;
		
		ShuffleArr(_queue);
	}

	private static void ShuffleArr<T>(IList<T> arr)
	{
		for (var i = arr.Count - 1; i >= 1; i--)
		{
			var j   = Random.Shared.Next(i);
			(arr[i], arr[j]) = (arr[j], arr[i]);
		}
	}

	/// <summary>
	/// Copies one array into another in the given range as efficiently as possible
	/// </summary>
	private static void MemCopy<T>(T[] src, T[] dest, int srcIdx, int destIdx, int count = -1)
	{
		if (count == -1) count = dest.Length - destIdx;
		
		var destSpan = new Span<T>(dest, destIdx, count);
		var srcSpan  = new ReadOnlySpan<T>(src, srcIdx, count);
		srcSpan.CopyTo(destSpan);
	}
}
