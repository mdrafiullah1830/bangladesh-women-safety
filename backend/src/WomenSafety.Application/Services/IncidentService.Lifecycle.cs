using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class IncidentService
{
    public async Task<IncidentOwnerView?> CancelAsync(
        Guid userId, Guid incidentId, CancelIncidentRequest request, CancellationToken ct)
    {
        var incident = await _db.Incidents
            .FirstOrDefaultAsync(i => i.Id == incidentId && i.UserId == userId, ct);
        if (incident is null) return null;

        var fromStatus = incident.Status;
        incident.Status = IncidentStatus.EMERGENCY_CANCELLED;
        incident.UpdatedAt = _clock.UtcNow;

        _db.IncidentStatusHistory.Add(new IncidentStatusHistory
        {
            Id = Guid.NewGuid(), IncidentId = incident.Id,
            FromStatus = fromStatus, ToStatus = incident.Status,
            Note = request.Reason ?? "Cancelled by user.",
            SystemGenerated = false, CreatedAt = _clock.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("incident.cancel", "EmergencyIncident", incident.Id.ToString(),
            true, request.Reason, ct: ct);
        return IncidentMapper.ToOwnerView(incident);
    }

    public async Task<IncidentOwnerView?> GetOwnAsync(Guid userId, Guid incidentId, CancellationToken ct)
    {
        var incident = await _db.Incidents
            .FirstOrDefaultAsync(i => i.Id == incidentId && i.UserId == userId, ct);
        return incident is null ? null : IncidentMapper.ToOwnerView(incident);
    }

    public async Task<IReadOnlyList<IncidentOwnerView>> ListOwnAsync(
        Guid userId, int take, CancellationToken ct)
    {
        var incidents = await _db.Incidents
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .Take(Math.Clamp(take, 1, 200))
            .ToListAsync(ct);
        return incidents.Select(IncidentMapper.ToOwnerView).ToList();
    }

    private async Task<string> GenerateReferenceAsync(CancellationToken ct)
    {
        var year = _clock.UtcNow.Year;
        var count = await _db.Incidents.CountAsync(ct) + 1;
        return $"WS-{year}-{count:D6}";
    }
}
