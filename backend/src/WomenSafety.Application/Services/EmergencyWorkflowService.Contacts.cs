using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class EmergencyWorkflowService
{
    private record ContactOutcome(int Delivered, int Queued, int Failed, string? OneTapUri);

    /// <summary>
    /// Notifies each trusted contact, recording an auditable attempt row. The result is
    /// deliberately honest: an attempt is only "delivered" when the provider said so.
    /// </summary>
    private async Task<ContactOutcome> NotifyTrustedContactsAsync(
        EmergencyIncident incident,
        IReadOnlyList<TrustedContact> contacts,
        CancellationToken ct)
    {
        var delivered = 0;
        var queued = 0;
        var failed = 0;
        string? oneTapUri = null;

        // The incident's privacy mode caps what a contact's own preference may request.
        foreach (var contact in contacts)
        {
            var precision = ResolvePrecision(incident, contact);
            var includeExact = precision is NearbyAlertPrecision.EXACT_LOCATION_AUTHORIZED;

            double? sharedLat = null;
            double? sharedLon = null;

            if (incident.LastLatitude is not null && incident.LastLongitude is not null)
            {
                if (includeExact)
                {
                    sharedLat = incident.LastLatitude;
                    sharedLon = incident.LastLongitude;
                }
                else
                {
                    var coarse = Domain.Common.PrivacyAggregation.CoarsenGrid(
                        incident.LastLatitude.Value, incident.LastLongitude.Value, 0.01);
                    sharedLat = coarse.Latitude;
                    sharedLon = coarse.Longitude;
                }
            }

            var mapLink = sharedLat is not null && sharedLon is not null
                ? _maps.BuildLocationLink(sharedLat.Value, sharedLon.Value,
                    includeExact ? incident.LastAccuracyMeters : 1000)
                : null;

            var notification = new TrustedContactNotification(
                IncidentReference: incident.IncidentReference,
                ContactDisplayName: contact.DisplayName,
                ContactPhoneNumber: contact.PhoneNumber,
                ContactPushToken: null,
                TitleKey: "notification.emergency.title",
                BodyKey: "notification.emergency.body",
                ApproximateLocationText: incident.AddressText ?? incident.District?.NameEn,
                MapLink: mapLink,
                SharedLatitude: sharedLat,
                SharedLongitude: sharedLon,
                PreferredLanguage: "bn",
                IncludeExactLocation: includeExact);

            var result = await _notifier.NotifyAsync(notification, ct);

            var attempt = new EmergencyContactAttempt
            {
                IncidentId = incident.Id,
                TrustedContactId = contact.Id,
                ContactDisplayNameSnapshot = contact.DisplayName,
                ContactPhoneSnapshotMasked = TrustedContactService.MaskPhone(contact.PhoneNumber),
                RelationshipSnapshot = contact.Relationship,
                Channel = contact.PreferredChannel,
                AttemptedAt = _clock.UtcNow,
                LocationPrecisionShared = precision,
                ProviderReference = result.Reference,
                FailureReason = result.Succeeded ? null : result.FailureReason,
                CreatedAt = _clock.UtcNow
            };

            if (result.Succeeded)
            {
                attempt.Outcome = ContactAttemptOutcome.DELIVERED;
                attempt.DeliveredAt = _clock.UtcNow;
                delivered++;
            }
            else
            {
                // Honest state: the attempt is queued, not delivered.
                attempt.Outcome = ContactAttemptOutcome.QUEUED_OFFLINE;
                queued++;

                if (contact.AllowSms && oneTapUri is null)
                {
                    oneTapUri = _sms.BuildOneTapUri(contact.PhoneNumber,
                        BuildEmergencySmsBody(incident.IncidentReference, incident.LastAccuracyMeters, mapLink));
                }
            }

            _db.EmergencyContactAttempts.Add(attempt);
        }

        return new ContactOutcome(delivered, queued, failed, oneTapUri);
    }

    private static NearbyAlertPrecision ResolvePrecision(EmergencyIncident incident, TrustedContact contact)
    {
        var permitted = incident.PrivacyMode switch
        {
            EmergencyPrivacyMode.MAXIMUM_PRIVACY => NearbyAlertPrecision.COARSE_AREA_ONLY,
            EmergencyPrivacyMode.BALANCED => NearbyAlertPrecision.APPROXIMATE_DISTANCE,
            _ => NearbyAlertPrecision.EXACT_LOCATION_AUTHORIZED
        };

        // The stricter of the two wins.
        return (NearbyAlertPrecision)Math.Min((int)permitted, (int)contact.LocationPrecision);
    }

    private static string BuildEmergencySmsBody(string incidentReference, double? accuracyMeters, string? mapLink)
    {
        var lines = new List<string>
        {
            "EMERGENCY ALERT",
            $"Incident ID: {incidentReference}",
            $"Time: {DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm} UTC"
        };

        if (mapLink is not null) lines.Add($"Approximate location: {mapLink}");
        if (accuracyMeters is not null) lines.Add($"Location accuracy: +/-{Math.Round(accuracyMeters.Value)} m");

        lines.Add("Status: Emergency active");
        lines.Add("Generated by a women safety emergency platform.");

        return string.Join('\n', lines);
    }
}
