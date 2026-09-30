using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class ResponderAssignment
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Guid ResponderId { get; set; }
    public ResponderAssignmentStatus Status { get; set; }
    public NearbyAlertPrecision InformationShared { get; set; }
    public int ReportedDistanceMeters { get; set; }
    public DateTimeOffset AlertedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
