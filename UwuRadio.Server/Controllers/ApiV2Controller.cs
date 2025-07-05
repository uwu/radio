using Microsoft.AspNetCore.Mvc;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Controllers;

[Route("/api/v2")]
public class ApiV2Controller : Controller
{
	private SongStreamingService _streamingService;
	public ApiV2Controller(SongStreamingService streamingService)
	{
		_streamingService = streamingService;
	}
	

	[HttpGet("stream/{token?}")]
	public async Task<IActionResult> Stream(string? token)
	{
		if (token == null)
		{
			// no token given, the client doesn't want to sync metadata
			// just start a stream
			await _streamingService.StreamToResponse(Response);
			return Empty;
		}
		
		throw new NotImplementedException("TODO tracking of individual sessions for timing");
	}
}
