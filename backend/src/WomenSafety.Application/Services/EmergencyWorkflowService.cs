using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Exceptions;
using WomenSafety.Domain.Common;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

public record EmergencyDispatchSummary
{
    public string IncidentReference { get; init; } = string.Empty;
    public int ContactsNotified { get; init; }
    public int ContactsQueued { get; init; }
    public int ContactsFailed { get; init; }
    public int RespondersAlerted { get; init; }
    public string? SmsOneTapUri { get; init; }
    public string? EmergencyDialUri { get; init; }
    public string? HelplineDialUri { get; init; }
    public bool SmsAutoSendSupported { get; init; }
}

/// <summary>
/// Orchestrates the emergency response cascade (spec sections 4, 10, 14, 15, 43 and 56):
/// trusted contacts -> privacy-limited nearby responders -> authority instruction.
///
/// Two rules are non-negotiable:
///  1. A recipient is marked DELIVERED only when a provider actually confirmed delivery.
///  2. Nearby responders receive a coarse distance band, never the victim's exact position,
///     unless the incident's privacy mode explicitly authorises better precision.
/// </summary>
public partial class EmergencyWorkflowService
{
    private readonly IAppDbContext _db;
    private readonly ITrustedContactNotifier _notifier;
    private readonly ISmsProvider _sms;
    private readonly IMapProvider _maps;
    private readonly IGeocodingProvider _geocoding;
    private readonly IEmergencyServiceProvider _emergency;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public EmergencyWorkflowService(
        IAppDbContext db,
        ITrustedContactNotifier notifier,
        ISmsProvider sms,
        IMapProvider maps,
        IGeocodingProvider geocoding,
        IEmergencyServiceProvider emergency,
        IClock clock,
        IAuditLogger audit)
    {
        _db = db;
        _notifier = notifier;
        _sms = sms;
        _maps = maps;
        _geocoding = geocoding;
        _emergency = emergency;
        _clock = clock;
        _audit = audit;
    }

    public async Task<EmergencyDispatchSummary> DispatchAsync(Guid incidentId, CancellationToken ct = default)
    {
        var incident = await _db.Incidents
            .Include(i => i.District).Include(i => i.Division)
            .FirstOrDefaultAsync(i => i.Id == incidentId, ct)
            ?? throw new NotFoundAppException("Incident not found.");

        var contacts = incident.UserId is null
            ? new List<TrustedContact>()
            : await _db.TrustedContacts
                .Where(c => c.UserId == incident.UserId)
                .OrderBy(c => c.Priority)
                .ToListAsync(ct);

        var outcome = await NotifyTrustedContactsAsync(incident, contacts, ct);

        // ---- Authority instruction (never a claim of contact) ------------------------
        if (incident.IsEmergency && incident.AuthorityContactState == AuthorityContactState.NOT_ATTEMPTED)
        {
            incident.AuthorityContactState = AuthorityContactState.USER_INSTRUCTED_TO_CALL;
            incident.AuthorityContactInitiatedAt = _clock.UtcNow;
        }

        var respondersAlerted = await AlertNearbyRespondersAsync(incident, ct);

        incident.ContactNotificationState = outcome.Delivered > 0
            ? ContactAttemptOutcome.DELIVERED
            : contacts.Count > 0 ? ContactAttemptOutcome.QUEUED_OFFLINE : ContactAttemptOutcome.NOT_ATTEMPTED;

        if (respondersAlerted > 0) incident.ResponderNotificationState = ContactAttemptOutcome.INITIATED;
        if (outcome.Delivered > 0 && incident.FirstContactNotifiedAt is null)
            incident.FirstContactNotifiedAt = _clock.UtcNow;

        incident.UpdatedAt = _clock.UtcNow;

        _db.IncidentStatusHistory.Add(new IncidentStatusHistory
        {
            IncidentId = incident.Id,
            FromStatus = incident.Status,
            ToStatus = incident.Status,
            Note = $"Emergency cascade: {outcome.Delivered} delivered, {outcome.Queued} queued, {respondersAlerted} responders alerted",
            SystemGenerated = true,
            CreatedAt = _clock.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync("incident.dispatch", "EmergencyIncident", incident.Id.ToString(), true,
            $"delivered={outcome.Delivered} queued={outcome.Queued} responders={respondersAlerted}", ct: ct);

        return new EmergencyDispatchSummary
        {
            IncidentReference = incident.IncidentReference,
            ContactsNotified = outcome.Delivered,
            ContactsQueued = outcome.Queued,
            ContactsFailed = outcome.Failed,
            RespondersAlerted = respondersAlerted,
            SmsOneTapUri = outcome.OneTapUri,
            EmergencyDialUri = _emergency.GetDialUri(BangladeshEmergencyNumbers.National999),
            HelplineDialUri = _emergency.GetDialUri(BangladeshEmergencyNumbers.Helpline109),
            SmsAutoSendSupported = _sms.CanSendAutomatically
        };
    }
}
