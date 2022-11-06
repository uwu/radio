using UwuRadio.Server;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddCors();
builder.Services.AddRouting();

var app = builder.Build();

// https://stackoverflow.com/a/66240442/8388655
app.UseCors(cors => cors.AllowAnyHeader().AllowAnyMethod().SetIsOriginAllowed(_ => true).AllowCredentials());

app.UseRouting();

app.UseEndpoints(endpoints => { endpoints.MapHub<SyncHub>("/sync"); });

app.Run();