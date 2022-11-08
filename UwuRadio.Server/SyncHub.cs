using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server;

/// <summary>
/// Handles client requests over SignalR.
/// <c>BroadcastNext</c> is sent over this connection
/// from <see cref="CoordinatorService"/>, so check there.
/// </summary>
public class SyncHub : Hub
{
	private readonly CoordinatorService _coordinatorService;
	private readonly DownloadService    _dlService;

	public SyncHub(CoordinatorService cServ, DownloadService dServ)
	{
		_coordinatorService = cServ;
		_dlService          = dServ;
	}

	public async Task RequestState()
	{
		var current = _coordinatorService.Current;
		var next    = _coordinatorService.Next;

		_dlService.AttachUrl(ref current);
		_dlService.AttachUrl(ref next);

		await Clients.Caller.SendAsync("ReceiveState",
									   current,
									   next,
									   _coordinatorService.CurrentStarted.ToUnixTimeSeconds());
	}

	public async Task RequestSeekPos()
		=> await Clients.Caller.SendAsync("ReceiveSeekPos", _coordinatorService.CurrentStarted.ToUnixTimeSeconds());
}