using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Application.Services;
using WomenSafety.Api.Authorization;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Emergency and incident endpoints (spec section 40).
///
/// Every route is scoped to the authenticated caller. Exact location is exposed only through
/// owner-scoped routes; the privacy-safe public projection lives in <see cref="PublicController"/>.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class IncidentsController : ControllerBase
{
    private readonly IncidentService _incidents;
    private readonly EmergencyWorkflowService _workflow;

    public IncidentsController(IncidentService incidents, EmergencyWorkflowService workflow)
    {
        _incidents = incidents;
        _workflow = workflow;
    }

    /// <summary>
    /// Creates an emergency incident. Safe to retry: the idempotency key means a repeated
    /// submission (for example after a dropped connection) returns the original incident
    /// instead of creating a second one.
    /// </summary>
    [HttpPost("emergency")]
    [RequirePermission(Permission.IncidentCreateOwn)]
    public async Task<ActionResult<object>> CreateEmergency([FromBody] CreateIncidentRequest request, CancellationToken ct)
    {
        var (userId, anonymousId) = CallerIdentity.Resolve(User);

        var outcome = await _incidents.CreateAsync(userId, anonymousId, request, ct);

        if (outcome.WasDuplicate || !request.NotifyTrustedContacts)
            return Ok(new { incident = outcome.Incident, duplicate = outcome.WasDuplicate });

        var dispatch = await _workflow.DispatchAsync(outcome.Incident.Id, ct);

        return CreatedAtAction(nameof(GetIncident), new { id = outcome.Incident.Id }, new
        {
            incident = outcome.Incident,
            duplicate = false,
            dispatch = new
            {
                dispatch.ContactsNotified,
                dispatch.ContactsQueued,
                dispatch.RespondersAlerted,
                dispatch.SmsAutoSendSupported,
                dispatch.SmsOneTapUri,
                dispatch.EmergencyDialUri,
                dispatch.HelplineDialUri,
                // Explicit wording so no UI can imply the platform contacted a service.
                notice = "A call shortcut is provided. No emergency service has been contacted by the platform."
            }
        });
    }

    /// <summary>Cancels / deactivates an incident. History is preserved, never deleted.</summary>
    [HttpPost("emergency/{id:guid}/cancel")]
    [RequirePermission(Permission.IncidentUpdateOwnStatus)]
    public async Task<ActionResult<IncidentOwnerView>> Cancel(Guid id, [FromBody] CancelIncidentRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var view = await _incidents.CancelAsync(userId, id, request, ct);

        if (view is null) throw new ForbiddenAppException("This incident does not belong to you or does not exist.");
        return Ok(view);
    }

    /// <summary>Owner-scoped incident detail, including the status timeline.</summary>
    [HttpGet("incidents/{id:guid}")]
    [RequirePermission(Permission.IncidentViewOwn)]
    public async Task<ActionResult<IncidentOwnerView>> GetIncident(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var view = await _incidents.GetOwnAsync(userId, id, ct);

        if (view is null) throw new NotFoundAppException("Incident not found.");
        return Ok(view);
    }

    /// <summary>The caller's own incidents, most recent first.</summary>
    [HttpGet("incidents")]
    [RequirePermission(Permission.IncidentViewOwn)]
    public async Task<ActionResult<IReadOnlyList<IncidentOwnerView>>> ListMine([FromQuery] int take = 50, CancellationToken ct = default)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(await _incidents.ListOwnAsync(userId, take, ct));
    }
}
