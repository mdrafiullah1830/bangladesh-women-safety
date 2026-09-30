using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Generates OpenStreetMap links. In production, map tile provider attribution is required.
/// </summary>
public class OsmMapProvider : IMapProvider
{
    public string BuildLocationLink(double latitude, double longitude, double? accuracyMeters = null)
    {
        return $"https://www.openstreetmap.org/?mlat={latitude}&mlon={longitude}#map=16/{latitude}/{longitude}";
    }
}
