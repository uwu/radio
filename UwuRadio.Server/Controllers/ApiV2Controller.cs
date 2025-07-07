using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Controllers;

[Route("/api/v2")]
public class ApiV2Controller : Controller
{
	private readonly SongStreamingService _streamingService;
	private readonly IHubContext<SyncHub, ISyncHubClient> _hubCtxt;

  public ApiV2Controller(SongStreamingService streamingService, IHubContext<SyncHub, ISyncHubClient> hubCtxt)
  {
	_streamingService = streamingService;
	_hubCtxt = hubCtxt;
  }


  [HttpGet("stream/{token?}")]
	public async Task<IActionResult> Stream(string? token)
	{
		await _streamingService.StreamToResponse(Response, () =>
		{
			if (token != null)
				_hubCtxt.Clients.Client(token).ReceiveStreamStartedAt(Helpers.Now().ToUnixTimeTicks() / (1000.0 * 10_000.0));
		});
		return Empty;
	}
}
