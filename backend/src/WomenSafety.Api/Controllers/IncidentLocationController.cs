using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Application.Services;
using WomenSafety.Api.Authorization;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Live location capture during Emergency Mode, plus the owner's location trail
/// (spec section 7).
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class IncidentLocationController : ControllerBase
{
    private readonly IncidentService _incidents;
    private readonly IAppDbContext _db;

    public IncidentLocationController(IncidentService incidents, IAppDbContext db)
    {
        _incidents = incidents;
        _db = db;
    }

    /// <summary>
    /// Appends a location fix. Called repeatedly by the client with an adaptive interval
    /// (frequent while moving, sparse while stationary) to conserve battery.
    /// </summary>
    [HttpPost("emergency/{id:guid}/location")]
    [RequirePermission(Permission.IncidentUpdateOwnStatus)]
    public async Task<IActionResult> AddLocation(Guid id, [FromBody] AddIncidentLocationRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var stored = await _incidents.AddLocationAsync(userId, id, request, ct);

        if (!stored) throw new ForbiddenAppException("This incident does not belong to you or does not exist.");

        return Accepted(new { stored = true, at = DateTimeOffset.UtcNow });
    }

    /// <summary>
    /// The GPS trail for an incident the caller owns. Accuracy labelling is included so an
    /// approximate fix is never presented as exact.
    /// </summary>
    [HttpGet("incidents/{id:guid}/locations")]
    [RequirePermission(Permission.IncidentViewOwn)]
    public async Task<ActionResult<object>> GetLocations(Guid id, [FromQuery] int take = 200, CancellationToken ct = default)
    {
        var (userId, _) = CallerIdentity.Resolve(User);

        var owned = await _db.Incidents.AnyAsync(i => i.Id == id && i.UserId == userId, ct);
        if (!owned) throw new ForbiddenAppException("This incident does not belong to you.");

        var points = await _db.IncidentLocations
            .Where(l => l.IncidentId == id)
            .OrderByDescending(l => l.RecordedAt)
            .Take(Math.Clamp(take, 1, 1000))
            .ToListAsync(ct);

        return Ok(points.Select(l => new
        {
            l.Latitude,
            l.Longitude,
            l.AccuracyMeters,
            source = l.Source.ToString(),
            l.RecordedAt,
            l.IsMoving,
            l.IsLastKnownFallback,
            accuracyLabel = IncidentMapper.AccuracyLabel(l.AccuracyMeters, l.Source)
        }));
    }
}
