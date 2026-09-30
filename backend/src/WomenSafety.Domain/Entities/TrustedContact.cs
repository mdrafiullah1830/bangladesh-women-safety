using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class TrustedContact
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? Relationship { get; set; }
    public string? PreferredChannel { get; set; }
    public bool AllowPushNotification { get; set; }
    public bool AllowSms { get; set; }
    public bool AllowPhoneCallShortcut { get; set; }
    public NearbyAlertPrecision LocationPrecision { get; set; }
    public int Priority { get; set; }
    public bool IsVerified { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
