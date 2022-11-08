namespace UwuRadio.Server.Services;

/// <summary>
/// Keeps track of all songs and selects new songs
/// </summary>
public class QueueService
{
	public Song[] AllSongs;
	
	private readonly Random _rand = new();
	
	private readonly Song[] _queue;
	private          int    _queuePos;

	public QueueService()
	{
		AllSongs = LoadAllFromDisk();
		_queue   = AllSongs;
		ShuffleQueue();
	}

	private Song[] LoadAllFromDisk() => throw new NotImplementedException();

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