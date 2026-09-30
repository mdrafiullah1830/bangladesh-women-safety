using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Services;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Anonymous geographic and statistical data (spec sections 16, 17, 18, 28 and 50).
/// All statistics pass through <see cref="AnalyticsService"/>, which suppresses any bucket
/// below the minimum aggregation threshold.
/// </summary>
[ApiController]
[Route("api")]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class PublicDataController : ControllerBase
{
    private readonly AnalyticsService _analytics;
    private readonly IAppDbContext _db;

    public PublicDataController(AnalyticsService analytics, IAppDbContext db)
    {
        _analytics = analytics;
        _db = db;
    }

    /// <summary>All divisions with their districts (no incident data).</summary>
    [HttpGet("districts")]
    public async Task<IActionResult> Districts(CancellationToken ct)
    {
        var divisions = await _db.Divisions
            .Include(d => d.Districts)
            .OrderBy(d => d.NameEn)
            .ToListAsync(ct);

        return Ok(divisions.Select(v => new
        {
            v.Id,
            v.Code,
            v.NameBn,
            v.NameEn,
            districts = v.Districts
                .OrderBy(d => d.NameEn)
                .Select(d => new { d.Id, d.Code, d.NameBn, d.NameEn, d.CenterLatitude, d.CenterLongitude })
        }));
    }

    /// <summary>Aggregated statistics for a single district.</summary>
    [HttpGet("districts/{id:guid}/statistics")]
    public async Task<ActionResult<PublicStatsEnvelope>> DistrictStatistics(
        Guid id,
        [FromQuery] string lang = "en",
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
    {
        var district = await _db.Districts.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (district is null) return NotFound(new { error = "not_found", message = "District not found." });

        var envelope = await _analytics.GetDistrictStatisticsAsync(lang, district.DivisionId, from, to, ct);

        return Ok(envelope with
        {
            Districts = envelope.Districts.Where(d => d.DistrictId == id).ToList()
        });
    }

    /// <summary>National or division-scoped aggregated statistics.</summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<PublicStatsEnvelope>> Statistics(
        [FromQuery] string lang = "en",
        [FromQuery] Guid? divisionId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
        => Ok(await _analytics.GetDistrictStatisticsAsync(lang, divisionId, from, to, ct));

    /// <summary>
    /// Aggregated incident heatmap cells (spec section 28). Cells below the aggregation
    /// threshold are omitted entirely rather than reported as small numbers.
    /// </summary>
    [HttpGet("map/incidents")]
    public async Task<IActionResult> Heatmap(
        [FromQuery] Guid? districtId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        CancellationToken ct = default)
    {
        var cells = await _analytics.GetHeatmapAsync(districtId, from, to, 0.01, ct);

        return Ok(new
        {
            minimumAggregationThreshold = Domain.Common.PrivacyAggregation.MinimumPublicBucketCount,
            note = "Reported incident density. Individual locations are never published.",
            cells
        });
    }
}
