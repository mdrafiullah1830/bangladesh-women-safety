using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class Trip
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? OriginText { get; set; }
    public string DestinationText { get; set; } = string.Empty;
    public double? DestinationLatitude { get; set; }
    public double? DestinationLongitude { get; set; }
    public TripStatus Status { get; set; } = TripStatus.ACTIVE;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset ExpectedArrivalAt { get; set; }
    public DateTimeOffset? LastCheckInAt { get; set; }
    public DateTimeOffset? AutoEscalatedAt { get; set; }
    public Guid? TrustedContactId { get; set; }
    public int CheckInIntervalMinutes { get; set; } = 15;
    public string? TransportMode { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public TrustedContact? TrustedContact { get; set; }
}

public class TripCheckIn
{
    public Guid Id { get; set; }
    public Guid TripId { get; set; }
    public string Respondent { get; set; } = "USER";
    public string? Note { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class IncidentEvidence
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "image/jpeg";
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public bool IsBlurred { get; set; }
    public EvidenceVisibility Visibility { get; set; } = EvidenceVisibility.OWNER_AND_MODERATOR;
    public DateTimeOffset CapturedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
