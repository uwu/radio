using Microsoft.AspNetCore.SignalR;
using NodaTime;

namespace UwuRadio.Server.Services;

/// <summary>
///     Keeps track of state and controls the queue advancing, starting downloads, etc.
/// </summary>
public class CoordinatorService : IDisposable
{
	private readonly DownloadService      _dlService;
	private readonly IHubContext<SyncHub> _hubCtxt;
	private readonly PickerService        _pickerService;

	private bool _haltThread;

	public string? Channel;

	private string PrettyOwnName => nameof(CoordinatorService) + " - " + (Channel ?? "<global>");
	
	public Song    Current = null!;
	public Instant CurrentEnds;
	public Instant CurrentStarted;
	public Song    Next = null!;

	public CoordinatorService(IHubContext<SyncHub> hubCtxt,       DownloadService       dlService,
							  PickerService        pickerService, CoordServOwnerService owner)
	{
		_hubCtxt       = hubCtxt;
		_dlService     = dlService;
		_pickerService = pickerService;

		// run this explicitly on another thread
		Task.Run(() => StartBgThread(owner));
	}

	public void Dispose()
	{
		_haltThread = true;
		Helpers.Log(PrettyOwnName, "Disposed");
	}

	private async Task StartBgThread(CoordServOwnerService owner)
	{
		if (_haltThread) return;

		// its non-ideal doing this here but
		// i need all of the services to be started before this is called
		InitSongs(owner);

		// poll for the very first song to be downloaded and ready
		await WaitForReady();

		if (_haltThread) return;
		
		CurrentStarted = Helpers.Now();
		CurrentEnds    = CurrentStarted + _dlService.GetFileInfo(Current).Length;

		await _hubCtxt.Clients.All.SendAsync("ReceiveState",
											 new TransitSong(Current),
											 CurrentStarted.ToUnixTimeSeconds(),
											 new TransitSong(Next),
											 CurrentEnds.ToUnixTimeSeconds()
										   + Constants.C.BufferTime);

		Helpers.Log(PrettyOwnName, "Ready to serve clients");

		await MainLoop();
	}

	private void InitSongs(CoordServOwnerService owner)
	{
		Channel = owner.GetOwnChannel(this);
		_pickerService.Channel = Channel;

		Current = _pickerService.SelectSong();
		Next    = _pickerService.SelectSong();

		_dlService.EnsureDownloaded(Current);
		_dlService.EnsureDownloaded(Next);
	}
	
	private async Task WaitForReady()
	{
		while (!_haltThread && !(_dlService.IsDownloaded(Current) || _dlService.IsBlacklisted(Current)))
		{
			if (_dlService.IsBlacklisted(Current))
			{
				Current = _pickerService.SelectSong();
				_dlService.EnsureDownloaded(Current);
			}

			await Task.Delay(1000);
		}
	}

	private async Task MainLoop()
	{
		var preloadHandled = false;

		while (!_haltThread)
		{
			// this lives at the top so we can just use continue; to return to idle state from anywhere.
			await Task.Delay(1000);

			// if there is a blacklisted song, keep skipping until a song downloads
			if (_dlService.IsBlacklisted(Next))
			{
				Helpers.Log(PrettyOwnName, "Encountered blacklisted song, skipping it!");

				Next = _pickerService.SelectSong();
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

				Current = Next;
				Next    = _pickerService.SelectSong();

				// clients are only told about the next when we need to handle preloading
				// however we will *need* to know the length of the song and be able to serve it at preload time
				// so its good for us to get a healthy head start - most likely 3-5 minutes!
				// also makes it feasible to use really really slow hosts such as niconico
				_dlService.EnsureDownloaded(Next);

				Helpers.Log(PrettyOwnName,
						    $"Aadvanced queue, current song: {Current.Name}, next song: {Next.Name}");

				continue;
			}

			// handle preloading
			if (!preloadHandled && Helpers.Now()
			 >= CurrentEnds - Duration.FromSeconds(Constants.C.PreloadTime))
			{
				preloadHandled = true;
				await _hubCtxt.Clients.All.SendAsync(
					"BroadcastNext",
					new TransitSong(Next),
					CurrentEnds.ToUnixTimeSeconds() + Constants.C.BufferTime,
					Channel
				);

				Helpers.Log(PrettyOwnName, $"Broadcasted next song ({Next.Name}) to clients");

				continue;
			}
		}
	}
}
