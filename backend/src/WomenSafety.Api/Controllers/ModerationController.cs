using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Moderator and admin workbench: the verification queue, decisions on reports,
/// account oversight and privacy deletion requests.
/// </summary>
[ApiController]
[Route("api/moderation")]
[Authorize]
public class ModerationController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public ModerationController(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    private string Role => User.FindFirstValue(ClaimTypes.Role) ?? nameof(UserRole.VICTIM);
    private bool IsAdmin => Role == nameof(UserRole.ADMIN);

    [HttpGet("queue")]
    [RequirePermission(Permission.ModerationReview)]
    public async Task<IActionResult> Queue([FromQuery] int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var rows = await _db.Incidents
            .Where(i => i.VerificationStatus == VerificationStatus.PENDING_REVIEW
                        || i.VerificationStatus == VerificationStatus.UNVERIFIED
                        || i.Status == IncidentStatus.AWAITING_VERIFICATION)
            .OrderByDescending(i => i.IsEmergency)
            .ThenByDescending(i => i.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

        var districtIds = rows.Where(r => r.DistrictId != null).Select(r => r.DistrictId!.Value).Distinct().ToList();
        var districts = await _db.Districts.Where(d => districtIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.NameEn, ct);
        var incidentIds = rows.Select(r => r.Id).ToList();
        var evidenceCounts = await _db.IncidentEvidences
            .Where(m => incidentIds.Contains(m.IncidentId))
            .GroupBy(m => m.IncidentId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);
        var voteCounts = await _db.ReportVotes
            .Where(v => incidentIds.Contains(v.IncidentId) && v.IsHelpful)
            .GroupBy(v => v.IncidentId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

        return Ok(rows.Select(i => new
        {
            id = i.Id,
            reference = i.IncidentReference,
            category = i.Category.ToString(),
            status = i.Status.ToString(),
            verificationStatus = i.VerificationStatus.ToString(),
            isEmergency = i.IsEmergency,
            title = i.Title,
            districtName = i.DistrictId != null && districts.TryGetValue(i.DistrictId.Value, out var name) ? name : null,
            createdAt = i.CreatedAt,
            evidenceCount = evidenceCounts.GetValueOrDefault(i.Id),
            helpfulVotes = voteCounts.GetValueOrDefault(i.Id),
            description = i.Description
        }));
    }

    [HttpPost("incidents/{id:guid}/decision")]
    [RequirePermission(Permission.ModerationReview)]
    public async Task<IActionResult> Decide(Guid id, [FromBody] ModerationDecisionRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await _db.Incidents.FirstOrDefaultAsync(i => i.Id == id, ct)
                       ?? throw new NotFoundAppException("Incident not found.");

        var from = incident.Status;
        var fromVerification = incident.VerificationStatus;

        if (request.Approve)
        {
            incident.VerificationStatus = request.TargetVerification ?? VerificationStatus.VERIFIED_CASE;
            if (incident.Status is IncidentStatus.AWAITING_VERIFICATION or IncidentStatus.OPEN or IncidentStatus.DRAFT)
                incident.Status = IncidentStatus.VERIFIED;
            if (incident.UserId is not null)
            {
                var owner = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == incident.UserId, ct);
                if (owner is not null && incident.VerificationStatus == VerificationStatus.VERIFIED_CASE)
                {
                    owner.VerifiedReports++;
                    owner.ReputationScore = owner.HelpfulVotes + owner.VerifiedReports * 5 - owner.Strikes * 10;
                }
            }
        }
        else
        {
            incident.VerificationStatus = VerificationStatus.REJECTED;
            incident.Status = IncidentStatus.REJECTED;
        }

        incident.UpdatedAt = _clock.UtcNow;

        _db.IncidentStatusHistory.Add(new Domain.Entities.IncidentStatusHistory
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            FromStatus = from,
            ToStatus = incident.Status,
            Note = request.Note ?? (request.Approve ? "Verified by moderator" : "Rejected by moderator"),
            SystemGenerated = false,
            CreatedAt = _clock.UtcNow
        });

        if (incident.UserId is not null)
        {
            _db.UserNotifications.Add(new Domain.Entities.UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = incident.UserId.Value,
                IncidentId = incident.Id,
                Type = "MODERATION",
                TitleEn = request.Approve ? "Your report was verified" : "Your report needs more detail",
                TitleBn = request.Approve ? "আপনার প্রতিবেদন যাচাই করা হয়েছে" : "আপনার প্রতিবেদনে আরও তথ্য প্রয়োজন",
                BodyEn = request.Note ?? string.Empty,
                BodyBn = request.Note ?? string.Empty,
                LinkHref = $"#/incidents/{incident.Id}",
                CreatedAt = _clock.UtcNow
            });
        }

        await _audit.LogAsync("moderation.decision", "Audit", userId.ToString(), true, $"{incident.IncidentReference} {fromVerification}->{incident.VerificationStatus}");
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = incident.Id,
            verificationStatus = incident.VerificationStatus.ToString(),
            status = incident.Status.ToString()
        });
    }

    [HttpGet("users")]
    [RequirePermission(Permission.AdminManageUsers)]
    public async Task<IActionResult> Users(CancellationToken ct)
    {
        var rows = await _db.AppUsers
            .OrderByDescending(u => u.ReputationScore)
            .Select(u => new
            {
                id = u.Id,
                displayName = u.DisplayName,
                email = u.Email,
                phoneNumber = u.PhoneNumber,
                role = u.Role.ToString(),
                isActive = u.IsActive,
                isPhoneVerified = u.IsPhoneVerified,
                reputationScore = u.ReputationScore,
                verifiedReports = u.VerifiedReports,
                helpfulVotes = u.HelpfulVotes,
                strikes = u.Strikes,
                createdAt = u.CreatedAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("users/{id:guid}/role")]
    [RequirePermission(Permission.AdminManageUsers)]
    public async Task<IActionResult> SetRole(Guid id, [FromBody] string role, CancellationToken ct)
    {
        if (!IsAdmin) throw new ForbiddenAppException("Only an administrator can change roles.");
        if (!Enum.TryParse<UserRole>(role, out var parsed))
            throw new ValidationAppException("Unknown role.");

        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundAppException("Account not found.");
        user.Role = parsed;
        user.UpdatedAt = _clock.UtcNow;
        await _audit.LogAsync("admin.role.change", "Audit", user.Id.ToString(), true, parsed.ToString());
        await _db.SaveChangesAsync(ct);
        return Ok(new { id, role = parsed.ToString() });
    }

    [HttpPost("users/{id:guid}/active")]
    [RequirePermission(Permission.AdminManageUsers)]
    public async Task<IActionResult> SetActive(Guid id, [FromBody] bool active, CancellationToken ct)
    {
        if (!IsAdmin) throw new ForbiddenAppException("Only an administrator can deactivate accounts.");
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundAppException("Account not found.");
        user.IsActive = active;
        user.UpdatedAt = _clock.UtcNow;
        await _audit.LogAsync("admin.user.active", "Audit", user.Id.ToString(), true, active.ToString());
        await _db.SaveChangesAsync(ct);
        return Ok(new { id, isActive = active });
    }

    [HttpGet("deletion-requests")]
    [RequirePermission(Permission.AdminManageUsers)]
    public async Task<IActionResult> DeletionRequests(CancellationToken ct)
    {
        var rows = await _db.PrivacyDeletionRequests
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { id = r.Id, userId = r.UserId, reason = r.Reason, status = r.Status, createdAt = r.CreatedAt, resolvedAt = r.ResolvedAt, adminNote = r.AdminNote })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("deletion-requests/{id:guid}")]
    [RequirePermission(Permission.AdminManageUsers)]
    public async Task<IActionResult> ResolveDeletion(Guid id, [FromBody] bool approved, CancellationToken ct)
    {
        if (!IsAdmin) throw new ForbiddenAppException("Only an administrator can resolve deletion requests.");
        var request = await _db.PrivacyDeletionRequests.FirstOrDefaultAsync(r => r.Id == id, ct)
                      ?? throw new NotFoundAppException("Request not found.");
        request.Status = approved ? "APPROVED" : "REJECTED";
        request.ResolvedAt = _clock.UtcNow;
        await _audit.LogAsync("privacy.deletion.resolve", "Audit", request.UserId.ToString(), true, request.Status);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id, status = request.Status });
    }

    [HttpGet("audit-log")]
    [RequirePermission(Permission.AdminViewAuditLog)]
    public IActionResult AuditLog() => Ok(new { note = "Audit events are written to the structured console log by ConsoleAuditLogger." });
}
