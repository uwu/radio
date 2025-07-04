using UwuRadio.Server;
using UwuRadio.Server.Services;

Helpers.Log(null, "Hello, world!");

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddRouting();
builder.Services.AddControllers();

// our own custom services
builder.Services.AddSingleton<DataService>();
builder.Services.AddSingleton<PickerService>();
builder.Services.AddSingleton<DownloadService>();
builder.Services.AddSingleton<CoordinatorService>();
builder.Services.AddSingleton<SongStreamingService>();

var app = builder.Build();

// UwuRadio.Server --cache-all
// debug tool that downloads all songs in ingest.
#if DEBUG
if (args.Contains("--cache-all"))
{
	Helpers.Log("debug cache-all", "Starting full ingest cache...");
	var dataSrv = app.Services.GetService<DataService>()!;
	var dlSrv   = app.Services.GetService<DownloadService>()!;

	foreach (var song in dataSrv.Songs) dlSrv.EnsureDownloaded(song);

	foreach (var (song, idx) in dataSrv.Songs.Select((s, idx) => (s, idx)))
	{
		while (!dlSrv.IsDownloaded(song) && !dlSrv.IsBlacklisted(song))
			// lol this makes the entire program wrapped in an async state machine in debug builds :)
			await Task.Delay(100);
		
		Helpers.Log("debug cache-all", $"downloaded: {idx + 1} of {dataSrv.Songs.Length}");
	}
	
	Helpers.Log("debug cache-all", "successfully downloaded all songs");
	
	return;
}
#endif

// https://stackoverflow.com/a/66240442/8388655
app.UseCors(cors => cors.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials());

app.UseRouting();

app.UseEndpoints(endpoints =>
{
	endpoints.MapHub<SyncHub>("/sync");
	endpoints.MapDefaultControllerRoute();
});

// start the services way before they're technically needed so that it starts downloading instantly
// to clarify: without this, the server would sit until someone tried to listen, then cold-start.
app.Services.GetService<CoordinatorService>();

Helpers.Log(null, "Kickstarted services successfully, starting web server now");

app.Run();
