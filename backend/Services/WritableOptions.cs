using System.Text.Json;
using backend.Interfaces;
using Microsoft.Extensions.Options;

namespace backend.Services;

public class WritableOptions<T> : IWritableOptions<T> where T : class, new()
{
    private readonly IWebHostEnvironment _environment;
    private readonly IOptionsMonitor<T> _options;
    private readonly string _section;
    private readonly string _file;

    public WritableOptions(
        IWebHostEnvironment environment,
        IOptionsMonitor<T> options,
        string section,
        string file = "appsettings.json")
    {
        _environment = environment;
        _options = options;
        _section = section;
        _file = file;
    }

    public T Value => _options.CurrentValue;
    public T Get(string name) => _options.Get(name);

    public void Update(Action<T> applyChanges)
    {
        var fileProvider = _environment.ContentRootFileProvider;
        var fileInfo = fileProvider.GetFileInfo(_file);
        var physicalPath = fileInfo.PhysicalPath;

        var jObject = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            File.ReadAllText(physicalPath));

        var sectionObject = jObject.TryGetValue(_section, out var section)
            ? JsonSerializer.Deserialize<T>(section.GetRawText())
            : Value ?? new T();

        applyChanges(sectionObject);

        jObject[_section] = JsonSerializer.SerializeToElement(sectionObject);

        File.WriteAllText(physicalPath, JsonSerializer.Serialize(jObject, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }
}