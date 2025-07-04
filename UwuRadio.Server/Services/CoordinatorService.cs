using Microsoft.AspNetCore.SignalR;
using NodaTime;

namespace UwuRadio.Server.Services;

/// <summary>
///     Keeps track of state and controls the queue advancing, starting downloads, etc.
/// </summary>
public class CoordinatorService : IDisposable
{
	private readonly DownloadService                      _dlService;
	private readonly IHubContext<SyncHub, ISyncHubClient> _hubCtxt;
	private readonly PickerService                        _pickerService;
	private readonly SongStreamingService                 _streamingService;

	private bool _haltThread;

	public Song    Current;
	public Instant CurrentEnds;
	public Instant CurrentStarted;
	public Song    Next;

	public string? CurrentQuote;
	public string? NextQuote;

	public CoordinatorService(IHubContext<SyncHub, ISyncHubClient> hubCtxt, DownloadService dlService, PickerService pickerService, SongStreamingService streamingService)
	{
		_hubCtxt          = hubCtxt;
		_dlService        = dlService;
		_pickerService    = pickerService;
		_streamingService = streamingService;

		(Current, CurrentQuote) = _pickerService.SelectSong();
		(Next, NextQuote)       = _pickerService.SelectSong();

		// run this explicitly on another thread
		Task.Run(StartBgThread);
	}

	public void Dispose()
	{
		_haltThread = true; 
		Helpers.Log(nameof(CoordinatorService), "Disposed");
	}

	private async Task StartBgThread()
	{
		_dlService.EnsureDownloaded(Current);
		_dlService.EnsureDownloaded(Next);

		// poll for the very first song to be downloaded and ready
		while (!_haltThread && !_dlService.IsDownloaded(Current))
			await Task.Delay(1000);

		CurrentStarted = Helpers.Now();
		CurrentEnds    = CurrentStarted + _dlService.GetFileInfo(Current).Length;

		await _hubCtxt.Clients.All.ReceiveState(new TransitSong(Current, CurrentQuote),
												CurrentStarted.ToUnixTimeSeconds(),
												new TransitSong(Next, NextQuote),
												CurrentEnds.ToUnixTimeSeconds() + Constants.C.BufferTime);
		
		// start streaming service
		_streamingService.PushNextSong(Current);

		var preloadHandled = false;

		Helpers.Log(nameof(CoordinatorService), "Ready to serve clients");
		
		while (!_haltThread)
		{
			// this lives at the top so we can just use continue; to return to idle state from anywhere.
			await Task.Delay(1000);
			
			// if there is a blacklisted song, keep skipping until a song downloads
			if (_dlService.IsBlacklisted(Next))
			{
				Helpers.Log(nameof(CoordinatorService), "Encountered blacklisted song, skipping it!");

				(Next, NextQuote) = _pickerService.SelectSong();
				_dlService.EnsureDownloaded(Next);

				// wait for the song to either succeed or fail to download
				// the loop *probably* shouldn't be blocked for this but its an unlikely code path
				// and the state to mutex this isnt worth it
				while (!_dlService.IsDownloaded(Next) && !_dlService.IsBlacklisted(Next))
					await Task.Delay(100);
				
				continue;
			}
			
			// handle advancing song
			if (Helpers.Now() >= CurrentEnds)
			{
				// we need this to be downloaded for the song length.
				while (!_dlService.IsDownloaded(Next) && !_dlService.IsBlacklisted(Next))
					await Task.Delay(100);

				if (_dlService.IsBlacklisted(Next)) continue;
				
				preloadHandled = false;

				var info = _dlService.GetFileInfo(Next);
				CurrentStarted = CurrentEnds;
				CurrentEnds    = CurrentEnds.Plus(info.Length);

				Current           = Next;
				CurrentQuote      = NextQuote;
				(Next, NextQuote) = _pickerService.SelectSong();

				// clients are only told about the next when we need to handle preloading
				// however we will *need* to know the length of the song and be able to serve it at preload time
				// so its good for us to get a healthy head start - most likely 3-5 minutes!
				// also makes it feasible to use really really slow hosts such as niconico
				_dlService.EnsureDownloaded(Next);

				Helpers.Log(nameof(CoordinatorService),
							$"Advanced queue, current song: {Current.Name}, next song: {Next.Name}");

				continue;
			}

			// handle preloading
			if (!preloadHandled && Helpers.Now() >= CurrentEnds - Duration.FromSeconds(Constants.C.PreloadTime))
			{
				preloadHandled = true;
				await _hubCtxt.Clients.All.BroadcastNext(new TransitSong(Next, NextQuote),
														 CurrentEnds.ToUnixTimeSeconds() + Constants.C.BufferTime);
				
				Helpers.Log(nameof(CoordinatorService), $"Broadcast next song ({Next.Name}) to clients");
				
				_streamingService.PushNextSong(Next);
				
				continue;
			}
		}
	}
}
