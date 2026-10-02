namespace WomenSafety.Domain.Entities;

public class UserNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? IncidentId { get; set; }
    public string Type { get; set; } = "GENERAL";
    public string TitleEn { get; set; } = string.Empty;
    public string TitleBn { get; set; } = string.Empty;
    public string BodyEn { get; set; } = string.Empty;
    public string BodyBn { get; set; } = string.Empty;
    public string? LinkHref { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class LocationShare
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string? Note { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int MaxViews { get; set; } = 50;
    public int ViewCount { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset? LastViewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class PrivacyDeletionRequest
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public string? AdminNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
