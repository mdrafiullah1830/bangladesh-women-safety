using WomenSafety.Application.Contracts;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Utility methods for incident data transformation.
/// </summary>
public static class IncidentMapper
{
    /// <summary>
    /// Returns a human-readable accuracy label based on the numeric accuracy
    /// and the source of the fix. Used in location trail responses so the UI
    /// can correctly caveat approximate positions.
    /// </summary>
    public static string AccuracyLabel(double? accuracyMeters, LocationSource source)
    {
        if (accuracyMeters is null) return "unknown";

        return source switch
        {
            LocationSource.GPS when accuracyMeters <= 10 => "high_accuracy",
            LocationSource.GPS when accuracyMeters <= 30 => "moderate_accuracy",
            LocationSource.GPS => "low_accuracy",
            LocationSource.NETWORK when accuracyMeters <= 100 => "moderate_accuracy",
            LocationSource.NETWORK => "coarse_estimation",
            LocationSource.PASSIVE => "coarse_estimation",
            LocationSource.FUSED when accuracyMeters <= 50 => "moderate_accuracy",
            LocationSource.FUSED => "coarse_estimation",
            _ => "unknown"
        };
    }

    /// <summary>
    /// Maps a domain entity to the owner-scoped view.
    /// </summary>
    public static IncidentOwnerView ToOwnerView(Domain.Entities.EmergencyIncident incident) => new()
    {
        Id = incident.Id,
        IncidentReference = incident.IncidentReference,
        IsEmergency = incident.IsEmergency,
        Status = incident.Status,
        VerificationStatus = incident.VerificationStatus,
        PrivacyMode = incident.PrivacyMode,
        Description = incident.Description,
        AddressText = incident.AddressText,
        LastLatitude = incident.LastLatitude,
        LastLongitude = incident.LastLongitude,
        LastAccuracyMeters = incident.LastAccuracyMeters,
        AuthorityContactState = incident.AuthorityContactState,
        ContactNotificationState = incident.ContactNotificationState,
        ResponderNotificationState = incident.ResponderNotificationState,
        CreatedAt = incident.CreatedAt,
        UpdatedAt = incident.UpdatedAt
    };
}
