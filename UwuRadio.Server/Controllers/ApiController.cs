using Microsoft.AspNetCore.Mvc;

namespace UwuRadio.Server.Controllers;

public class ApiController : Controller
{
	// /api/ping
	public IActionResult Ping() => Ok("Pong!");
}