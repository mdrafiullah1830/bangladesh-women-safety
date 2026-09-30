namespace WomenSafety.Domain.Entities;

public class Device
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string InstallationId { get; set; } = string.Empty;
    public string? Platform { get; set; }
    public string? FcmToken { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
