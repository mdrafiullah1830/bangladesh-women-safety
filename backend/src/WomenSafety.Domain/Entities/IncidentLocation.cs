using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class IncidentLocation
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public LocationSource Source { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
    public bool IsMoving { get; set; }
    public bool IsLastKnownFallback { get; set; }
}
