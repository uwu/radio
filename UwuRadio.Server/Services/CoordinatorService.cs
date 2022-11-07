using Microsoft.AspNetCore.SignalR;

namespace UwuRadio.Server.Services;

/// <summary>
/// Keeps track of state and controls the queue advancing, starting downloads, etc.
/// </summary>
public class CoordinatorService : IDisposable
{
	/// <summary>
	///  Time between this song ending and the next being queued to start
	/// </summary>
	public const int BufferTime = 1;

	/// <summary>
	/// Time remaining when the next song should be broadcasted for preloading
	/// </summary>
	public const int PreloadTime = 30;

	private readonly IHubContext<SyncHub> _hubCtxt;
	private readonly DownloadService      _dlService;
	private readonly SongDbService        _dbService;

	private bool _haltThread     = false;

	public string[] LastFiveArtists = { "", "", "", "", "" };

	public Song           Current;
	public Song           Next;
	public DateTimeOffset CurrentStarted;
	public DateTimeOffset CurrentEnds;

	public TimeSpan SeekPos => DateTimeOffset.UtcNow.Subtract(CurrentStarted);

	public CoordinatorService(IHubContext<SyncHub> hubCtxt, DownloadService dlService, SongDbService dbService)
	{
		_hubCtxt   = hubCtxt;
		_dlService = dlService;
		_dbService = dbService;

		Current = _dbService.SelectSong(LastFiveArtists);
		PushArtist(Current.Artist);
		Next = _dbService.SelectSong(LastFiveArtists);
		PushArtist(Next.Artist);

		// run this explicitly on another thread
		Task.Run(StartBgThread);
	}

	private async Task StartBgThread()
	{
		_dlService.EnsureDownloaded(Current);

		// poll for the very first song to be downloaded and ready
		while (!_haltThread && !_dlService.IsDownloaded(Current))
			await Task.Delay(1000);

		var preloadHandled = false;
		
		while (!_haltThread)
		{
			// handle advancing song
			if (DateTimeOffset.UtcNow >= CurrentEnds && _dlService.IsDownloaded(Next))
			{
				preloadHandled = false;

				var info = _dlService.GetFileInfo(Next);
				CurrentStarted = CurrentEnds;
				CurrentEnds    = CurrentEnds.Add(info.length);

				Current = Next;
				Next    = _dbService.SelectSong(LastFiveArtists);
				PushArtist(Next.Artist);
			}
			
			// handle preloading
			if (!preloadHandled && DateTimeOffset.UtcNow >= CurrentEnds.Subtract(new TimeSpan(0, 0, 0, PreloadTime)))
			{
				preloadHandled = true;
				_dlService.EnsureDownloaded(Next);
				await _hubCtxt.Clients.All.SendAsync("BroadcastNext",
													 Next,
													 CurrentEnds.ToUnixTimeSeconds() + BufferTime);
			}

			await Task.Delay(1000);
		}
	}

	private void PushArtist(string artist)
	{
		LastFiveArtists = new[]
		{
			artist,
			LastFiveArtists[0],
			LastFiveArtists[1],
			LastFiveArtists[2],
			LastFiveArtists[3],
		};
	}

	public void Dispose() { _haltThread = true; }
}