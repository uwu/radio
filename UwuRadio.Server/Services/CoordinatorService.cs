using Microsoft.AspNetCore.SignalR;
using NodaTime;

namespace UwuRadio.Server.Services;

/// <summary>
/// Keeps track of state and controls the queue advancing, starting downloads, etc.
/// </summary>
public class CoordinatorService : IDisposable
{
	private readonly IHubContext<SyncHub> _hubCtxt;
	private readonly DownloadService      _dlService;
	private readonly QueueService        _queueService;

	private bool _haltThread;

	public Song    Current;
	public Song    Next;
	public Instant CurrentStarted;
	public Instant CurrentEnds;

	public CoordinatorService(IHubContext<SyncHub> hubCtxt, DownloadService dlService, QueueService queueService)
	{
		_hubCtxt   = hubCtxt;
		_dlService = dlService;
		_queueService = queueService;

		Current = _queueService.SelectSong();
		Next    = _queueService.SelectSong();

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
			if (Helpers.Now() >= CurrentEnds && _dlService.IsDownloaded(Next))
			{
				preloadHandled = false;

				var info = _dlService.GetFileInfo(Next);
				CurrentStarted = CurrentEnds;
				CurrentEnds    = CurrentEnds.Plus(info.Length);

				Current = Next;
				Next    = _queueService.SelectSong();
				
				// clients are only told about the next when we need to handle preloading
				// however we will *need* to know the length of the song and be able to serve it at preload time
				// so its good for us to get a healthy head start - most likely 3-5 minutes!
				// also makes it feasible to use really really slow hosts such as niconico
				_dlService.EnsureDownloaded(Next);
			}
			
			// handle preloading
			else if (!preloadHandled && Helpers.Now() >= CurrentEnds - Duration.FromSeconds(Constants.PreloadTime))
			{
				preloadHandled = true;
				await _hubCtxt.Clients.All.SendAsync("BroadcastNext",
													 Next,
													 CurrentEnds.ToUnixTimeSeconds() + Constants.BufferTime);
			}

			// poll slowly, be chill on the CPU :D
			await Task.Delay(1000);
		}
	}

	public void Dispose() { _haltThread = true; }
}