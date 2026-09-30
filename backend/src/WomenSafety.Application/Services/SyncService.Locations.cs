using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class SyncService
{
    private async Task<List<SyncItemResult>> SyncLocationsAsync(
        Guid userId,
        string anonymousUserId,
        IReadOnlyList<SyncLocationItem> items,
        CancellationToken ct)
    {
        var results = new List<SyncItemResult>();

        foreach (var item in items)
        {
            var incident = item.IncidentId is not null
                ? await _db.Incidents.FirstOrDefaultAsync(
                    i => i.Id == item.IncidentId && i.UserId == userId, ct)
                : await _db.Incidents.FirstOrDefaultAsync(
                    i => i.IdempotencyKey == item.IncidentIdempotencyKey
                         && i.AnonymousUserId == anonymousUserId, ct);

            if (incident is null)
            {
                results.Add(new SyncItemResult
                {
                    IdempotencyKey = item.IncidentIdempotencyKey,
                    Accepted = false,
                    State = SyncState.SYNC_FAILED,
                    Message = "The referenced incident is not stored on the server yet."
                });
                continue;
            }

            var acknowledged = await _incidents.AddLocationAsync(userId, incident.Id, item.Location, ct);

            results.Add(new SyncItemResult
            {
                IdempotencyKey = item.IncidentIdempotencyKey,
                Accepted = acknowledged,
                ServerId = incident.Id,
                IncidentReference = incident.IncidentReference,
                State = acknowledged ? SyncState.DELIVERED : SyncState.SYNC_FAILED,
                Message = acknowledged ? "Location stored." : "Location rejected."
            });
        }

        return results;
    }
}
