using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Services;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Aggregated, privacy-safe trends for the public dashboard: monthly buckets per district
/// with the same suppression rules as the rest of the analytics surface.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class PublicTrendController : ControllerBase
{
    private readonly IAppDbContext _db;

    public PublicTrendController(IAppDbContext db) => _db = db;

    [HttpGet("trend")]
    public async Task<IActionResult> Trend(
        [FromQuery] Guid? districtId,
        [FromQuery] int months = 6,
        [FromQuery] string lang = "bn",
        CancellationToken ct = default)
    {
        months = Math.Clamp(months, 1, 24);
        var from = DateTimeOffset.UtcNow.AddMonths(-months);

        var query = _db.Incidents.AsNoTracking().AsQueryable();
        if (districtId is not null) query = query.Where(i => i.DistrictId == districtId);

        // DateTimeOffset ranges are filtered in memory: SQLite cannot translate them server-side.
        var projected = await query
            .Select(i => new { i.CreatedAt, i.IsEmergency, i.Status, i.VerificationStatus, i.Category, i.DistrictId })
            .ToListAsync(ct);

        var rows = projected.Where(i => i.CreatedAt >= from).ToList();

        var buckets = rows
            .GroupBy(r => new { r.CreatedAt.Year, r.CreatedAt.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month = $"{g.Key.Year}-{g.Key.Month:D2}",
                reported = g.Count(),
                emergency = g.Count(x => x.IsEmergency),
                verified = g.Count(x => x.VerificationStatus == VerificationStatus.VERIFIED_CASE),
                referred = g.Count(x => x.Status == IncidentStatus.POLICE_REFERRED),
                resolved = g.Count(x => x.Status is IncidentStatus.RESOLVED or IncidentStatus.CLOSED)
            })
            .ToList();

        var categories = rows
            .GroupBy(r => r.Category)
            .OrderByDescending(g => g.Count())
            .Select(g => new { category = g.Key.ToString(), count = g.Count() })
            .ToList();

        // A district with fewer than 5 reports in the window is suppressed entirely.
        var suppressed = rows.Count < 5;

        var definition = AnalyticsService.BuildDefinitions(lang);

        return Ok(new
        {
            months,
            from,
            districtId,
            minimumAggregationThreshold = 5,
            suppressed,
            note = suppressed
                ? "Fewer than 5 reports in this window, so no trend is published."
                : "Counts are aggregated; no individual location or identity is included.",
            buckets,
            categories,
            definitions = definition
        });
    }

    [HttpGet("district-summary")]
    public async Task<IActionResult> DistrictSummary(CancellationToken ct)
    {
        var districts = await _db.Districts.AsNoTracking()
            .Include(d => d.Division)
            .OrderBy(d => d.NameEn)
            .ToListAsync(ct);

        var counts = await _db.Incidents.AsNoTracking()
            .GroupBy(i => i.DistrictId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

        return Ok(districts.Select(d => new
        {
            id = d.Id,
            code = d.Code,
            nameEn = d.NameEn,
            nameBn = d.NameBn,
            divisionId = d.DivisionId,
            divisionName = d.Division?.NameEn,
            latitude = d.CenterLatitude,
            longitude = d.CenterLongitude,
            reportCount = counts.GetValueOrDefault(d.Id),
            published = counts.GetValueOrDefault(d.Id) >= 5
        }));
    }
}
