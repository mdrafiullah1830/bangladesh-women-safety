using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class PoliceReferral
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Guid? UserId { get; set; }
    public Guid? DistrictId { get; set; }
    public string StationName { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public ReferralStatus Status { get; set; } = ReferralStatus.DRAFT;
    public string LetterBody { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SubmittedAt { get; set; }
    public DateTimeOffset? AcknowledgedAt { get; set; }

    public EmergencyIncident? Incident { get; set; }
    public District? District { get; set; }
}

public class ReportVote
{
    public Guid Id { get; set; }
    public Guid IncidentId { get; set; }
    public Guid VoterUserId { get; set; }
    public bool IsHelpful { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
