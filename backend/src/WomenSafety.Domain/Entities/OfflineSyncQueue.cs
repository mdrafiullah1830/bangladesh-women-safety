using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class OfflineSyncQueue
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? DeviceId { get; set; }
    public string IdempotencyKey { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public SyncState State { get; set; }
    public DateTimeOffset? ClientRecordedAt { get; set; }
    public Guid? EntityId { get; set; }
    public bool ServerReceived { get; set; }
    public bool Processed { get; set; }
    public bool Delivered { get; set; }
    public DateTimeOffset? FirstAttemptAt { get; set; }
    public DateTimeOffset? LastAttemptAt { get; set; }
    public int AttemptCount { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset? NextAttemptAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
