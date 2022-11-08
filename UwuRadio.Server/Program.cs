using UwuRadio.Server;
using UwuRadio.Server.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddRouting();
builder.Services.AddControllers();

// our own custom services
builder.Services.AddSingleton<QueueService>();
builder.Services.AddSingleton<DownloadService>();
builder.Services.AddSingleton<CoordinatorService>();

var app = builder.Build();

// https://stackoverflow.com/a/66240442/8388655
app.UseCors(cors => cors.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials());

app.UseRouting();

app.UseEndpoints(endpoints =>
{
	endpoints.MapHub<SyncHub>("/sync");
	endpoints.MapDefaultControllerRoute();
});

app.Run();