using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;
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

	// /api/ping
	public IActionResult Ping() => Ok("Pong!");

	// /api/time
	public IActionResult Time() => Json(Helpers.Now().ToUnixTimeSeconds());

	// /api/data
	public IActionResult Data() => Json(new
	{
		//Songs      = _dataService.AllSongs,
		Submitters = _dataService.Submitters.Values.ToArray()
	});

	// /api/file/id
	public IActionResult File(string id)
	{
		if (!_downloadService.IsDownloaded(id))
			return StatusCode((int) HttpStatusCode.ServiceUnavailable, "The server does not have this file cached");

		var fileInfo = _downloadService.GetFileInfo(id);

		// check ETag to facilitate caching
		if (Request.Headers.IfNoneMatch.FirstOrDefault() == ('"' + fileInfo.Md5 + '"'))
			return StatusCode(StatusCodes.Status304NotModified);

		// if range processing is enabled it makes the client get very angy
		return File(
				    fileInfo.File.OpenRead(),
				    "audio/mpeg",
				    null,
				    new EntityTagHeaderValue(new StringSegment('"' + fileInfo.Md5 + '"')),
				    false);
	}
}
