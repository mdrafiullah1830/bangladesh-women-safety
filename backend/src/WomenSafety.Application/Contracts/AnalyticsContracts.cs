namespace WomenSafety.Application.Contracts;

/// <summary>
/// Public district statistics (spec sections 18, 20 and 50).
///
/// Terminology discipline: "reported" never implies "confirmed". Each figure is separate and
/// carries its own label so the dashboard cannot be misread.
/// </summary>
public record DistrictPublicStat
{
    public Guid DistrictId { get; init; }
    public string DistrictName { get; init; } = string.Empty;
    public string DivisionName { get; init; } = string.Empty;

    /// <summary>Reports submitted by users. Not verified in any way.</summary>
    public int ReportedIncidents { get; init; }

    /// <summary>Distinct emergency activations. Still reports, not confirmed crimes.</summary>
    public int EmergencyActivations { get; init; }

    /// <summary>Reports a moderator has reviewed and marked verified.</summary>
    public int VerifiedCases { get; init; }

    /// <summary>Reports forwarded to police. Does NOT mean police accepted or registered them.</summary>
    public int PoliceReferred { get; init; }

    /// <summary>Official confirmation received through a verified integration only.</summary>
    public int PoliceConfirmed { get; init; }

    public int ResolvedCases { get; init; }
    public int PendingCases { get; init; }
    public int DuplicateReports { get; init; }
    public int RejectedReports { get; init; }

    /// <summary>True when the bucket is below the aggregation threshold and counts are suppressed.</summary>
    public bool Suppressed { get; init; }

    /// <summary>Reason shown to the user when a bucket is suppressed.</summary>
    public string? SuppressionReason { get; init; }

    /// <summary>Population provenance - never shown without its source and year (spec section 50).</summary>
    public long? PopulationEstimate { get; init; }
    public int? PopulationSourceYear { get; init; }
    public string? PopulationSource { get; init; }
}

/// <summary>
/// A single aggregated cell of the safety heatmap. Coordinates are already coarsened
/// (spec sections 27 and 28) so no individual can be located.
/// </summary>
public record PublicMapCell
{
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public int ReportedIncidents { get; init; }
    public int VerifiedCases { get; init; }
    public bool Suppressed { get; init; }
}

public record PublicStatsEnvelope
{
    public IReadOnlyList<DistrictPublicStat> Districts { get; init; } = Array.Empty<DistrictPublicStat>();

    /// <summary>Terminology legend so the UI never conflates the categories.</summary>
    public IReadOnlyList<StatisticDefinition> Definitions { get; init; } = Array.Empty<StatisticDefinition>();

    public int MinimumAggregationThreshold { get; init; }

    /// <summary>Provenance of the underlying data (spec sections 48, 49 and 79).</summary>
    public IReadOnlyList<DataSourceNote> Sources { get; init; } = Array.Empty<DataSourceNote>();
}

public record StatisticDefinition(string Key, string LabelEn, string LabelBn, string Meaning);

public record DataSourceNote(
    string Name,
    string? Url,
    string VerificationStatus,
    DateOnly? CoverageStart,
    DateOnly? CoverageEnd,
    DateTimeOffset? PublishedAt,
    bool IsDemoData);
