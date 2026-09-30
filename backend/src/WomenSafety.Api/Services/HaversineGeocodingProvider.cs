using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Haversine-based geocoding provider for distance calculations.
/// </summary>
public class HaversineGeocodingProvider : IGeocodingProvider
{
    public double DistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // Earth radius in metres
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    public Task<(double Latitude, double Longitude)?> GeocodeAsync(string address, CancellationToken ct = default)
    {
        // Stub: in production, integrate with a geocoding API
        return Task.FromResult<(double Latitude, double Longitude)?>(null);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
