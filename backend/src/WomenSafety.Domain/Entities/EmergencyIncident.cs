using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class EmergencyIncident
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string AnonymousUserId { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
    public string IncidentReference { get; set; } = string.Empty;
    public bool IsEmergency { get; set; }
    public IncidentStatus Status { get; set; }
    public VerificationStatus VerificationStatus { get; set; }
    public EmergencyPrivacyMode PrivacyMode { get; set; }
    public AuthorityContactState AuthorityContactState { get; set; }
    public ContactAttemptOutcome ContactNotificationState { get; set; }
    public ContactAttemptOutcome ResponderNotificationState { get; set; }
    public SyncState SyncState { get; set; }

    public string? Description { get; set; }
    public string? Title { get; set; }
    public IncidentCategory Category { get; set; } = IncidentCategory.OTHER;
    public DateTimeOffset? OccurredAt { get; set; }
    public string? AddressText { get; set; }
    public Guid? DistrictId { get; set; }
    public Guid? DivisionId { get; set; }

    public double? LastLatitude { get; set; }
    public double? LastLongitude { get; set; }
    public double? LastAccuracyMeters { get; set; }

    public DateTimeOffset? AuthorityContactInitiatedAt { get; set; }
    public DateTimeOffset? FirstContactNotifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    // Navigation
    public District? District { get; set; }
    public Division? Division { get; set; }
}
