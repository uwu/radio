using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server;

/// <summary>
///     Handles client requests over SignalR.
///     <c>BroadcastNext</c> is sent over this connection
///     from <see cref="CoordinatorService" />, so check there.
/// </summary>
[SuppressMessage("ReSharper", "UnusedMember.Global")]
public class SyncHub : Hub
{
	private readonly CoordServOwnerService _ownerService;

	public SyncHub(CoordServOwnerService cServ) => _ownerService = cServ;

	public async Task RequestState(string? channel = null)
	{
		var service = _ownerService.GetServiceByChannel(channel);

		await Clients.Caller.SendAsync(
			"ReceiveState",
			new TransitSong(service.Current),
			service.CurrentStarted.ToUnixTimeSeconds(),
			new TransitSong(service.Next),
			service.CurrentEnds.ToUnixTimeSeconds() + Constants.C.BufferTime,
			service.Channel
		);
	}
}
