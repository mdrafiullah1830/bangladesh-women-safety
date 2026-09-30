using Microsoft.EntityFrameworkCore;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public partial class EmergencyWorkflowService
{
    /// <summary>
    /// Alerts approved, on-duty responders whose coverage area is close enough.
    /// The responder learns only a coarse distance band (spec section 15) - never the
    /// victim's identity, contact details or exact position.
    /// </summary>
    private async Task<int> AlertNearbyRespondersAsync(EmergencyIncident incident, CancellationToken ct)
    {
        if (incident.LastLatitude is null || incident.LastLongitude is null) return 0;

        // A user who has not consented to nearby sharing is never exposed to responders.
        if (incident.PrivacyMode is EmergencyPrivacyMode.MAXIMUM_PRIVACY) return 0;

        var responders = await _db.Responders
            .Where(r => r.IsApproved && r.IsOnDuty
                        && r.CenterLatitude != null && r.CenterLongitude != null)
            .ToListAsync(ct);

        var alerted = 0;

        foreach (var responder in responders)
        {
            var distance = _geocoding.DistanceMeters(
                incident.LastLatitude.Value, incident.LastLongitude.Value,
                responder.CenterLatitude!.Value, responder.CenterLongitude!.Value);

            if (distance > responder.CoverageRadiusMeters) continue;

            // Coarse banding: a responder is never handed a precise distance.
            var banded = distance switch
            {
                < 250 => 250,
                < 500 => 350,
                < 1000 => 750,
                < 2000 => 1500,
                < 5000 => 3000,
                _ => 5000
            };

            _db.ResponderAssignments.Add(new ResponderAssignment
            {
                IncidentId = incident.Id,
                ResponderId = responder.Id,
                Status = ResponderAssignmentStatus.ALERTED,
                InformationShared = NearbyAlertPrecision.APPROXIMATE_DISTANCE,
                ReportedDistanceMeters = banded,
                AlertedAt = _clock.UtcNow,
                CreatedAt = _clock.UtcNow
            });

            alerted++;
        }

        return alerted;
    }

    /// <summary>
    /// Responder-facing alert text. Contains no victim identity and no exact coordinates
    /// (spec section 15).
    /// </summary>
    public string BuildResponderAlertText(int bandedDistanceMeters)
        => $"Emergency reported approximately {bandedDistanceMeters} m from your coverage area. " +
           "Open your responder dashboard for the authorized action.";
}
