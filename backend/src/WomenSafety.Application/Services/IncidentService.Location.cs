using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class IncidentService
{
    public async Task<bool> AddLocationAsync(
        Guid userId, Guid incidentId, AddIncidentLocationRequest request, CancellationToken ct)
    {
        var incident = await _db.Incidents
            .FirstOrDefaultAsync(i => i.Id == incidentId && i.UserId == userId, ct);
        if (incident is null) return false;

        var source = Enum.TryParse<LocationSource>(request.Source, true, out var parsed)
            ? parsed : LocationSource.GPS;

        _db.IncidentLocations.Add(new IncidentLocation
        {
            Id = Guid.NewGuid(), IncidentId = incidentId,
            Latitude = request.Latitude, Longitude = request.Longitude,
            AccuracyMeters = request.AccuracyMeters, Source = source,
            RecordedAt = _clock.UtcNow, IsMoving = request.IsMoving,
            IsLastKnownFallback = false
        });

        incident.LastLatitude = request.Latitude;
        incident.LastLongitude = request.Longitude;
        incident.LastAccuracyMeters = request.AccuracyMeters;
        incident.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private async Task<District?> FindNearestDistrictAsync(double lat, double lon, CancellationToken ct)
    {
        var districts = await _db.Districts
            .Where(d => d.CenterLatitude != null && d.CenterLongitude != null)
            .ToListAsync(ct);
        if (districts.Count == 0) return null;

        return districts
            .OrderBy(d => HaversineDistance(lat, lon, d.CenterLatitude!.Value, d.CenterLongitude!.Value))
            .FirstOrDefault();
    }

    private static double HaversineDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000;
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
