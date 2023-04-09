using Serilog;
using Serilog.Events;
using UwuRadio.Server;
using UwuRadio.Server.Services;

Log.Logger = new LoggerConfiguration().MinimumLevel.Override("Microsoft", LogEventLevel.Information)
									  .MinimumLevel.Debug()
									  .WriteTo.Console()
									  .CreateBootstrapLogger();

Log.Information("Hello, world!");

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddRouting();
builder.Services.AddControllers();

// our own custom services
builder.Services.AddSingleton<DataService>();
builder.Services.AddTransient<PickerService>();
builder.Services.AddSingleton<DownloadService>();
builder.Services.AddTransient<CoordinatorService>();
builder.Services.AddSingleton<CoordServOwnerService>();

builder.Host.UseSerilog(
	(ctxt, services, cfg) => cfg.ReadFrom.Configuration(ctxt.Configuration)
								.ReadFrom.Services(services)
								.Enrich.FromLogContext()
								.Enrich.With<SourceContextEnricher>()
#if DEBUG
								.MinimumLevel.Debug()
#else
								.MinimumLevel.Information()
#endif
								.WriteTo.Console(
									 outputTemplate:
									 "[{Timestamp:HH:mm:ss} {Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}"
								 )
);

var app = builder.Build();

// https://stackoverflow.com/a/66240442/8388655
app.UseCors(
	cors => cors.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials()
);


app.MapHub<SyncHub>("/sync");
app.MapDefaultControllerRoute();

// start the services before a web req so that it starts downloading songs instantly
// we need to pass this service our service provider so it can instantiate services that are
// managed and disposed correctly
app.Services.GetService<CoordServOwnerService>()!.StartCoordinators(app.Services);

app.Run();

Log.CloseAndFlush();