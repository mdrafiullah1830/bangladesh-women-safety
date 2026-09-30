using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Server side of the offline-first contract (spec sections 8, 41 and 67).
///
/// Guarantees:
///  - an idempotency key is honoured, so a retried batch never creates duplicate incidents;
///  - every accepted payload gets an <see cref="OfflineSyncQueue"/> row whose state advances
///    PENDING -> SERVER_RECEIVED -> PROCESSED -> DELIVERED, so the device can clear its local
///    copy only once the server has confirmed;
///  - a payload the server could not accept is never reported as accepted.
/// </summary>
public partial class SyncService
{
    private readonly IAppDbContext _db;
    private readonly IncidentService _incidents;
    private readonly EmergencyWorkflowService _workflow;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public SyncService(
        IAppDbContext db,
        IncidentService incidents,
        EmergencyWorkflowService workflow,
        IClock clock,
        IAuditLogger audit)
    {
        _db = db;
        _incidents = incidents;
        _workflow = workflow;
        _clock = clock;
        _audit = audit;
    }

    public async Task<SyncBatchResponse> SyncAsync(
        Guid userId,
        string anonymousUserId,
        SyncBatchRequest request,
        CancellationToken ct = default)
    {
        var results = new List<SyncItemResult>();

        // Device lookup is best-effort; a missing device must not block an emergency sync.
        Guid? deviceId = null;
        if (!string.IsNullOrWhiteSpace(request.DeviceInstallationId))
        {
            deviceId = await _db.Devices
                .Where(d => d.InstallationId == request.DeviceInstallationId)
                .Select(d => (Guid?)d.Id)
                .FirstOrDefaultAsync(ct);
        }

        results.AddRange(await SyncIncidentsAsync(userId, anonymousUserId, deviceId, request.Incidents, ct));
        results.AddRange(await SyncLocationsAsync(userId, anonymousUserId, request.Locations, ct));

        await _audit.LogAsync("sync.batch", "SyncBatch", null, true,
            $"incidents={request.Incidents.Count} locations={request.Locations.Count}", ct: ct);

        return new SyncBatchResponse { ServerTime = _clock.UtcNow, Results = results };
    }

    /// <summary>Exponential backoff with jitter, capped at 10 minutes.</summary>
    public static TimeSpan ComputeBackoff(int attemptCount)
    {
        var exponent = Math.Clamp(attemptCount, 1, 10);
        var seconds = Math.Min(600, Math.Pow(2, exponent));
        var jitter = Random.Shared.NextDouble() * 0.25 * seconds;
        return TimeSpan.FromSeconds(seconds + jitter);
    }

    private static string Truncate(string value, int max)
        => value.Length <= max ? value : value[..max];
}
