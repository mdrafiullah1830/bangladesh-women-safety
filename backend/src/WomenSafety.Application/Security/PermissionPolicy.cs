using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Security;

/// <summary>
/// Maps roles to permissions. Deny-by-default: if a permission is not listed, the role
/// does not have it (spec section 24).
/// </summary>
public static class PermissionPolicy
{
    private static readonly Dictionary<UserRole, HashSet<Permission>> RolePermissions = new()
    {
        [UserRole.VICTIM] = new()
        {
            Permission.IncidentCreateOwn,
            Permission.IncidentViewOwn,
            Permission.IncidentUpdateOwnStatus,
            Permission.ContactCreateOwn,
            Permission.ContactViewOwn,
            Permission.ContactUpdateOwn,
            Permission.ContactDeleteOwn,
            Permission.TripManageOwn,
            Permission.ShareManageOwn,
            Permission.PrivacyManageOwn,
            Permission.NotificationManageOwn,
            Permission.EvidenceManageOwn,
            Permission.ReferralCreateOwn,
            Permission.CommunityVote
        },
        [UserRole.TRUSTED_CONTACT] = new()
        {
            Permission.IncidentViewOwn,
            Permission.NotificationManageOwn,
            Permission.PrivacyManageOwn
        },
        [UserRole.RESPONDER] = new()
        {
            Permission.ResponderViewAssigned,
            Permission.ResponderUpdateAssignment,
            Permission.IncidentViewOwn,
            Permission.NotificationManageOwn,
            Permission.PrivacyManageOwn
        },
        [UserRole.MODERATOR] = new()
        {
            Permission.ModerationReview,
            Permission.IncidentViewOwn,
            Permission.ReferralCreateOwn,
            Permission.TripManageOwn,
            Permission.ShareManageOwn,
            Permission.PrivacyManageOwn,
            Permission.NotificationManageOwn,
            Permission.EvidenceManageOwn,
            Permission.CommunityVote
        },
        [UserRole.ADMIN] = new()
        {
            Permission.AdminManageUsers,
            Permission.AdminViewAuditLog,
            Permission.ModerationReview,
            Permission.IncidentViewOwn,
            Permission.ReferralCreateOwn,
            Permission.TripManageOwn,
            Permission.ShareManageOwn,
            Permission.PrivacyManageOwn,
            Permission.NotificationManageOwn,
            Permission.EvidenceManageOwn,
            Permission.CommunityVote
        }
    };

    public static bool IsGranted(UserRole role, Permission permission)
    {
        return RolePermissions.TryGetValue(role, out var permissions) && permissions.Contains(permission);
    }
}
