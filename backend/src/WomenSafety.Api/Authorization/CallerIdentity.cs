using System.Security.Claims;
using WomenSafety.Application.Exceptions;

namespace WomenSafety.Api.Authorization;

/// <summary>
/// Resolves the caller's identity pair from the validated JWT claims.
/// Centralised so every controller reads the same claims and failures are consistent.
/// </summary>
public static class CallerIdentity
{
    public static (Guid UserId, string AnonymousUserId) Resolve(ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? principal.FindFirstValue("sub");

        if (!Guid.TryParse(raw, out var userId))
            throw new AuthenticationAppException("The access token is missing a subject claim.");

        var anonymous = principal.FindFirstValue("anon");
        return (userId, string.IsNullOrWhiteSpace(anonymous) ? userId.ToString("N") : anonymous);
    }
}
