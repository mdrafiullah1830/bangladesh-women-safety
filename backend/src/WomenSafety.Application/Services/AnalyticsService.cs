using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Common;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Public analytics. This service is the enforcement point for the platform's privacy rules
/// (spec sections 17, 20, 27, 28, 49 and 79):
///   - counts are aggregated by district, never by individual;
///   - any bucket below the minimum threshold is suppressed, not published;
///   - verification categories are reported separately and never merged;
///   - every response carries its data-source provenance.
/// </summary>
public partial class AnalyticsService
{
    /// <summary>
    /// Narrow projection of an incident used for aggregation. Deliberately excludes location,
    /// identity and evidence columns so they can never leak through this path.
    /// </summary>
    private record AggRow(Guid? DistrictId, bool IsEmergency, VerificationStatus VerificationStatus, IncidentStatus Status);

    private readonly IAppDbContext _db;
    private readonly IClock _clock;

    public AnalyticsService(IAppDbContext db, IClock clock)
    {
        _db = db;
        _clock = clock;
    }

    public async Task<PublicStatsEnvelope> GetDistrictStatisticsAsync(
        string language = "en",
        Guid? divisionId = null,
        DateOnly? from = null,
        DateOnly? to = null,
        CancellationToken ct = default)
    {
        var districts = await _db.Districts
            .Include(d => d.Division)
            .Where(d => divisionId == null || d.DivisionId == divisionId)
            .OrderBy(d => d.NameEn)
            .ToListAsync(ct);

        // SQLite cannot translate DateTimeOffset range comparisons, so the narrow projection is
        // pulled first and the date window is applied in memory (no identity or location columns).
        var projected = await _db.Incidents
            .Select(i => new { i.DistrictId, i.IsEmergency, i.VerificationStatus, i.Status, i.CreatedAt })
            .ToListAsync(ct);

        if (from is not null)
        {
            var fromOffset = new DateTimeOffset(from.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            projected = projected.Where(p => p.CreatedAt >= fromOffset).ToList();
        }

        if (to is not null)
        {
            var toOffset = new DateTimeOffset(to.Value.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);
            projected = projected.Where(p => p.CreatedAt <= toOffset).ToList();
        }

        var rows = projected
            .Select(p => new AggRow(p.DistrictId, p.IsEmergency, p.VerificationStatus, p.Status))
            .ToList();

        var byDistrict = rows
            .Where(r => r.DistrictId is not null)
            .GroupBy(r => r.DistrictId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<DistrictPublicStat>();

        foreach (var district in districts)
        {
            var bucket = byDistrict.TryGetValue(district.Id, out var found) ? found : new List<AggRow>();

            var reported = bucket.Count;
            var verified = bucket.Count(r => r.VerificationStatus == VerificationStatus.VERIFIED_CASE);
            var policeConfirmed = bucket.Count(r => r.VerificationStatus == VerificationStatus.OFFICIALLY_CONFIRMED);
            var referred = bucket.Count(r => r.Status == IncidentStatus.POLICE_REFERRED);
            var resolved = bucket.Count(r => r.Status is IncidentStatus.RESOLVED or IncidentStatus.CLOSED);
            var duplicates = bucket.Count(r => r.Status == IncidentStatus.DUPLICATE);
            var rejected = bucket.Count(r => r.Status == IncidentStatus.REJECTED);

            // Suppression rule: a small bucket would make an individual identifiable.
            var suppressed = reported > 0 && !PrivacyAggregation.CanPublish(reported);

            result.Add(new DistrictPublicStat
            {
                DistrictId = district.Id,
                DistrictName = language == "bn" ? district.NameBn : district.NameEn,
                DivisionName = district.Division is null
                    ? string.Empty
                    : language == "bn" ? district.Division.NameBn : district.Division.NameEn,

                ReportedIncidents = suppressed ? 0 : reported,
                EmergencyActivations = suppressed ? 0 : bucket.Count(r => r.IsEmergency),
                VerifiedCases = suppressed ? 0 : verified,
                PoliceReferred = suppressed ? 0 : referred,
                PoliceConfirmed = suppressed ? 0 : policeConfirmed,
                ResolvedCases = suppressed ? 0 : resolved,
                PendingCases = suppressed ? 0 : Math.Max(0, reported - resolved - duplicates - rejected),
                DuplicateReports = suppressed ? 0 : duplicates,
                RejectedReports = suppressed ? 0 : rejected,

                Suppressed = suppressed,
                SuppressionReason = suppressed
                    ? $"Fewer than {PrivacyAggregation.MinimumPublicBucketCount} reports in this district. " +
                      "Counts are withheld to protect individual privacy."
                    : null,

                PopulationEstimate = district.PopulationEstimate,
                PopulationSourceYear = district.PopulationSourceYear,
                PopulationSource = district.PopulationSource
            });
        }

        var sources = await _db.DataSources
            .Select(s => new DataSourceNote(
                s.Name, s.SourceUrl, s.VerificationStatus.ToString(),
                s.CoverageStart, s.CoverageEnd, s.PublishedAt, s.IsDemoData))
            .ToListAsync(ct);

        return new PublicStatsEnvelope
        {
            Districts = result,
            Definitions = BuildDefinitions(language),
            MinimumAggregationThreshold = PrivacyAggregation.MinimumPublicBucketCount,
            Sources = sources
        };
    }
}
