namespace UwuRadio.Server.Services;

/// <summary>
///     Selects new songs
/// </summary>
public class PickerService
{
	private readonly DataService _dataService;
	private readonly Random      _rand             = new();
	private readonly string?[]   _recentArtists    = new string[5];
	private readonly string?[]   _recentSubmitters = new string[2];
	
	public PickerService(DataService dataService) => _dataService = dataService;

	public Song SelectSong()
	{
		Song picked;
		do
		{
			picked = _dataService.Songs[_rand.Next(_dataService.Songs.Length)];
			// These darn humans are too good at spotting patterns where there are none!
		} while (_recentArtists.Contains(picked.Artist) || _recentSubmitters.Contains(picked.Submitter));

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
