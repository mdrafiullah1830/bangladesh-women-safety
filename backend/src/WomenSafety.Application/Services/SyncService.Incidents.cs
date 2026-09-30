using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class SyncService
{
    private async Task<List<SyncItemResult>> SyncIncidentsAsync(
        Guid userId,
        string anonymousUserId,
        Guid? deviceId,
        IReadOnlyList<SyncIncidentItem> items,
        CancellationToken ct)
    {
        var results = new List<SyncItemResult>();

        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.IdempotencyKey))
            {
                results.Add(new SyncItemResult
                {
                    IdempotencyKey = string.Empty,
                    Accepted = false,
                    State = SyncState.SYNC_FAILED,
                    Message = "IdempotencyKey is required for every queued incident."
                });
                continue;
            }

            var existing = await _db.Incidents
                .FirstOrDefaultAsync(i => i.IdempotencyKey == item.IdempotencyKey
                                          && i.AnonymousUserId == anonymousUserId, ct);

            if (existing is not null)
            {
                results.Add(new SyncItemResult
                {
                    IdempotencyKey = item.IdempotencyKey,
                    Accepted = true,
                    Duplicate = true,
                    ServerId = existing.Id,
                    IncidentReference = existing.IncidentReference,
                    State = existing.SyncState,
                    Message = "Already stored on the server; no duplicate was created."
                });
                continue;
            }

            var queueEntry = await UpsertQueueEntryAsync(
                userId, deviceId, item.IdempotencyKey, "incident", item.Incident.ClientRecordedAt, ct);

            queueEntry.State = SyncState.UPLOADING;
            queueEntry.FirstAttemptAt ??= _clock.UtcNow;
            queueEntry.LastAttemptAt = _clock.UtcNow;
            queueEntry.AttemptCount += 1;
            await _db.SaveChangesAsync(ct);

            try
            {
                var outcome = await _incidents.CreateAsync(userId, anonymousUserId, item.Incident, ct);

                queueEntry.EntityId = outcome.Incident.Id;
                queueEntry.ServerReceived = true;
                queueEntry.State = SyncState.SERVER_RECEIVED;
                await _db.SaveChangesAsync(ct);

                // The cascade runs only after the incident is durably stored, so a dispatch
                // failure can never lose the incident itself.
                await _workflow.DispatchAsync(outcome.Incident.Id, ct);

                queueEntry.Processed = true;
                queueEntry.Delivered = true;
                queueEntry.State = SyncState.DELIVERED;
                queueEntry.CompletedAt = _clock.UtcNow;
                await _db.SaveChangesAsync(ct);

                results.Add(new SyncItemResult
                {
                    IdempotencyKey = item.IdempotencyKey,
                    Accepted = true,
                    ServerId = outcome.Incident.Id,
                    IncidentReference = outcome.Incident.IncidentReference,
                    State = SyncState.DELIVERED,
                    Message = "Stored on the server and dispatch attempted."
                });
            }
            catch (Exception ex)
            {
                queueEntry.ServerReceived = false;
                queueEntry.State = SyncState.RETRY_SCHEDULED;
                queueEntry.LastError = Truncate(ex.Message, 2000);
                queueEntry.NextAttemptAt = _clock.UtcNow.Add(ComputeBackoff(queueEntry.AttemptCount));
                await _db.SaveChangesAsync(ct);

                results.Add(new SyncItemResult
                {
                    IdempotencyKey = item.IdempotencyKey,
                    Accepted = false,
                    State = SyncState.RETRY_SCHEDULED,
                    Message = "The server could not store this incident yet. It remains queued on the device."
                });
            }
        }

        return results;
    }

    private async Task<OfflineSyncQueue> UpsertQueueEntryAsync(
        Guid userId, Guid? deviceId, string idempotencyKey, string entityType,
        DateTimeOffset? clientRecordedAt, CancellationToken ct)
    {
        var entry = await _db.OfflineSyncQueue
            .FirstOrDefaultAsync(q => q.IdempotencyKey == idempotencyKey, ct);

        if (entry is not null) return entry;

        entry = new OfflineSyncQueue
        {
            UserId = userId,
            DeviceId = deviceId,
            IdempotencyKey = idempotencyKey,
            EntityType = entityType,
            State = SyncState.PENDING,
            ClientRecordedAt = clientRecordedAt ?? _clock.UtcNow,
            CreatedAt = _clock.UtcNow
        };

        _db.OfflineSyncQueue.Add(entry);
        return entry;
    }
}
