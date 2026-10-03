namespace WomenSafety.Domain.Enums;

public enum UserRole
{
    VICTIM,
    TRUSTED_CONTACT,
    RESPONDER,
    MODERATOR,
    ADMIN
}

public enum VerificationStatus
{
    UNVERIFIED,
    PENDING_REVIEW,
    VERIFIED_CASE,
    OFFICIALLY_CONFIRMED,
    REJECTED
}

public enum IncidentStatus
{
    DRAFT,
    OPEN,
    EMERGENCY_ACTIVE,
    EMERGENCY_CANCELLED,
    AWAITING_VERIFICATION,
    VERIFIED,
    POLICE_REFERRED,
    RESOLVED,
    CLOSED,
    DUPLICATE,
    REJECTED
}

public enum ContactAttemptOutcome
{
    NOT_ATTEMPTED,
    QUEUED_OFFLINE,
    DELIVERED,
    FAILED,
    INITIATED
}

public enum EmergencyPrivacyMode
{
    MAXIMUM_PRIVACY,
    BALANCED,
    SHARE_EXACT_LOCATION
}

public enum NearbyAlertPrecision
{
    COARSE_AREA_ONLY,
    APPROXIMATE_DISTANCE,
    EXACT_LOCATION_AUTHORIZED
}

public enum AuthorityContactState
{
    NOT_ATTEMPTED,
    USER_INSTRUCTED_TO_CALL,
    ATTEMPTED,
    CONFIRMED
}

public enum ResponderAssignmentStatus
{
    ALERTED,
    ACCEPTED,
    EN_ROUTE,
    ON_SCENE,
    COMPLETED,
    CANCELLED
}

public enum SyncState
{
    PENDING,
    UPLOADING,
    SERVER_RECEIVED,
    PROCESSED,
    DELIVERED,
    RETRY_SCHEDULED,
    SYNC_FAILED
}

public enum LocationSource
{
    GPS,
    NETWORK,
    PASSIVE,
    FUSED
}

public enum IncidentCategory
{
    HARASSMENT,
    STALKING,
    DOMESTIC_VIOLENCE,
    SEXUAL_ASSAULT,
    CYBER_HARASSMENT,
    WORKPLACE_HARASSMENT,
    ACID_ATTACK,
    TRAFFICKING,
    ROBBERY,
    ROAD_ACCIDENT,
    OTHER
}

public enum OtpPurpose
{
    REGISTER,
    LOGIN,
    RESET_PASSWORD,
    PHONE_VERIFY
}

public enum TripStatus
{
    ACTIVE,
    COMPLETED,
    AUTO_ESCALATED,
    CANCELLED
}

public enum EvidenceVisibility
{
    OWNER_ONLY,
    OWNER_AND_MODERATOR,
    PUBLIC_REDACTED
}

public enum ReferralStatus
{
    DRAFT,
    SUBMITTED,
    ACKNOWLEDGED,
    CLOSED
}

public enum DirectoryCategory
{
    POLICE,
    HOSPITAL,
    FIRE_SERVICE,
    AMBULANCE,
    LEGAL_AID,
    COUNSELING,
    SAFE_PLACE,
    SHELTER,
    ONE_STOP,
    GOVERNMENT,
    WOMEN_CENTRE,
    HELP_CENTRE,
    WOMEN_POLICE_DESK
}

public enum LegalResourceCategory
{
    LAW,
    TRIBUNAL,
    LEGAL_AID,
    HOTLINE,
    GUIDE
}
