using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Privacy centre: consent register, full data export and the account deletion request
/// workflow. Exports only ever contain the caller's own rows.
/// </summary>
[ApiController]
[Route("api/privacy")]
[Authorize]
public class PrivacyController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public PrivacyController(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    private static readonly string[] KnownConsents =
    {
        "privacy_policy", "location_tracking", "trusted_contact_alerts",
        "anonymous_statistics", "browser_notifications", "marketing_messages"
    };

    [HttpGet("consents")]
    public async Task<IActionResult> Consents(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var stored = await _db.UserConsents.Where(c => c.UserId == userId).ToListAsync(ct);
        var byKey = stored.GroupBy(c => c.ConsentKey).ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.GrantedAt).First());

        return Ok(KnownConsents.Select(key => new
        {
            key,
            granted = byKey.TryGetValue(key, out var record) && record.Granted,
            updatedAt = byKey.TryGetValue(key, out var record2) ? record2.GrantedAt : (DateTimeOffset?)null
        }));
    }

    [HttpPut("consents")]
    public async Task<IActionResult> SetConsents([FromBody] List<ConsentRequest> requests, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        foreach (var request in requests)
        {
            if (string.IsNullOrWhiteSpace(request.ConsentKey))
                throw new ValidationAppException("Consent key is required.");

            _db.UserConsents.Add(new UserConsent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ConsentKey = request.ConsentKey.Trim(),
                Granted = request.Granted,
                Source = "privacy_centre",
                GrantedAt = _clock.UtcNow
            });
        }

        await _audit.LogAsync("privacy.consent", "Audit", userId.ToString(), true, string.Join(",", requests.Select(r => $"{r.ConsentKey}={r.Granted}")));
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = requests.Count });
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var (userId, anonymousId) = CallerIdentity.Resolve(User);

        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundAppException("Account not found.");

        var incidents = await _db.Incidents.Where(i => i.UserId == userId).ToListAsync(ct);
        var incidentIds = incidents.Select(i => i.Id).ToList();

        var payload = new
        {
            exportedAt = _clock.UtcNow,
            account = new
            {
                id = user.Id,
                displayName = user.DisplayName,
                email = user.Email,
                phoneNumber = user.PhoneNumber,
                role = user.Role.ToString(),
                preferredLanguage = user.PreferredLanguage,
                defaultPrivacyMode = user.DefaultPrivacyMode.ToString(),
                createdAt = user.CreatedAt,
                reputationScore = user.ReputationScore
            },
            consents = await _db.UserConsents.Where(c => c.UserId == userId).ToListAsync(ct),
            trustedContacts = await _db.TrustedContacts.Where(c => c.UserId == userId).ToListAsync(ct),
            incidents,
            incidentLocations = await _db.IncidentLocations.Where(l => incidentIds.Contains(l.IncidentId)).ToListAsync(ct),
            incidentStatusHistory = await _db.IncidentStatusHistory.Where(h => incidentIds.Contains(h.IncidentId)).ToListAsync(ct),
            evidence = await _db.IncidentEvidences.Where(m => incidentIds.Contains(m.IncidentId)).Select(m => new { m.Id, m.FileName, m.Sha256, m.SizeBytes, m.CapturedAt }).ToListAsync(ct),
            trips = await _db.Trips.Where(t => t.UserId == userId).ToListAsync(ct),
            tripCheckIns = await _db.TripCheckIns.Where(c => _db.Trips.Any(t => t.Id == c.TripId && t.UserId == userId)).ToListAsync(ct),
            shares = await _db.LocationShares.Where(s => s.UserId == userId).ToListAsync(ct),
            notifications = await _db.UserNotifications.Where(n => n.UserId == userId).ToListAsync(ct),
            devices = await _db.Devices.Where(d => d.UserId == userId).ToListAsync(ct),
            referrals = await _db.PoliceReferrals.Where(r => r.UserId == userId).ToListAsync(ct),
            anonymousIdentity = anonymousId
        };

        await _audit.LogAsync("privacy.export", "Audit", userId.ToString(), true, $"incidents={incidents.Count}");
        return Ok(payload);
    }

    [HttpGet("deletion-request")]
    public async Task<IActionResult> DeletionStatus(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var rows = await _db.PrivacyDeletionRequests.Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        return Ok(rows.Select(r => new { id = r.Id, reason = r.Reason, status = r.Status, createdAt = r.CreatedAt, resolvedAt = r.ResolvedAt, adminNote = r.AdminNote }));
    }

    [HttpPost("deletion-request")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> RequestDeletion([FromBody] DeletionRequestDto request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new ValidationAppException("Tell us why you are requesting deletion.");

        var record = new PrivacyDeletionRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Reason = request.Reason.Trim(),
            Status = "PENDING",
            CreatedAt = _clock.UtcNow
        };
        _db.PrivacyDeletionRequests.Add(record);
        await _audit.LogAsync("privacy.deletion.request", "Audit", userId.ToString(), true, record.Id.ToString());
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = record.Id,
            status = record.Status,
            note = "Your request is queued. An administrator reviews deletion requests; your data stays private until then."
        });
    }
}
