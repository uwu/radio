namespace UwuRadio.Server.Services;

/// <summary>
///     Selects new songs
/// </summary>
public class PickerService
{
	private readonly DataService _dataService;
	private readonly Random      _rand          = new();
	private readonly string?[]   _recentArtists = new string[5];
	
	public PickerService(DataService dataService) => _dataService = dataService;

	public Song SelectSong()
	{
		Song picked;
		do
		{
			picked = _dataService.Songs[_rand.Next(_dataService.Songs.Length)];
			// These darn humans are too good at spotting patterns where there are none!
		} while (_recentArtists.Contains(picked.Artist));

		ShiftRecentArtists(picked.Artist);
		
		return picked;
	}

	private void ShiftRecentArtists(string artist)
	{
		for (var i = 0; i < _recentArtists.Length; i++)
			if (_recentArtists[i] == null)
			{
				_recentArtists[i] = artist;
				return;
			}

		for (var i = 0; i < _recentArtists.Length - 1; i++)
			_recentArtists[i] = _recentArtists[i + 1];

		_recentArtists[^1] = artist;
	}
}
