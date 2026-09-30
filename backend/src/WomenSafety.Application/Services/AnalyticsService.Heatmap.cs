using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Common;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class AnalyticsService
{
    /// <summary>
    /// Aggregated heatmap cells. Raw incident coordinates are coarsened onto a grid and any cell
    /// below the threshold is dropped entirely (spec sections 27 and 28).
    /// </summary>
    public async Task<IReadOnlyList<PublicMapCell>> GetHeatmapAsync(
        Guid? districtId = null,
        DateOnly? from = null,
        DateOnly? to = null,
        double cellDegrees = 0.01,
        CancellationToken ct = default)
    {
        var query = _db.Incidents.Where(i => i.LastLatitude != null && i.LastLongitude != null);

        if (districtId is not null) query = query.Where(i => i.DistrictId == districtId);

        if (from is not null)
        {
            var fromOffset = new DateTimeOffset(from.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            query = query.Where(i => i.CreatedAt >= fromOffset);
        }

        if (to is not null)
        {
            var toOffset = new DateTimeOffset(to.Value.ToDateTime(TimeOnly.MaxValue), TimeSpan.Zero);
            query = query.Where(i => i.CreatedAt <= toOffset);
        }

        // Only coordinates plus verification state are read; never identity or evidence columns.
        var points = await query
            .Select(i => new { i.LastLatitude, i.LastLongitude, i.VerificationStatus })
            .ToListAsync(ct);

        return points
            .GroupBy(p =>
            {
                var coarsened = PrivacyAggregation.CoarsenGrid(
                    p.LastLatitude!.Value, p.LastLongitude!.Value, cellDegrees);
                return (coarsened.Latitude, coarsened.Longitude);
            })
            .Where(g => PrivacyAggregation.CanPublish(g.Count()))
            .Select(g => new PublicMapCell
            {
                Latitude = g.Key.Latitude,
                Longitude = g.Key.Longitude,
                ReportedIncidents = g.Count(),
                VerifiedCases = g.Count(p => p.VerificationStatus == VerificationStatus.VERIFIED_CASE),
                Suppressed = false
            })
            .OrderByDescending(c => c.ReportedIncidents)
            .ToList();
    }

    /// <summary>
    /// The terminology legend shown next to every statistic (spec sections 20 and 49). This is
    /// how the platform avoids implying that a report is a confirmed crime.
    /// </summary>
    public static IReadOnlyList<StatisticDefinition> BuildDefinitions(string language = "en") => new List<StatisticDefinition>
    {
        new("reported", "Reported incidents", "\u09b0\u09bf\u09aa\u09cb\u09b0\u09cd\u099f\u0995\u09c3\u09a4 \u0998\u099f\u09a8\u09be",
            "A user submitted a report. It has not been verified."),
        new("emergency", "Emergency activations", "\u0987\u09ae\u09be\u09b0\u09cd\u099c\u09c7\u09a8\u09cd\u09b8\u09bf \u09b8\u0995\u09cd\u09b0\u09bf\u09df\u0995\u09b0\u09a3",
            "An emergency mode was activated. Still a report, not a confirmed crime."),
        new("verified", "Verified cases", "\u09af\u09be\u099a\u09be\u09df\u0995\u09c3\u09a4 \u09ae\u09be\u09ae\u09b2\u09be",
            "An authorized moderator reviewed and verified the report."),
        new("referred", "Police-referred", "\u09aa\u09c1\u09b2\u09bf\u09b6\u09c7 \u09aa\u09cd\u09b0\u09c7\u09b0\u09bf\u09a4",
            "The report was forwarded to police. This does not mean police accepted it."),
        new("confirmed", "Officially confirmed", "\u09b8\u09b0\u0995\u09be\u09b0\u09bf\u09ad\u09be\u09ac\u09c7 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4",
            "Confirmation received from an official system. Requires a verified integration."),
        new("resolved", "Resolved", "\u09b8\u09ae\u09be\u09a7\u09be\u09a8\u0995\u09c3\u09a4",
            "Officially marked as resolved."),
        new("pending", "Pending", "\u0985\u09ae\u09c0\u09ae\u09be\u0982\u09b8\u09bf\u09a4",
            "Still open and awaiting action or verification.")
    };
}
