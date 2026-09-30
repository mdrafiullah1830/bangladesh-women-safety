using WomenSafety.Application.Security;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Tests;

public class PermissionPolicyTests
{
    [Theory]
    [InlineData(UserRole.VICTIM, Permission.IncidentCreateOwn, true)]
    [InlineData(UserRole.VICTIM, Permission.IncidentViewOwn, true)]
    [InlineData(UserRole.VICTIM, Permission.ModerationReview, false)]
    [InlineData(UserRole.VICTIM, Permission.AdminManageUsers, false)]
    [InlineData(UserRole.RESPONDER, Permission.ResponderViewAssigned, true)]
    [InlineData(UserRole.RESPONDER, Permission.ResponderUpdateAssignment, true)]
    [InlineData(UserRole.RESPONDER, Permission.IncidentCreateOwn, false)]
    [InlineData(UserRole.MODERATOR, Permission.ModerationReview, true)]
    [InlineData(UserRole.MODERATOR, Permission.ResponderViewAssigned, false)]
    [InlineData(UserRole.ADMIN, Permission.AdminManageUsers, true)]
    [InlineData(UserRole.ADMIN, Permission.AdminViewAuditLog, true)]
    [InlineData(UserRole.ADMIN, Permission.ModerationReview, true)]
    [InlineData(UserRole.TRUSTED_CONTACT, Permission.IncidentViewOwn, true)]
    [InlineData(UserRole.TRUSTED_CONTACT, Permission.IncidentCreateOwn, false)]
    public void IsGranted_ReturnsCorrectResult(UserRole role, Permission permission, bool expected)
    {
        Assert.Equal(expected, PermissionPolicy.IsGranted(role, permission));
    }
}
