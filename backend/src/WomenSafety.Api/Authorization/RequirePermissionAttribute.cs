using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Authorization;

/// <summary>
/// Enforces a <see cref="Permission"/> from <see cref="PermissionPolicy"/> on an action.
/// Deny-by-default: an unauthenticated caller or a role without the permission gets 403.
/// Using a single filter keeps authorization consistent and auditable (spec section 24).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAuthorizationFilter
{
    public RequirePermissionAttribute(Permission permission) => Permission = permission;

    public Permission Permission { get; }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "authentication_required",
                message = "Authentication is required for this action."
            });
            return;
        }

        var roleClaim = user.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (!Enum.TryParse<UserRole>(roleClaim, out var role) || !PermissionPolicy.IsGranted(role, Permission))
        {
            context.Result = new ObjectResult(new
            {
                error = "forbidden",
                message = $"Your role does not permit this action ({Permission})."
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}
