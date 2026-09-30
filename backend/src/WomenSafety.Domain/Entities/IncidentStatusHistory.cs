using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class IncidentStatusHistory
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public IncidentStatus FromStatus { get; set; }
    public IncidentStatus ToStatus { get; set; }
    public string? Note { get; set; }
    public bool SystemGenerated { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
