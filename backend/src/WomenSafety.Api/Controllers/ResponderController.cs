using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Responder console: see unassigned emergencies, claim them and drive the assignment
/// lifecycle (ALERTED → ACCEPTED → EN_ROUTE → ON_SCENE → COMPLETED).
/// </summary>
[ApiController]
[Route("api/responder")]
[Authorize]
public class ResponderController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public ResponderController(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    private string Role => User.FindFirstValue(ClaimTypes.Role) ?? nameof(UserRole.VICTIM);

    private async Task<Responder> EnsureResponderAsync(Guid userId, CancellationToken ct)
    {
        var linked = await _db.Responders.FirstOrDefaultAsync(r => r.DisplayName == $"user:{userId}", ct);
        if (linked is not null) return linked;

        var responder = new Responder
        {
            Id = Guid.NewGuid(),
            DisplayName = $"user:{userId}",
            PhoneNumber = null,
            IsApproved = Role is nameof(UserRole.RESPONDER) or nameof(UserRole.MODERATOR) or nameof(UserRole.ADMIN),
            IsOnDuty = true,
            CoverageRadiusMeters = 10000,
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };
        _db.Responders.Add(responder);
        await _db.SaveChangesAsync(ct);
        return responder;
    }

    [HttpGet("available")]
    public async Task<IActionResult> Available(CancellationToken ct)
    {
        var rows = await _db.Incidents
            .Where(i => i.Status == IncidentStatus.EMERGENCY_ACTIVE || i.Status == IncidentStatus.OPEN)
            .OrderByDescending(i => i.IsEmergency)
            .ThenByDescending(i => i.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var assigned = await _db.ResponderAssignments
            .Where(a => rows.Select(r => r.Id).Contains(a.IncidentId))
            .Select(a => a.IncidentId)
            .ToListAsync(ct);

        var districtIds = rows.Where(r => r.DistrictId != null).Select(r => r.DistrictId!.Value).Distinct().ToList();
        var districts = await _db.Districts.Where(d => districtIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.NameEn, ct);

        return Ok(rows.Where(i => !assigned.Contains(i.Id)).Select(i => new
        {
            id = i.Id,
            reference = i.IncidentReference,
            category = i.Category.ToString(),
            status = i.Status.ToString(),
            isEmergency = i.IsEmergency,
            districtName = i.DistrictId != null && districts.TryGetValue(i.DistrictId.Value, out var n) ? n : null,
            latitude = i.LastLatitude,
            longitude = i.LastLongitude,
            createdAt = i.CreatedAt,
            minutesAgo = (int)(_clock.UtcNow - i.CreatedAt).TotalMinutes
        }));
    }

    [HttpPost("incidents/{id:guid}/claim")]
    [RequirePermission(Permission.ResponderUpdateAssignment)]
    public async Task<IActionResult> Claim(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await _db.Incidents.FirstOrDefaultAsync(i => i.Id == id, ct)
                       ?? throw new NotFoundAppException("Incident not found.");

        var already = await _db.ResponderAssignments.AnyAsync(a => a.IncidentId == id && a.Status != ResponderAssignmentStatus.CANCELLED, ct);
        if (already) throw new ValidationAppException("Another responder already accepted this incident.");

        var responder = await EnsureResponderAsync(userId, ct);

        var assignment = new ResponderAssignment
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            ResponderId = responder.Id,
            Status = ResponderAssignmentStatus.ALERTED,
            InformationShared = incident.PrivacyMode switch
            {
                EmergencyPrivacyMode.MAXIMUM_PRIVACY => NearbyAlertPrecision.COARSE_AREA_ONLY,
                EmergencyPrivacyMode.SHARE_EXACT_LOCATION => NearbyAlertPrecision.EXACT_LOCATION_AUTHORIZED,
                _ => NearbyAlertPrecision.APPROXIMATE_DISTANCE
            },
            AlertedAt = _clock.UtcNow,
            CreatedAt = _clock.UtcNow
        };
        _db.ResponderAssignments.Add(assignment);
        incident.ResponderNotificationState = ContactAttemptOutcome.DELIVERED;
        incident.UpdatedAt = _clock.UtcNow;

        await _audit.LogAsync("responder.claim", "Audit", userId.ToString(), true, incident.IncidentReference);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = assignment.Id,
            incidentId = incident.Id,
            reference = incident.IncidentReference,
            status = assignment.Status.ToString(),
            informationShared = assignment.InformationShared
        });
    }

    [HttpGet("assignments")]
    public async Task<IActionResult> Assignments(CancellationToken ct)
    {
        var responder = await _db.Responders.FirstOrDefaultAsync(r => r.DisplayName == $"user:{CallerIdentity.Resolve(User).UserId}", ct);
        if (responder is null) return Ok(Array.Empty<object>());

        var rows = await _db.ResponderAssignments
            .Where(a => a.ResponderId == responder.Id)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .ToListAsync(ct);

        var incidents = await _db.Incidents.Where(i => rows.Select(r => r.IncidentId).Contains(i.Id)).ToDictionaryAsync(i => i.Id, ct);

        return Ok(rows.Select(a =>
        {
            var incident = incidents.GetValueOrDefault(a.IncidentId);
            return new
            {
                id = a.Id,
                incidentId = a.IncidentId,
                reference = incident?.IncidentReference,
                category = incident?.Category.ToString(),
                status = a.Status.ToString(),
                informationShared = a.InformationShared,
                reportedDistanceMeters = a.ReportedDistanceMeters,
                alertedAt = a.AlertedAt,
                createdAt = a.CreatedAt,
                latitude = incident?.LastLatitude,
                longitude = incident?.LastLongitude,
                privacyMode = incident?.PrivacyMode.ToString()
            };
        }));
    }

    [HttpPost("assignments/{assignmentId:guid}/status")]
    [RequirePermission(Permission.ResponderUpdateAssignment)]
    public async Task<IActionResult> UpdateStatus(Guid assignmentId, [FromBody] ResponderAssignmentRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var assignment = await _db.ResponderAssignments.FirstOrDefaultAsync(a => a.Id == assignmentId, ct)
                         ?? throw new NotFoundAppException("Assignment not found.");

        if (!Enum.IsDefined(request.Status))
            throw new ValidationAppException("Unknown assignment status.");

        var incident = await _db.Incidents.FirstOrDefaultAsync(i => i.Id == assignment.IncidentId, ct);
        var from = assignment.Status;
        assignment.Status = request.Status;

        if (request.Status == ResponderAssignmentStatus.ON_SCENE && incident is not null)
        {
            assignment.ReportedDistanceMeters = 0;
        }

        if (request.Status == ResponderAssignmentStatus.COMPLETED && incident is not null)
        {
            incident.UpdatedAt = _clock.UtcNow;
            if (incident.UserId is not null)
            {
                _db.UserNotifications.Add(new UserNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = incident.UserId.Value,
                    IncidentId = incident.Id,
                    Type = "RESPONDER",
                    TitleEn = "Responder reported the situation handled",
                    TitleBn = "রেসপন্ডার অবস্থার সমাধানের খবর দিয়েছে",
                    BodyEn = $"Status {from} → {request.Status}",
                    BodyBn = $"Status {from} → {request.Status}",
                    LinkHref = $"#/incidents/{incident.Id}",
                    CreatedAt = _clock.UtcNow
                });
            }
        }

        await _audit.LogAsync("responder.status", "Audit", userId.ToString(), true, $"{from}->{request.Status}");
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = assignment.Id, status = assignment.Status.ToString() });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> Stats(CancellationToken ct)
    {
        var responder = await _db.Responders.FirstOrDefaultAsync(r => r.DisplayName == $"user:{CallerIdentity.Resolve(User).UserId}", ct);
        if (responder is null) return Ok(new { total = 0, active = 0, completed = 0 });

        var all = await _db.ResponderAssignments.Where(a => a.ResponderId == responder.Id).ToListAsync(ct);
        return Ok(new
        {
            total = all.Count,
            active = all.Count(a => a.Status is ResponderAssignmentStatus.ALERTED or ResponderAssignmentStatus.ACCEPTED or ResponderAssignmentStatus.EN_ROUTE or ResponderAssignmentStatus.ON_SCENE),
            completed = all.Count(a => a.Status == ResponderAssignmentStatus.COMPLETED),
            isOnDuty = responder.IsOnDuty
        });
    }

    [HttpPost("duty")]
    [RequirePermission(Permission.ResponderUpdateAssignment)]
    public async Task<IActionResult> ToggleDuty([FromBody] bool onDuty, CancellationToken ct)
    {
        var responder = await EnsureResponderAsync(CallerIdentity.Resolve(User).UserId, ct);
        responder.IsOnDuty = onDuty;
        responder.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { isOnDuty = responder.IsOnDuty });
    }
}
