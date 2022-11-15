using System.Net;
using Microsoft.AspNetCore.Mvc;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Controllers;

public class ApiController : Controller
{
	private readonly QueueService    _queueService;
	private readonly DownloadService _downloadService;

	public ApiController(QueueService queueService, DownloadService downloadService)
	{
		_queueService    = queueService;
		_downloadService = downloadService;
	}

	// /api/ping
	public IActionResult Ping() => Ok("Pong!");

	// /api/data
	public IActionResult Data() => Json(new
	{
		//Songs      = _queueService.AllSongs,
		Submitters = _queueService.Submitters.Values.ToArray()
	});

	// /api/file/id
	public IActionResult File(string id)
	{
		if (!_downloadService.IsDownloaded(id))
			return StatusCode((int) HttpStatusCode.ServiceUnavailable, "The server does not have this file cached");

		var fileInfo = _downloadService.GetFileInfo(id);
    
    // if range processing is enabled it makes the client get very angy
		return File(fileInfo.File.OpenRead(), "audio/mpeg", enableRangeProcessing: false);
	}
}