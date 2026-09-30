namespace WomenSafety.Domain.Entities;

public class Responder
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsApproved { get; set; }
    public bool IsOnDuty { get; set; }
    public double? CenterLatitude { get; set; }
    public double? CenterLongitude { get; set; }
    public double CoverageRadiusMeters { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
