using System.Security.Claims;
using System.Security.Cryptography;
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
/// Case management on top of the incident lifecycle: editing a report, the status timeline,
/// evidence upload, police referrals and community votes.
/// </summary>
[ApiController]
[Route("api/incidents")]
[Authorize]
public class IncidentCaseController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;
    private readonly IWebHostEnvironment _env;

    public IncidentCaseController(IAppDbContext db, IClock clock, IAuditLogger audit, IWebHostEnvironment env)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
        _env = env;
    }

    private string Role => User.FindFirstValue(ClaimTypes.Role) ?? nameof(UserRole.VICTIM);
    private bool IsModerator => Role is nameof(UserRole.MODERATOR) or nameof(UserRole.ADMIN);

    private async Task<EmergencyIncident> LoadAsync(Guid id, Guid userId, CancellationToken ct)
    {
        var incident = await _db.Incidents.FirstOrDefaultAsync(i => i.Id == id, ct)
                       ?? throw new NotFoundAppException("Incident not found.");
        if (incident.UserId != userId && !IsModerator)
            throw new ForbiddenAppException("You can only view your own incidents.");
        return incident;
    }

    // ─── Report editing ────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/detail")]
    public async Task<IActionResult> Detail(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await LoadAsync(id, userId, ct);

        var district = incident.DistrictId is null
            ? null
            : await _db.Districts.FirstOrDefaultAsync(d => d.Id == incident.DistrictId, ct);

        var evidence = await _db.IncidentEvidences
            .Where(m => m.IncidentId == id)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(ct);

        var referral = await _db.PoliceReferrals
            .Where(r => r.IncidentId == id)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync(ct);

        var timeline = await TimelineRowsAsync(id, ct);

        return Ok(new
        {
            id = incident.Id,
            reference = incident.IncidentReference,
            title = incident.Title,
            category = incident.Category.ToString(),
            status = incident.Status.ToString(),
            verificationStatus = incident.VerificationStatus.ToString(),
            isEmergency = incident.IsEmergency,
            description = incident.Description,
            addressText = incident.AddressText,
            districtId = incident.DistrictId,
            districtName = district?.NameEn,
            divisionId = incident.DivisionId,
            occurredAt = incident.OccurredAt,
            createdAt = incident.CreatedAt,
            updatedAt = incident.UpdatedAt,
            lastLatitude = incident.LastLatitude,
            lastLongitude = incident.LastLongitude,
            authorityContactState = incident.AuthorityContactState.ToString(),
            contactNotificationState = incident.ContactNotificationState.ToString(),
            responderNotificationState = incident.ResponderNotificationState.ToString(),
            evidence = evidence.Select(EvidenceView),
            referral = referral is null ? null : new
            {
                id = referral.Id,
                stationName = referral.StationName,
                reference = referral.Reference,
                status = referral.Status.ToString(),
                submittedAt = referral.SubmittedAt,
                acknowledgedAt = referral.AcknowledgedAt,
                notes = referral.Notes
            },
            timeline
        });
    }

    [HttpPut("{id:guid}")]
    [RequirePermission(Permission.IncidentUpdateOwnStatus)]
    public async Task<IActionResult> UpdateReport(Guid id, [FromBody] UpdateIncidentReportRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await LoadAsync(id, userId, ct);

        if (request.Title is not null) incident.Title = Truncate(request.Title, 200);
        if (request.Category is not null) incident.Category = request.Category.Value;
        if (request.Description is not null) incident.Description = Truncate(request.Description, 4000);
        if (request.OccurredAt is not null) incident.OccurredAt = request.OccurredAt;
        if (request.AddressText is not null) incident.AddressText = Truncate(request.AddressText, 512);

        if (request.DistrictId is not null)
        {
            var district = await _db.Districts.FirstOrDefaultAsync(d => d.Id == request.DistrictId, ct)
                           ?? throw new ValidationAppException("Unknown district.");
            incident.DistrictId = district.Id;
            incident.DivisionId = district.DivisionId;
        }

        incident.UpdatedAt = _clock.UtcNow;
        await _audit.LogAsync("incident.update", "Audit", userId.ToString(), true, incident.IncidentReference);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = incident.Id, updated = true });
    }

    // ─── Timeline & transitions ────────────────────────────────────────────────

    [HttpGet("{id:guid}/timeline")]
    public async Task<IActionResult> Timeline(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        await LoadAsync(id, userId, ct);
        return Ok(await TimelineRowsAsync(id, ct));
    }

    [HttpPost("{id:guid}/transition")]
    public async Task<IActionResult> Transition(Guid id, [FromBody] TransitionRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await LoadAsync(id, userId, ct);

        if (!IsModerator && request.ToStatus is IncidentStatus.VERIFIED or IncidentStatus.REJECTED)
            throw new ForbiddenAppException("Only moderators can apply this status.");

        if (!AllowedTransitions.TryGetValue(incident.Status, out var allowed) || !allowed.Contains(request.ToStatus))
            throw new ValidationAppException($"Cannot move from {incident.Status} to {request.ToStatus}.");

        var from = incident.Status;
        incident.Status = request.ToStatus;
        if (request.ToStatus is IncidentStatus.VERIFIED)
            incident.VerificationStatus = VerificationStatus.VERIFIED_CASE;
        if (request.ToStatus is IncidentStatus.AWAITING_VERIFICATION)
            incident.VerificationStatus = VerificationStatus.PENDING_REVIEW;
        incident.UpdatedAt = _clock.UtcNow;

        _db.IncidentStatusHistory.Add(new IncidentStatusHistory
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            FromStatus = from,
            ToStatus = request.ToStatus,
            Note = request.Note,
            SystemGenerated = false,
            CreatedAt = _clock.UtcNow
        });

        if (incident.UserId is not null)
        {
            _db.UserNotifications.Add(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = incident.UserId.Value,
                IncidentId = incident.Id,
                Type = "STATUS",
                TitleEn = "Incident status updated",
                TitleBn = "ঘটনার অবস্থা হালনাগাদ হয়েছে",
                BodyEn = $"{incident.IncidentReference} moved to {request.ToStatus}.",
                BodyBn = $"{incident.IncidentReference} এখন {request.ToStatus}।",
                LinkHref = $"#/incidents/{incident.Id}",
                CreatedAt = _clock.UtcNow
            });
        }

        await _audit.LogAsync("incident.transition", "Audit", userId.ToString(), true, $"{incident.IncidentReference} {from}->{request.ToStatus}");
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = incident.Id, from = from.ToString(), to = request.ToStatus.ToString() });
    }

    // ─── Evidence ──────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/evidence")]
    [RequirePermission(Permission.EvidenceManageOwn)]
    public async Task<IActionResult> ListEvidence(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        await LoadAsync(id, userId, ct);
        var rows = await _db.IncidentEvidences.Where(m => m.IncidentId == id).OrderByDescending(m => m.CreatedAt).ToListAsync(ct);
        return Ok(rows.Select(EvidenceView));
    }

    [HttpPost("{id:guid}/evidence")]
    [RequestSizeLimit(8_000_000)]
    [RequirePermission(Permission.EvidenceManageOwn)]
    public async Task<IActionResult> UploadEvidence(Guid id, [FromBody] EvidenceRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await LoadAsync(id, userId, ct);

        var payload = request.Base64;
        if (payload.Contains(',')) payload = payload[(payload.IndexOf(',') + 1)..];
        byte[] bytes;
        try { bytes = Convert.FromBase64String(payload); }
        catch { throw new ValidationAppException("Base64 payload could not be decoded."); }
        if (bytes.Length == 0) throw new ValidationAppException("Empty upload.");
        if (bytes.Length > 6_000_000) throw new ValidationAppException("Maximum evidence size is 6 MB.");

        var root = Path.Combine(_env.ContentRootPath, "App_Data", "evidence");
        System.IO.Directory.CreateDirectory(root);
        var fileName = $"{Guid.NewGuid():N}{ExtensionFor(request.ContentType)}";
        var fullPath = Path.Combine(root, fileName);
        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        var record = new IncidentEvidence
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            FileName = Truncate(request.FileName, 256),
            ContentType = string.IsNullOrWhiteSpace(request.ContentType) ? "application/octet-stream" : request.ContentType,
            SizeBytes = bytes.Length,
            Sha256 = Convert.ToHexString(SHA256.HashData(bytes)),
            StoragePath = Path.Combine("App_Data", "evidence", fileName),
            Caption = request.Caption,
            IsBlurred = request.IsBlurred,
            Visibility = EvidenceVisibility.OWNER_AND_MODERATOR,
            CapturedAt = request.CapturedAt ?? _clock.UtcNow,
            CreatedAt = _clock.UtcNow
        };

        _db.IncidentEvidences.Add(record);
        incident.UpdatedAt = _clock.UtcNow;
        await _audit.LogAsync("incident.evidence.add", "Audit", userId.ToString(), true, incident.IncidentReference);
        await _db.SaveChangesAsync(ct);
        return Ok(EvidenceView(record));
    }

    [HttpGet("{id:guid}/evidence/{evidenceId:guid}/content")]
    [RequirePermission(Permission.EvidenceManageOwn)]
    public async Task<IActionResult> EvidenceContent(Guid id, Guid evidenceId, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        await LoadAsync(id, userId, ct);
        var record = await _db.IncidentEvidences.FirstOrDefaultAsync(m => m.Id == evidenceId && m.IncidentId == id, ct)
                     ?? throw new NotFoundAppException("Evidence not found.");
        var path = Path.Combine(_env.ContentRootPath, record.StoragePath);
        if (!System.IO.File.Exists(path)) throw new NotFoundAppException("Stored file is missing.");
        var bytes = await System.IO.File.ReadAllBytesAsync(path, ct);
        return Ok(new { record.FileName, record.ContentType, base64 = Convert.ToBase64String(bytes), record.Sha256, record.IsBlurred, capturedAt = record.CapturedAt });
    }

    // ─── Police referral ───────────────────────────────────────────────────────

    [HttpPost("{id:guid}/referral")]
    [RequirePermission(Permission.ReferralCreateOwn)]
    public async Task<IActionResult> CreateReferral(Guid id, [FromBody] ReferralRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await LoadAsync(id, userId, ct);
        if (incident.Status is IncidentStatus.CLOSED or IncidentStatus.REJECTED)
            throw new ValidationAppException("This incident is closed and cannot be referred.");

        District? district = null;
        if (request.DistrictId is not null)
            district = await _db.Districts.FirstOrDefaultAsync(d => d.Id == request.DistrictId, ct);
        district ??= incident.DistrictId is null
            ? null
            : await _db.Districts.FirstOrDefaultAsync(d => d.Id == incident.DistrictId, ct);

        var reference = $"BD-{(district?.Code ?? "GEN")}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        var referral = new PoliceReferral
        {
            Id = Guid.NewGuid(),
            IncidentId = incident.Id,
            UserId = incident.UserId,
            DistrictId = district?.Id,
            StationName = Truncate(request.StationName, 256),
            Reference = reference,
            Status = request.Submit ? ReferralStatus.SUBMITTED : ReferralStatus.DRAFT,
            LetterBody = BuildReferralLetter(incident, district, request.StationName, request.Notes),
            Notes = request.Notes,
            CreatedAt = _clock.UtcNow,
            SubmittedAt = request.Submit ? _clock.UtcNow : null
        };

        _db.PoliceReferrals.Add(referral);

        if (request.Submit && incident.Status != IncidentStatus.POLICE_REFERRED)
        {
            _db.IncidentStatusHistory.Add(new IncidentStatusHistory
            {
                Id = Guid.NewGuid(),
                IncidentId = incident.Id,
                FromStatus = incident.Status,
                ToStatus = IncidentStatus.POLICE_REFERRED,
                Note = $"Referred to {request.StationName} ({reference})",
                SystemGenerated = true,
                CreatedAt = _clock.UtcNow
            });
            incident.Status = IncidentStatus.POLICE_REFERRED;
            incident.AuthorityContactState = AuthorityContactState.ATTEMPTED;
            incident.AuthorityContactInitiatedAt = _clock.UtcNow;
        }

        incident.UpdatedAt = _clock.UtcNow;
        if (incident.UserId is not null)
        {
            _db.UserNotifications.Add(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = incident.UserId.Value,
                IncidentId = incident.Id,
                Type = "REFERRAL",
                TitleEn = "Police referral created",
                TitleBn = "পুলিশ রেফারেল তৈরি হয়েছে",
                BodyEn = $"Reference {reference}",
                BodyBn = $"রেফারেন্স {reference}",
                LinkHref = $"#/incidents/{incident.Id}",
                CreatedAt = _clock.UtcNow
            });
        }

        await _audit.LogAsync("incident.referral", "Audit", userId.ToString(), true, reference);
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = referral.Id, reference, status = referral.Status.ToString(), letter = referral.LetterBody });
    }

    [HttpGet("referrals")]
    public async Task<IActionResult> MyReferrals(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var rows = await _db.PoliceReferrals
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.Id,
                incidentId = r.IncidentId,
                stationName = r.StationName,
                reference = r.Reference,
                status = r.Status.ToString(),
                createdAt = r.CreatedAt,
                submittedAt = r.SubmittedAt,
                acknowledgedAt = r.AcknowledgedAt,
                notes = r.Notes
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("referrals/{referralId:guid}/status")]
    public async Task<IActionResult> UpdateReferralStatus(Guid referralId, [FromBody] ReferralStatusRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var referral = await _db.PoliceReferrals.FirstOrDefaultAsync(r => r.Id == referralId, ct)
                       ?? throw new NotFoundAppException("Referral not found.");
        if (referral.UserId != userId && !IsModerator)
            throw new ForbiddenAppException("You can only update your own referrals.");

        referral.Status = request.Status;
        if (!string.IsNullOrWhiteSpace(request.Notes)) referral.Notes = request.Notes;
        if (request.Status == ReferralStatus.SUBMITTED && referral.SubmittedAt is null) referral.SubmittedAt = _clock.UtcNow;
        if (request.Status == ReferralStatus.ACKNOWLEDGED) referral.AcknowledgedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { id = referral.Id, status = referral.Status.ToString() });
    }

    // ─── Community votes ───────────────────────────────────────────────────────

    [HttpPost("{id:guid}/vote")]
    [RequirePermission(Permission.CommunityVote)]
    public async Task<IActionResult> Vote(Guid id, [FromBody] VoteRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var incident = await _db.Incidents.FirstOrDefaultAsync(i => i.Id == id, ct)
                       ?? throw new NotFoundAppException("Incident not found.");
        if (incident.UserId == userId) throw new ValidationAppException("You cannot vote on your own report.");

        var existing = await _db.ReportVotes
            .FirstOrDefaultAsync(v => v.IncidentId == id && v.VoterUserId == userId, ct);

        if (existing is null)
        {
            _db.ReportVotes.Add(new ReportVote
            {
                Id = Guid.NewGuid(),
                IncidentId = id,
                VoterUserId = userId,
                IsHelpful = request.IsHelpful,
                CreatedAt = _clock.UtcNow
            });
        }
        else
        {
            existing.IsHelpful = request.IsHelpful;
        }

        if (incident.UserId is not null)
        {
            var owner = await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == incident.UserId, ct);
            if (owner is not null)
            {
                owner.HelpfulVotes = await _db.ReportVotes.CountAsync(v => v.IncidentId == id && v.IsHelpful, ct);
                owner.ReputationScore = owner.HelpfulVotes + owner.VerifiedReports * 5 - owner.Strikes * 10;
            }
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { voted = true, helpful = request.IsHelpful });
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private async Task<List<object>> TimelineRowsAsync(Guid incidentId, CancellationToken ct)
    {
        var rows = await _db.IncidentStatusHistory
            .Where(h => h.IncidentId == incidentId)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(ct);

        return rows.Select(h => (object)new
        {
            id = h.Id,
            from = h.FromStatus.ToString(),
            to = h.ToStatus.ToString(),
            note = h.Note,
            systemGenerated = h.SystemGenerated,
            at = h.CreatedAt
        }).ToList();
    }

    private static object EvidenceView(IncidentEvidence m) => new
    {
        id = m.Id,
        fileName = m.FileName,
        contentType = m.ContentType,
        sizeBytes = m.SizeBytes,
        sha256 = m.Sha256,
        caption = m.Caption,
        isBlurred = m.IsBlurred,
        visibility = m.Visibility.ToString(),
        capturedAt = m.CapturedAt,
        createdAt = m.CreatedAt
    };

    private static string ExtensionFor(string contentType) => contentType?.ToLowerInvariant() switch
    {
        "image/png" => ".png",
        "image/gif" => ".gif",
        "image/webp" => ".webp",
        "video/mp4" => ".mp4",
        "audio/mpeg" => ".mp3",
        "application/pdf" => ".pdf",
        _ => ".jpg"
    };

    private static string? Truncate(string? value, int max)
        => value is null ? null : value.Length <= max ? value : value[..max];

    private static string BuildReferralLetter(EmergencyIncident incident, District? district, string station, string? notes)
        => $"""
           বিষয়: নারী নির্যাতন/ঝুঁকিমূলক ঘটনার প্রতিবেদন ও ব্যবস্থাগত নির্দেশনা প্রদান।

           মহোদয়,
           অধিনায়ক, {station}।

           ১। ঘটনার রেফারেন্স : {incident.IncidentReference}
           ২। ঘটনার ধরন        : {incident.Category}
           ৩। অনুমোদিত অবস্থা : {incident.Status}
           ৪। তারিখ            : {(incident.OccurredAt ?? incident.CreatedAt).ToUniversalTime():yyyy-MM-dd HH:mm} UTC
           ৫। এলাকা            : {district?.NameEn ?? incident.AddressText ?? "নির্দিষ্ট নয়"}
           ৬। বিবরণ            : {incident.Description ?? "বিবরণ সংযুক্ত নয়"}
           {notes}

           উপরের বিষয়ে আইনানুগ ব্যবস্থা গ্রহণের জন্য অনুরোধ করা হলো।
           এই প্ল্যাটফর্ম কোনো সরকারি সংস্থার পক্ষে কাজ করে না — রেফারেলটি ব্যবহারকারীর
           পক্ষে প্রস্তুত করা একটি প্রতিবেদন।
           """;

    private static readonly Dictionary<IncidentStatus, HashSet<IncidentStatus>> AllowedTransitions = new()
    {
        [IncidentStatus.DRAFT] = new() { IncidentStatus.OPEN, IncidentStatus.CLOSED },
        [IncidentStatus.OPEN] = new() { IncidentStatus.AWAITING_VERIFICATION, IncidentStatus.EMERGENCY_ACTIVE, IncidentStatus.CLOSED },
        [IncidentStatus.EMERGENCY_ACTIVE] = new() { IncidentStatus.EMERGENCY_CANCELLED, IncidentStatus.OPEN, IncidentStatus.AWAITING_VERIFICATION },
        [IncidentStatus.EMERGENCY_CANCELLED] = new() { IncidentStatus.OPEN, IncidentStatus.CLOSED },
        [IncidentStatus.AWAITING_VERIFICATION] = new() { IncidentStatus.VERIFIED, IncidentStatus.REJECTED, IncidentStatus.OPEN },
        [IncidentStatus.VERIFIED] = new() { IncidentStatus.POLICE_REFERRED, IncidentStatus.RESOLVED, IncidentStatus.CLOSED },
        [IncidentStatus.POLICE_REFERRED] = new() { IncidentStatus.RESOLVED, IncidentStatus.CLOSED },
        [IncidentStatus.RESOLVED] = new() { IncidentStatus.CLOSED },
        [IncidentStatus.CLOSED] = new() { },
        [IncidentStatus.DUPLICATE] = new() { },
        [IncidentStatus.REJECTED] = new() { IncidentStatus.OPEN }
    };
}
