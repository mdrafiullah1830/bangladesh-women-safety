using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Contracts;

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

public record RegisterRequest
{
    public string DisplayName { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
    public string? Email { get; init; }
    public string Password { get; init; } = string.Empty;
    public string? DistrictId { get; init; }
    public string Language { get; init; } = "bn";
}

public record LoginRequest
{
    public string Identifier { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
}

public record OtpVerifyRequest
{
    public string Destination { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public OtpPurpose Purpose { get; init; } = OtpPurpose.LOGIN;
}

public record OtpSendRequest
{
    public string Destination { get; init; } = string.Empty;
    public OtpPurpose Purpose { get; init; } = OtpPurpose.LOGIN;
}

public record RefreshRequest
{
    public string RefreshToken { get; init; } = string.Empty;
}

public record ProfileUpdateRequest
{
    public string? DisplayName { get; init; }
    public string? DistrictId { get; init; }
    public string? PreferredLanguage { get; init; }
    public EmergencyPrivacyMode? DefaultPrivacyMode { get; init; }
    public string? CurrentPassword { get; init; }
    public string? NewPassword { get; init; }
}

public record AuthTokens
{
    public string AccessToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}

public record AuthResult
{
    public bool Succeeded { get; init; }
    public UserProfileView? User { get; init; }
    public AuthTokens? Tokens { get; init; }
    /// <summary>Development only: OTP echoed back so the UI can be exercised without an SMS gateway.</summary>
    public string? DevOtp { get; init; }
    public string? Error { get; init; }
}

public record UserProfileView
{
    public Guid Id { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
    public string? Email { get; init; }
    public UserRole Role { get; init; }
    public Guid? DistrictId { get; init; }
    public string? DistrictName { get; init; }
    public Guid? DivisionId { get; init; }
    public string PreferredLanguage { get; init; } = "bn";
    public EmergencyPrivacyMode DefaultPrivacyMode { get; init; }
    public bool IsPhoneVerified { get; init; }
    public bool IsEmailVerified { get; init; }
    public int ReputationScore { get; init; }
    public int VerifiedReports { get; init; }
    public int HelpfulVotes { get; init; }
    public int Strikes { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? LastLoginAt { get; init; }
}

public record SessionView
{
    public Guid Id { get; init; }
    public string DeviceId { get; init; } = string.Empty;
    public string? Platform { get; init; }
    public DateTimeOffset? LastSeenAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public bool IsCurrent { get; init; }
}

public record ConsentRequest
{
    public string ConsentKey { get; init; } = string.Empty;
    public bool Granted { get; init; }
}

public record DeletionRequestDto
{
    public string Reason { get; init; } = string.Empty;
}

// ─── Feature DTOs ─────────────────────────────────────────────────────────────

public record TripRequest
{
    public string Title { get; init; } = string.Empty;
    public string? OriginText { get; init; }
    public string DestinationText { get; init; } = string.Empty;
    public double? DestinationLatitude { get; init; }
    public double? DestinationLongitude { get; init; }
    public int? ExpectedMinutes { get; init; }
    public int CheckInIntervalMinutes { get; init; } = 15;
    public string? TransportMode { get; init; }
    public Guid? TrustedContactId { get; init; }
}

public record CheckInRequest
{
    public string Respondent { get; init; } = "USER";
    public string? Note { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
}

public record ShareRequest
{
    public string? Note { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public int ValidityMinutes { get; init; } = 120;
    public int MaxViews { get; init; } = 50;
}

public record UpdateIncidentReportRequest
{
    public string? Title { get; init; }
    public IncidentCategory? Category { get; init; }
    public string? Description { get; init; }
    public DateTimeOffset? OccurredAt { get; init; }
    public string? AddressText { get; init; }
    public Guid? DistrictId { get; init; }
}

public record TransitionRequest
{
    public IncidentStatus ToStatus { get; init; }
    public string? Note { get; init; }
}

public record EvidenceRequest
{
    public string FileName { get; init; } = "evidence.jpg";
    public string ContentType { get; init; } = "image/jpeg";
    /// <summary>Base64 payload (data URL prefix optional).</summary>
    public string Base64 { get; init; } = string.Empty;
    public string? Caption { get; init; }
    public bool IsBlurred { get; init; }
    public DateTimeOffset? CapturedAt { get; init; }
}

public record ModerationDecisionRequest
{
    public bool Approve { get; init; }
    public string? Note { get; init; }
    public VerificationStatus? TargetVerification { get; init; }
}

public record ReferralRequest
{
    public string StationName { get; init; } = string.Empty;
    public Guid? DistrictId { get; init; }
    public string? Notes { get; init; }
    public bool Submit { get; init; }
}

public record ReferralStatusRequest
{
    public ReferralStatus Status { get; init; }
    public string? Notes { get; init; }
}

public record ResponderAssignmentRequest
{
    public ResponderAssignmentStatus Status { get; init; }
    public string? Note { get; init; }
}

public record VoteRequest
{
    public bool IsHelpful { get; init; }
}
