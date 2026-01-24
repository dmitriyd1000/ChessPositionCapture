using Microsoft.Extensions.Options;

namespace backend.Interfaces;

public interface IWritableOptions<T> : IOptionsSnapshot<T> where T : class, new()
{
    void Update(Action<T> applyChanges);
}