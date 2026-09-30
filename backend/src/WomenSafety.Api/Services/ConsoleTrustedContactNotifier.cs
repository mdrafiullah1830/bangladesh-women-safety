using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Development trusted contact notifier that logs notifications to the console.
/// In production, this should integrate with FCM/APNs push and SMS gateways.
/// </summary>
public class ConsoleTrustedContactNotifier : ITrustedContactNotifier
{
    private readonly ILogger<ConsoleTrustedContactNotifier> _logger;

    public ConsoleTrustedContactNotifier(ILogger<ConsoleTrustedContactNotifier> logger)
        => _logger = logger;

    public Task<NotificationResult> NotifyAsync(
        TrustedContactNotification notification, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[NOTIFY-DEV] Incident={Ref} Contact={Name} Phone={Phone} MapLink={Map}",
            notification.IncidentReference,
            notification.ContactDisplayName,
            notification.ContactPhoneNumber,
            notification.MapLink ?? "(none)");

        return Task.FromResult(new NotificationResult(
            false, $"dev-{Guid.NewGuid():N}", "Dev provider: notification not actually sent."));
    }
}
