using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class AppUser
{
    public Guid Id { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.VICTIM;
    public Guid? DistrictId { get; set; }
    public Guid? DivisionId { get; set; }
    public string PreferredLanguage { get; set; } = "bn";
    public EmergencyPrivacyMode DefaultPrivacyMode { get; set; } = EmergencyPrivacyMode.BALANCED;
    public bool IsPhoneVerified { get; set; }
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; } = true;
    public int ReputationScore { get; set; }
    public int VerifiedReports { get; set; }
    public int HelpfulVotes { get; set; }
    public int Strikes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }

    public District? District { get; set; }
    public Division? Division { get; set; }
}

public class OtpCode
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Destination { get; set; } = string.Empty;
    public OtpPurpose Purpose { get; set; }
    public string Code { get; set; } = string.Empty;
    public int Attempts { get; set; }
    public int MaxAttempts { get; set; } = 5;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public AppUser? User { get; set; }
}

public class UserConsent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string ConsentKey { get; set; } = string.Empty;
    public bool Granted { get; set; }
    public string? Source { get; set; }
    public DateTimeOffset GrantedAt { get; set; }
}
