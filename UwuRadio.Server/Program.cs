using UwuRadio.Server;
using UwuRadio.Server.Services;

Helpers.Log(null, "Hello, world!");

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddRouting();
builder.Services.AddControllers();

// our own custom services
builder.Services.AddSingleton<RandomService>();
builder.Services.AddSingleton<DataService>();
builder.Services.AddTransient<PickerService>();
builder.Services.AddSingleton<DownloadService>();
builder.Services.AddTransient<CoordinatorService>();
builder.Services.AddSingleton<CoordServOwnerService>();

var app = builder.Build();

// https://stackoverflow.com/a/66240442/8388655
app.UseCors(cors => cors.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials());


app.MapHub<SyncHub>("/sync");
app.MapDefaultControllerRoute();

// start the services before a web req so that it starts downloading songs instantly
// we need to pass this service our serviceprovider so it can instantiate services that are
// managed and disposed correctly
app.Services.GetService<CoordServOwnerService>()!.StartCoordinators(app.Services);

Helpers.Log(null, "Kickstarted services successfully, starting web server now");

app.Run();
