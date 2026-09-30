namespace WomenSafety.Domain.Entities;

public class Division
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameBn { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;

    public ICollection<District> Districts { get; set; } = new List<District>();
}

public class District
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string NameBn { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public double? CenterLatitude { get; set; }
    public double? CenterLongitude { get; set; }
    public Guid DivisionId { get; set; }
    public long? PopulationEstimate { get; set; }
    public int? PopulationSourceYear { get; set; }
    public string? PopulationSource { get; set; }

    public Division Division { get; set; } = null!;
}
