using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class EmergencyContactAttempt
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Guid TrustedContactId { get; set; }
    public string ContactDisplayNameSnapshot { get; set; } = string.Empty;
    public string ContactPhoneSnapshotMasked { get; set; } = string.Empty;
    public string? RelationshipSnapshot { get; set; }
    public string? Channel { get; set; }
    public DateTimeOffset AttemptedAt { get; set; }
    public NearbyAlertPrecision LocationPrecisionShared { get; set; }
    public string? ProviderReference { get; set; }
    public string? FailureReason { get; set; }
    public ContactAttemptOutcome Outcome { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
