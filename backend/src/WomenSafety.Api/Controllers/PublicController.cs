using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Services;
using WomenSafety.Domain.Common;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Anonymous public endpoints: platform capabilities, official emergency numbers and the
/// terminology legend (spec sections 10, 20, 49 and 77).
///
/// Nothing here can return an individual's identity, contact details or precise location.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class PublicController : ControllerBase
{
    private readonly ISmsProvider _sms;
    private readonly IEmergencyServiceProvider _emergency;
    private readonly IPoliceProvider _police;

    public PublicController(ISmsProvider sms, IEmergencyServiceProvider emergency, IPoliceProvider police)
    {
        _sms = sms;
        _emergency = emergency;
        _police = police;
    }

    /// <summary>
    /// Platform capability disclosure. This exists so clients - and auditors - can see exactly
    /// which integrations are real on this deployment instead of discovering a fake success
    /// during an emergency (spec section 77).
    /// </summary>
    [HttpGet("capabilities")]
    public IActionResult Capabilities() => Ok(new ConnectivityStatusView
    {
        ServerReachable = true,
        CheckedAt = DateTimeOffset.UtcNow,
        ProviderName = _emergency.Name,
        SmsAutoSendSupported = _sms.CanSendAutomatically,
        EmergencyDispatchApiSupported = _emergency.SupportsProgrammaticDispatch,
        OfficialPoliceConfirmationSupported = _police.SupportsOfficialConfirmation
    });

    /// <summary>Official emergency numbers with one-tap dial URIs.</summary>
    [HttpGet("emergency-numbers")]
    public IActionResult EmergencyNumbers() => Ok(new[]
    {
        new
        {
            service = "National Emergency Service",
            serviceBn = "\u099c\u09be\u09a4\u09c0\u09df \u099c\u09b0\u09c1\u09b0\u09bf \u09b8\u09c7\u09ac\u09be",
            number = BangladeshEmergencyNumbers.National999,
            dialUri = _emergency.GetDialUri(BangladeshEmergencyNumbers.National999),
            programmaticDispatchSupported = _emergency.SupportsProgrammaticDispatch
        },
        new
        {
            service = "Violence Against Women and Children Helpline",
            serviceBn = "\u09a8\u09be\u09b0\u09c0 \u0993 \u09b6\u09bf\u09b6\u09c1 \u09a8\u09bf\u09b0\u09cd\u09af\u09be\u09a4\u09a8 \u09ac\u09bf\u09b0\u09cb\u09a7\u09c0 \u09b9\u09c7\u09b2\u09cd\u09aa\u09b2\u09be\u0987\u09a8",
            number = BangladeshEmergencyNumbers.Helpline109,
            dialUri = _emergency.GetDialUri(BangladeshEmergencyNumbers.Helpline109),
            programmaticDispatchSupported = _emergency.SupportsProgrammaticDispatch
        },
        new
        {
            service = "National Health Helpline",
            serviceBn = "\u09b8\u09cd\u09ac\u09be\u09b8\u09cd\u09a5\u09cd\u09af \u09ac\u09be\u09a4\u09be\u09df\u09a8",
            number = BangladeshEmergencyNumbers.Health16263,
            dialUri = _emergency.GetDialUri(BangladeshEmergencyNumbers.Health16263),
            programmaticDispatchSupported = false
        }
    });

    /// <summary>Terminology legend that every dashboard renders next to its numbers.</summary>
    [HttpGet("definitions")]
    public IActionResult Definitions([FromQuery] string lang = "en")
        => Ok(AnalyticsService.BuildDefinitions(lang));
}
