using Microsoft.AspNetCore.SignalR;
using NodaTime;

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

	private bool _haltThread;

	public Song           Current;
	public Song           Next;
	public Instant CurrentStarted;
	public Instant CurrentEnds;

	public Duration SeekPos => TimeHelpers.Now() - CurrentStarted;

	public CoordinatorService(IHubContext<SyncHub> hubCtxt, DownloadService dlService, SongDbService dbService)
	{
		_hubCtxt   = hubCtxt;
		_dlService = dlService;
		_dbService = dbService;

		Current = _dbService.SelectSong();
		Next    = _dbService.SelectSong();

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
			if (TimeHelpers.Now() >= CurrentEnds && _dlService.IsDownloaded(Next))
			{
				preloadHandled = false;

				var info = _dlService.GetFileInfo(Next);
				CurrentStarted = CurrentEnds;
				CurrentEnds    = CurrentEnds.Plus(info.Length);

				Current = Next;
				Next    = _dbService.SelectSong();
			}
			
			// handle preloading
			if (!preloadHandled && TimeHelpers.Now() >= CurrentEnds - Duration.FromSeconds(PreloadTime))
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

	public void Dispose() { _haltThread = true; }
}