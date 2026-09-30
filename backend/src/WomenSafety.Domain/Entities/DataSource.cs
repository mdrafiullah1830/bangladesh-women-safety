using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class DataSource
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
    public VerificationStatus VerificationStatus { get; set; }
    public DateOnly? CoverageStart { get; set; }
    public DateOnly? CoverageEnd { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public bool IsDemoData { get; set; }
}
