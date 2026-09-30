using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Contracts;

// ─── Incident DTOs ────────────────────────────────────────────────────────────

public record CreateIncidentRequest
{
    public string? Description { get; init; }
    public string? AddressText { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public double? AccuracyMeters { get; init; }
    public string? LocationSource { get; init; }
    public bool IsEmergency { get; init; }
    public bool NotifyTrustedContacts { get; init; }
    public EmergencyPrivacyMode PrivacyMode { get; init; }
    public string IdempotencyKey { get; init; } = string.Empty;
    public DateTimeOffset? ClientRecordedAt { get; init; }
}

public record CancelIncidentRequest
{
    public string? Reason { get; init; }
}

public record IncidentOwnerView
{
    public Guid Id { get; init; }
    public string IncidentReference { get; init; } = string.Empty;
    public bool IsEmergency { get; init; }
    public IncidentStatus Status { get; init; }
    public VerificationStatus VerificationStatus { get; init; }
    public EmergencyPrivacyMode PrivacyMode { get; init; }
    public string? Description { get; init; }
    public string? AddressText { get; init; }
    public double? LastLatitude { get; init; }
    public double? LastLongitude { get; init; }
    public double? LastAccuracyMeters { get; init; }
    public AuthorityContactState AuthorityContactState { get; init; }
    public ContactAttemptOutcome ContactNotificationState { get; init; }
    public ContactAttemptOutcome ResponderNotificationState { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record AddIncidentLocationRequest
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public double? AccuracyMeters { get; init; }
    public string? Source { get; init; }
    public bool IsMoving { get; init; }
}

// ─── Trusted Contact DTOs ─────────────────────────────────────────────────────

public record TrustedContactRequest
{
    public string DisplayName { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public string? Relationship { get; init; }
    public string? PreferredChannel { get; init; }
    public bool AllowPushNotification { get; init; }
    public bool AllowSms { get; init; }
    public bool AllowPhoneCallShortcut { get; init; }
    public NearbyAlertPrecision LocationPrecision { get; init; }
    public int Priority { get; init; }
}

public record TrustedContactView
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string PhoneNumberMasked { get; init; } = string.Empty;
    public string? Relationship { get; init; }
    public string? PreferredChannel { get; init; }
    public NearbyAlertPrecision LocationPrecision { get; init; }
    public int Priority { get; init; }
    public bool IsVerified { get; init; }
}

// ─── Sync DTOs ────────────────────────────────────────────────────────────────

public record SyncBatchRequest
{
    public string? DeviceInstallationId { get; init; }
    public IReadOnlyList<SyncIncidentItem> Incidents { get; init; } = Array.Empty<SyncIncidentItem>();
    public IReadOnlyList<SyncLocationItem> Locations { get; init; } = Array.Empty<SyncLocationItem>();
}

public record SyncBatchResponse
{
    public DateTimeOffset ServerTime { get; init; }
    public IReadOnlyList<SyncItemResult> Results { get; init; } = Array.Empty<SyncItemResult>();
}

public record SyncItemResult
{
    public string IdempotencyKey { get; init; } = string.Empty;
    public bool Accepted { get; init; }
    public bool Duplicate { get; init; }
    public Guid? ServerId { get; init; }
    public string? IncidentReference { get; init; }
    public SyncState State { get; init; }
    public string? Message { get; init; }
}

public record SyncIncidentItem
{
    public string IdempotencyKey { get; init; } = string.Empty;
    public CreateIncidentRequest Incident { get; init; } = null!;
}

public record SyncLocationItem
{
    public Guid? IncidentId { get; init; }
    public string? IncidentIdempotencyKey { get; init; }
    public AddIncidentLocationRequest Location { get; init; } = null!;
}

// ─── Public / Connectivity DTOs ───────────────────────────────────────────────

public record ConnectivityStatusView
{
    public bool ServerReachable { get; init; }
    public DateTimeOffset CheckedAt { get; init; }
    public string ProviderName { get; init; } = string.Empty;
    public bool SmsAutoSendSupported { get; init; }
    public bool EmergencyDispatchApiSupported { get; init; }
    public bool OfficialPoliceConfirmationSupported { get; init; }
}
