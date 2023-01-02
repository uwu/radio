using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server;

/// <summary>
///     Handles client requests over SignalR.
///     <c>BroadcastNext</c> is sent over this connection
///     from <see cref="CoordinatorService" />, so check there.
/// </summary>
public class SyncHub : Hub
{
	private readonly CoordServOwnerService _ownerService;

	public SyncHub(CoordServOwnerService cServ) => _ownerService = cServ;

	public async Task RequestState()
	{
		// TODO: support channels correctly
		var service = _ownerService.GetServiceByChannel();
		
		await Clients.Caller.SendAsync("ReceiveState",
									   new TransitSong(service.Current),
									   service.CurrentStarted.ToUnixTimeSeconds(),
									   new TransitSong(service.Next),
									   service.CurrentEnds.ToUnixTimeSeconds()
									 + Constants.C.BufferTime);
	}

	public async Task RequestSeekPos() => await Clients.Caller.SendAsync("ReceiveSeekPos",
											  _ownerService.GetServiceByChannel()
														   .CurrentStarted
														   .ToUnixTimeSeconds());
}
