using System.Text.Json;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Add MVC controllers
builder.Services.AddControllers();

var app = builder.Build();

// Map attribute-routed controllers
app.MapControllers();

app.Run();
