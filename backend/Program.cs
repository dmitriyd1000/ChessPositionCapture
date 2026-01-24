using backend;
using backend.Interfaces;
using backend.Services;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true);

builder.Services.Configure<AppSettings>(
    builder.Configuration.GetSection(nameof(AppSettings)));

builder.Services.AddTransient<IWritableOptions<AppSettings>>(provider =>
{
    var environment = provider.GetRequiredService<IWebHostEnvironment>();
    var options = provider.GetRequiredService<IOptionsMonitor<AppSettings>>();
    return new WritableOptions<AppSettings>(environment, options, AppSettings.SectionName);
});

// Register services
builder.Services.AddScoped<RecognizerService>();

// Add MVC controllers
builder.Services.AddControllers();

var app = builder.Build();

// Map attribute-routed controllers
app.MapControllers();

app.Run();
