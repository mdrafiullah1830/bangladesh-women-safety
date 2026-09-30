using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Creates and manages incident records (spec sections 4, 6 and 40).
/// Every public method takes a userId and verifies ownership before mutating
/// or returning data. A duplicate idempotency key is detected and returned
/// instead of creating a second incident.
/// </summary>
public partial class IncidentService
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public IncidentService(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    public record CreateOutcome(IncidentOwnerView Incident, bool WasDuplicate);

    public async Task<CreateOutcome> CreateAsync(
        Guid? userId, string anonymousUserId,
        CreateIncidentRequest request, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.Incidents
                .FirstOrDefaultAsync(i => i.IdempotencyKey == request.IdempotencyKey
                    && i.AnonymousUserId == anonymousUserId, ct);
            if (existing is not null)
                return new CreateOutcome(IncidentMapper.ToOwnerView(existing), true);
        }

        Guid? districtId = null;
        Guid? divisionId = null;
        if (request.Latitude is not null && request.Longitude is not null)
        {
            var district = await FindNearestDistrictAsync(request.Latitude.Value, request.Longitude.Value, ct);
            if (district is not null) { districtId = district.Id; divisionId = district.DivisionId; }
        }

        var incident = new EmergencyIncident
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AnonymousUserId = anonymousUserId,
            IdempotencyKey = request.IdempotencyKey,
            IncidentReference = await GenerateReferenceAsync(ct),
            IsEmergency = request.IsEmergency,
            Status = request.IsEmergency ? IncidentStatus.EMERGENCY_ACTIVE : IncidentStatus.OPEN,
            VerificationStatus = VerificationStatus.UNVERIFIED,
            PrivacyMode = request.PrivacyMode,
            AuthorityContactState = AuthorityContactState.NOT_ATTEMPTED,
            ContactNotificationState = ContactAttemptOutcome.NOT_ATTEMPTED,
            ResponderNotificationState = ContactAttemptOutcome.NOT_ATTEMPTED,
            Description = request.Description,
            AddressText = request.AddressText,
            DistrictId = districtId, DivisionId = divisionId,
            LastLatitude = request.Latitude, LastLongitude = request.Longitude,
            LastAccuracyMeters = request.AccuracyMeters,
            CreatedAt = _clock.UtcNow, UpdatedAt = _clock.UtcNow
        };

        _db.Incidents.Add(incident);
        _db.IncidentStatusHistory.Add(new IncidentStatusHistory
        {
            Id = Guid.NewGuid(), IncidentId = incident.Id,
            FromStatus = IncidentStatus.DRAFT, ToStatus = incident.Status,
            Note = "Incident created.", SystemGenerated = true, CreatedAt = _clock.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("incident.create", "EmergencyIncident", incident.Id.ToString(),
            true, $"emergency={request.IsEmergency}", ct: ct);
        return new CreateOutcome(IncidentMapper.ToOwnerView(incident), false);
    }
}
