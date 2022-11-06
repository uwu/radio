using Microsoft.AspNetCore.SignalR;

namespace UwuRadio.Server;

public class SyncHub : Hub
{
	public async Task Ping() => await Clients.Caller.SendAsync("Pong");
}