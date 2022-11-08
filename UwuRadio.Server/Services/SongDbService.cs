using NodaTime;

namespace UwuRadio.Server.Services;

/// <summary>
/// Keeps track of all songs and selects new songs
/// </summary>
public class SongDbService
{
	public Song[] AllSongs;
	
	private Song[] _queue;
	private int    _queuePos;

	public SongDbService()
	{
		AllSongs = LoadAllFromDisk();
		ShuffleQueue();
	}

	public Song[] LoadAllFromDisk() => throw new NotImplementedException();

	public Song SelectSong() => throw new NotImplementedException();

	public void ShuffleQueue()
	{
		var seed    = TimeHelpers.StripTime(TimeHelpers.Now()).ToUnixTimeSeconds();
		var intSeed = (int) (seed % int.MaxValue);
		var rand    = new Random(intSeed);

		// https://stackoverflow.com/a/1262619/8388655
		var list = AllSongs.ToArray(); // shallow copy
		var n    = list.Length;
		while (n > 1)
		{
			n--;
			var k     = rand.Next(n + 1);  
			(list[k], list[n]) = (list[n], list[k]);
		}

		_queue = list;
	}
}