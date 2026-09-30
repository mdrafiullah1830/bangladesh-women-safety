namespace WomenSafety.Application.Abstractions;

/// <summary>
/// Cross-cutting provider abstractions. Each has a single-responsibility contract so that
/// infrastructure implementations can be swapped without touching application logic.
/// </summary>

public interface ISmsProvider
{
    bool CanSendAutomatically { get; }
    string? BuildOneTapUri(string phoneNumber, string body);
    Task<SmsResult> SendAsync(string phoneNumber, string body, CancellationToken ct = default);
}

public record SmsResult(bool Succeeded, string? Reference, string? FailureReason);

public interface IMapProvider
{
    string BuildLocationLink(double latitude, double longitude, double? accuracyMeters = null);
}

public interface IGeocodingProvider
{
    double DistanceMeters(double lat1, double lon1, double lat2, double lon2);
    Task<(double Latitude, double Longitude)?> GeocodeAsync(string address, CancellationToken ct = default);
}

public interface IEmergencyServiceProvider
{
    string Name { get; }
    bool SupportsProgrammaticDispatch { get; }
    string GetDialUri(string number);
}

public interface IPoliceProvider
{
    bool SupportsOfficialConfirmation { get; }
}

public record NotificationResult(bool Succeeded, string? Reference, string? FailureReason);

public interface ITrustedContactNotifier
{
    Task<NotificationResult> NotifyAsync(TrustedContactNotification notification, CancellationToken ct = default);
}

public record TrustedContactNotification(
    string IncidentReference,
    string ContactDisplayName,
    string ContactPhoneNumber,
    string? ContactPushToken,
    string TitleKey,
    string BodyKey,
    string? ApproximateLocationText,
    string? MapLink,
    double? SharedLatitude,
    double? SharedLongitude,
    string PreferredLanguage,
    bool IncludeExactLocation);

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public interface IAuditLogger
{
    Task LogAsync(
        string action,
        string? entityType,
        string? entityId,
        bool success,
        string? detail,
        CancellationToken ct = default);
}
