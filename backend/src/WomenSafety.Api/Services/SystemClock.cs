using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Default clock implementation using system UTC time.
/// </summary>
public class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
