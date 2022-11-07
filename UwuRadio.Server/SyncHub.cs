using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server;

public class SyncHub : Hub
{
	private CoordinatorService _coordinatorService;
	
	public SyncHub(CoordinatorService cserv)
	{
		_coordinatorService = cserv;
	}

	public async Task Ping() => await Clients.Caller.SendAsync("Pong");
}