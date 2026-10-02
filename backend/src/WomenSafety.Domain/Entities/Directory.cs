using WomenSafety.Domain.Enums;

namespace WomenSafety.Domain.Entities;

public class EmergencyNumberEntry
{
    public Guid Id { get; set; }
    public string Service { get; set; } = string.Empty;
    public string ServiceBn { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string DialUri { get; set; } = string.Empty;
    public DirectoryCategory Category { get; set; }
    public string? NoteEn { get; set; }
    public string? NoteBn { get; set; }
    public bool Is24x7 { get; set; } = true;
    public int SortOrder { get; set; }
}

public class ServiceDirectoryEntry
{
    public Guid Id { get; set; }
    public DirectoryCategory Category { get; set; }
    public string NameEn { get; set; } = string.Empty;
    public string NameBn { get; set; } = string.Empty;
    public Guid? DistrictId { get; set; }
    public Guid? DivisionId { get; set; }
    public string? AddressEn { get; set; }
    public string? AddressBn { get; set; }
    public string? PhoneNumber { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool Is24x7 { get; set; }
    public bool IsVerified { get; set; }
    public string? SourceUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public District? District { get; set; }
    public Division? Division { get; set; }
}

public class LegalResource
{
    public Guid Id { get; set; }
    public LegalResourceCategory Category { get; set; }
    public string TitleEn { get; set; } = string.Empty;
    public string TitleBn { get; set; } = string.Empty;
    public string SummaryEn { get; set; } = string.Empty;
    public string SummaryBn { get; set; } = string.Empty;
    public string? LawReference { get; set; }
    public string? Phone { get; set; }
    public string? Website { get; set; }
    public Guid? DistrictId { get; set; }
    public int SortOrder { get; set; }

    public District? District { get; set; }
}

public class SafetyTip
{
    public Guid Id { get; set; }
    public string Category { get; set; } = "GENERAL";
    public string TitleEn { get; set; } = string.Empty;
    public string TitleBn { get; set; } = string.Empty;
    public string BodyEn { get; set; } = string.Empty;
    public string BodyBn { get; set; } = string.Empty;
    public bool NightOnly { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
