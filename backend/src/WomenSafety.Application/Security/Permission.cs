using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Security;

/// <summary>
/// Granular permissions mapped to application actions. The <see cref="PermissionPolicy"/>
/// decides which roles receive which permissions (spec section 24).
/// </summary>
public enum Permission
{
    IncidentCreateOwn,
    IncidentViewOwn,
    IncidentUpdateOwnStatus,
    ContactCreateOwn,
    ContactViewOwn,
    ContactUpdateOwn,
    ContactDeleteOwn,
    ResponderViewAssigned,
    ResponderUpdateAssignment,
    ModerationReview,
    AdminManageUsers,
    AdminViewAuditLog,
    TripManageOwn,
    ShareManageOwn,
    PrivacyManageOwn,
    NotificationManageOwn,
    EvidenceManageOwn,
    ReferralCreateOwn,
    CommunityVote
}
