using System.Net;
using Microsoft.AspNetCore.Mvc;
using UwuRadio.Server.Services;

namespace UwuRadio.Server.Controllers;

public class ApiController : Controller
{
	private readonly DownloadService _downloadService;
	private readonly DataService     _dataService;

	public ApiController(DataService dataService, DownloadService downloadService)
	{
		_dataService     = dataService;
		_downloadService = downloadService;
	}

	// /api/time
	public IActionResult Time() => Ok(Helpers.Now().ToUnixTimeSeconds());

	// /api/data
	public IActionResult Data() => Json(
		new
		{
			Submitters = _dataService.Submitters.Values.ToArray(),
			Channels = _dataService.Channels.Values
				.Select(c => c with { Songs = Array.Empty<Song>() })
				.ToArray(),
		}
	);

	// /api/file/id
	public IActionResult File(string id)
	{
		if (!_downloadService.IsDownloaded(id))
			return StatusCode((int) HttpStatusCode.ServiceUnavailable, "The server does not have this file cached");

		var fileInfo = _downloadService.GetFileInfo(id);

		// if range processing is enabled it makes the client get very angy
		return File(fileInfo.File.OpenRead(), "audio/mpeg", false);
	}
}
