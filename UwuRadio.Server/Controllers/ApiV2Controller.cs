using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Controllers;

[Route("/api/v2")]
public class ApiV2Controller : Controller
{
	private readonly SongStreamingService _streamingService;
	private readonly CoordinatorService _coord;

	private readonly IHubContext<SyncHub, ISyncHubClient> _hubCtxt;

	private readonly IHostApplicationLifetime _lifetime;

  public ApiV2Controller(SongStreamingService streamingService, IHubContext<SyncHub, ISyncHubClient> hubCtxt, IHostApplicationLifetime lifetime, CoordinatorService coord)
  {
	_streamingService = streamingService;
	_hubCtxt = hubCtxt;
	_lifetime = lifetime;
	_coord = coord;
  }


  [HttpGet("stream/{token?}")]
	public async Task<IActionResult> Stream(string? token)
	{
		await _coord.IsReady;

		var tokenSrc = new CancellationTokenSource();
		HttpContext.RequestAborted.Register(() => tokenSrc.Cancel());
		_lifetime.ApplicationStopping.Register(() => tokenSrc.Cancel());

		await _streamingService.StreamToResponse(Response, tokenSrc.Token, () =>
		{
			if (token != null)
				_hubCtxt.Clients.Client(token).ReceiveStreamStartedAt(Helpers.Now().ToUnixTimeTicks() / (1000.0 * 10_000.0));
		});
		return Empty;
	}
}
