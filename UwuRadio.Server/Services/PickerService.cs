namespace UwuRadio.Server.Services;

/// <summary>
///     Selects new songs
/// </summary>
public class PickerService
{
	private readonly DataService   _dataService;
	private readonly RandomService _randomService;
	private readonly string?[]     _recentArtists    = new string[5];
	private readonly string?[]     _recentSubmitters = new string[2];

	public string? Channel;
	
	private string PrettyOwnName => nameof(PickerService) + " - " + (Channel ?? "<global>");

	public PickerService(DataService dataService, RandomService randomService)
	{
		_dataService   = dataService;
		_randomService = randomService;
	}

	public Song SelectSong()
	{
		var pool = Channel == null
					   ? _dataService.GlobalSongs
					   : _dataService.Channels[Channel].Songs;
		
		var failsafe = 0;
		
		Song picked;

		bool FailsafeCheck()     => failsafe++ < 1000;
		bool RecentArtistCheck() => _recentArtists.Contains(picked.Artist);

		bool RecentSubmitterCheck()
			=> Channel == null && _recentSubmitters.Contains(picked.Submitter);

		do
		{
			picked = pool[_randomService.Next(pool.Length)];
			// These darn humans are too good at spotting patterns where there are none!
		} while ((RecentArtistCheck() || RecentSubmitterCheck()) && FailsafeCheck());

		if (failsafe > 1000)
			Helpers.Log(PrettyOwnName, "hit infinite loop failsafe!");
		
		Shift(_recentArtists,    picked.Artist);
		Shift(_recentSubmitters, picked.Submitter);

		return picked;
	}

	private static void Shift<T>(IList<T?> arr, T item)
	{
		for (var i = 0; i < arr.Count; i++)
			if (arr[i] == null)
			{
				arr[i] = item;
				return;
			}

		for (var i = 0; i < arr.Count - 1; i++)
			arr[i] = arr[i + 1];

		arr[^1] = item;
	}
}
