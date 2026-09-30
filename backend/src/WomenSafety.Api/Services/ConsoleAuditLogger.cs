using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Console-based audit logger for development. In production this should write to
/// a structured log sink with correlation IDs.
/// </summary>
public class ConsoleAuditLogger : IAuditLogger
{
    private readonly ILogger<ConsoleAuditLogger> _logger;

    public ConsoleAuditLogger(ILogger<ConsoleAuditLogger> logger) => _logger = logger;

    public Task LogAsync(
        string action, string? entityType, string? entityId,
        bool success, string? detail, CancellationToken ct = default)
    {
        _logger.LogInformation("[AUDIT] {Action} {EntityType}:{EntityId} Success={Success} {Detail}",
            action, entityType, entityId, success, detail);
        return Task.CompletedTask;
    }
}
