using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server;

/// <summary>
///     Handles client requests over SignalR.
///     <c>BroadcastNext</c> is sent over this connection
///     from <see cref="CoordinatorService" />, so check there.
/// </summary>
public class SyncHub : Hub<ISyncHubClient>
{
	private readonly CoordinatorService _coordinatorService;

	public SyncHub(CoordinatorService cServ) { _coordinatorService = cServ; }

	public async Task RequestState() => await Clients.Caller.ReceiveState(new TransitSong(_coordinatorService.Current, _coordinatorService.CurrentQuote),
																	   _coordinatorService.CurrentStarted
																		  .ToUnixTimeSeconds(),
																	   new TransitSong(_coordinatorService.Next, _coordinatorService.NextQuote),
																	   _coordinatorService.CurrentEnds
																		  .ToUnixTimeSeconds() + Constants.C.BufferTime);

	public async Task RequestSeekPos()
		=> await Clients.Caller.ReceiveSeekPos(_coordinatorService.CurrentStarted.ToUnixTimeSeconds());
}

public interface ISyncHubClient
{
	Task ReceiveState(TransitSong current, long currentStarted, TransitSong next, long nextStarts);
	Task BroadcastNext(TransitSong next, long nextStarts);
	Task ReceiveSeekPos(long currentStarted);
}
