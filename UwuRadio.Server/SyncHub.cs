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
	private readonly DownloadService _downloadService;

	public SyncHub(CoordinatorService cServ, DownloadService dServ)
	{
		_coordinatorService = cServ;
		_downloadService = dServ;
	}

	public async Task RequestState()
	{
		await _coordinatorService.IsReady;

		var curr = _coordinatorService.Current;
		var currLen = _downloadService.GetFileInfo(curr).Length.TotalSeconds;

		var next = _coordinatorService.Next;
		double? nextLen = _downloadService.IsDownloaded(next) ? _downloadService.GetFileInfo(next).Length.TotalSeconds : null;

		await Clients.Caller.ReceiveState(
			new TransitSong(curr, _coordinatorService.CurrentQuote, currLen),
			_coordinatorService.CurrentStarted.ToUnixTimeSeconds(),
			new TransitSong(next, _coordinatorService.NextQuote, nextLen),
			_coordinatorService.CurrentEnds.ToUnixTimeSeconds() + Constants.C.BufferTime
		);
	}

	public async Task RequestSeekPos()
	{
		await _coordinatorService.IsReady;
		await Clients.Caller.ReceiveSeekPos(_coordinatorService.CurrentStarted.ToUnixTimeSeconds());
	}
}

public interface ISyncHubClient
{
	Task ReceiveState(TransitSong current, long currentStarted, TransitSong next, long nextStarts);
	Task BroadcastNext(TransitSong next, long nextStarts);
	Task ReceiveSeekPos(long currentStarted);
	Task ReceiveStreamStartedAt(double startTime);
}
