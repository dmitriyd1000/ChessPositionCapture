using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/overlay-bounds")]
public class OverlaySettingsController(IWebHostEnvironment env) : ControllerBase
{
    public record OverlayBoundsDto(int X, int Y, int Width, int Height);

    [HttpGet]
    public ActionResult<OverlayBoundsDto> Get([FromServices] IConfiguration cfg)
    {
        var dto = new OverlayBoundsDto(
            cfg.GetValue<int>("OverlayBounds:X"),
            cfg.GetValue<int>("OverlayBounds:Y"),
            cfg.GetValue<int>("OverlayBounds:Width"),
            cfg.GetValue<int>("OverlayBounds:Height")
        );
        return Ok(dto);
    }

    private static readonly object FileLock = new();

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] OverlayBoundsDto dto)
    {
        if (dto is null || dto.Width <= 0 || dto.Height <= 0)
            return BadRequest("Invalid bounds");

        var appsettingsPath = Path.Combine(env.ContentRootPath, "appsettings.json");

        Dictionary<string, object> root;
        if (System.IO.File.Exists(appsettingsPath))
        {
            var json = await System.IO.File.ReadAllTextAsync(appsettingsPath);
            root = JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new();
        }
        else
        {
            root = new();
        }

        root["OverlayBounds"] = dto;
        var updatedJson = JsonSerializer.Serialize(root, new JsonSerializerOptions { WriteIndented = true });

        // Atomic write with lock and retry to avoid external readers conflicts
        var tempPath = appsettingsPath + ".tmp";
        lock (FileLock)
        {
            System.IO.File.WriteAllText(tempPath, updatedJson);
            System.IO.File.Move(tempPath, appsettingsPath, overwrite: true);
        }

        return Ok(dto);
    }
}

