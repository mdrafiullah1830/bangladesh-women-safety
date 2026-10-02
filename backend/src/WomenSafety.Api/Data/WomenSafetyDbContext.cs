using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using WomenSafety.Application.Abstractions;
using WomenSafety.Domain.Entities;

namespace WomenSafety.Api.Data;

/// <summary>
/// EF Core DbContext implementing <see cref="IAppDbContext"/>.
/// SQLite chosen for local development and the offline-first mobile workflow.
///
/// SQLite has no DateTimeOffset type: it stores one as TEXT, which the provider refuses to
/// use in ORDER BY or range comparisons. Every DateTimeOffset column is therefore stored as
/// UTC ticks (an order-preserving integer) and converted back on materialisation.
/// </summary>
public class WomenSafetyDbContext : DbContext, IAppDbContext
{
    private static readonly ValueConverter<DateTimeOffset, long> OffsetToTicks =
        new(value => value.UtcTicks, value => new DateTimeOffset(value, TimeSpan.Zero));

    private static readonly ValueConverter<DateTimeOffset?, long?> NullableOffsetToTicks =
        new(value => value.HasValue ? value.Value.UtcTicks : null,
            value => value.HasValue ? new DateTimeOffset(value.Value, TimeSpan.Zero) : null);

    public WomenSafetyDbContext(DbContextOptions<WomenSafetyDbContext> options) : base(options) { }

    public DbSet<EmergencyIncident> Incidents => Set<EmergencyIncident>();
    public DbSet<TrustedContact> TrustedContacts => Set<TrustedContact>();
    public DbSet<EmergencyContactAttempt> EmergencyContactAttempts => Set<EmergencyContactAttempt>();
    public DbSet<IncidentStatusHistory> IncidentStatusHistory => Set<IncidentStatusHistory>();
    public DbSet<IncidentLocation> IncidentLocations => Set<IncidentLocation>();
    public DbSet<Responder> Responders => Set<Responder>();
    public DbSet<ResponderAssignment> ResponderAssignments => Set<ResponderAssignment>();
    public DbSet<OfflineSyncQueue> OfflineSyncQueue => Set<OfflineSyncQueue>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<DataSource> DataSources => Set<DataSource>();
    public DbSet<Division> Divisions => Set<Division>();
    public DbSet<District> Districts => Set<District>();

    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<OtpCode> OtpCodes => Set<OtpCode>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UserConsent> UserConsents => Set<UserConsent>();
    public DbSet<UserNotification> UserNotifications => Set<UserNotification>();
    public DbSet<LocationShare> LocationShares => Set<LocationShare>();
    public DbSet<PrivacyDeletionRequest> PrivacyDeletionRequests => Set<PrivacyDeletionRequest>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripCheckIn> TripCheckIns => Set<TripCheckIn>();
    public DbSet<IncidentEvidence> IncidentEvidences => Set<IncidentEvidence>();
    public DbSet<EmergencyNumberEntry> EmergencyNumberEntries => Set<EmergencyNumberEntry>();
    public DbSet<ServiceDirectoryEntry> ServiceDirectoryEntries => Set<ServiceDirectoryEntry>();
    public DbSet<LegalResource> LegalResources => Set<LegalResource>();
    public DbSet<SafetyTip> SafetyTips => Set<SafetyTip>();
    public DbSet<PoliceReferral> PoliceReferrals => Set<PoliceReferral>();
    public DbSet<ReportVote> ReportVotes => Set<ReportVote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                    property.SetValueConverter(OffsetToTicks);
                else if (property.ClrType == typeof(DateTimeOffset?))
                    property.SetValueConverter(NullableOffsetToTicks);
            }
        }

        // ─── EmergencyIncident ──────────────────────────────────────
        modelBuilder.Entity<EmergencyIncident>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.AnonymousUserId).HasMaxLength(64);
            e.Property(i => i.IdempotencyKey).HasMaxLength(128);
            e.Property(i => i.IncidentReference).HasMaxLength(32);
            e.Property(i => i.Title).HasMaxLength(200);
            e.HasIndex(i => new { i.AnonymousUserId, i.IdempotencyKey }).IsUnique();
            e.HasIndex(i => i.UserId);
            e.HasIndex(i => i.CreatedAt);
            e.HasOne(i => i.District).WithMany().HasForeignKey(i => i.DistrictId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(i => i.Division).WithMany().HasForeignKey(i => i.DivisionId).OnDelete(DeleteBehavior.SetNull);
        });

        // ─── TrustedContact ─────────────────────────────────────────
        modelBuilder.Entity<TrustedContact>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.DisplayName).HasMaxLength(128);
            e.Property(c => c.PhoneNumber).HasMaxLength(32);
            e.HasIndex(c => c.UserId);
        });

        // ─── EmergencyContactAttempt ────────────────────────────────
        modelBuilder.Entity<EmergencyContactAttempt>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.ContactDisplayNameSnapshot).HasMaxLength(128);
            e.Property(a => a.ContactPhoneSnapshotMasked).HasMaxLength(32);
            e.HasIndex(a => a.IncidentId);
        });

        // ─── IncidentStatusHistory ──────────────────────────────────
        modelBuilder.Entity<IncidentStatusHistory>(e =>
        {
            e.HasKey(h => h.Id);
            e.HasIndex(h => h.IncidentId);
        });

        // ─── IncidentLocation ───────────────────────────────────────
        modelBuilder.Entity<IncidentLocation>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => new { l.IncidentId, l.RecordedAt });
        });

        // ─── Responder ──────────────────────────────────────────────
        modelBuilder.Entity<Responder>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.DisplayName).HasMaxLength(128);
        });

        // ─── ResponderAssignment ────────────────────────────────────
        modelBuilder.Entity<ResponderAssignment>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasIndex(a => a.IncidentId);
        });

        // ─── OfflineSyncQueue ───────────────────────────────────────
        modelBuilder.Entity<OfflineSyncQueue>(e =>
        {
            e.HasKey(q => q.Id);
            e.Property(q => q.IdempotencyKey).HasMaxLength(128);
            e.HasIndex(q => q.IdempotencyKey);
            e.HasIndex(q => new { q.UserId, q.State });
        });

        // ─── Device ────────────────────────────────────────────────
        modelBuilder.Entity<Device>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.InstallationId).HasMaxLength(128);
            e.HasIndex(d => d.InstallationId).IsUnique();
        });

        // ─── DataSource ─────────────────────────────────────────────
        modelBuilder.Entity<DataSource>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).HasMaxLength(256);
        });

        // ─── Division / District ────────────────────────────────────
        modelBuilder.Entity<Division>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.Code).HasMaxLength(16);
            e.Property(d => d.NameBn).HasMaxLength(128);
            e.Property(d => d.NameEn).HasMaxLength(128);
        });

        modelBuilder.Entity<District>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.Code).HasMaxLength(16);
            e.Property(d => d.NameBn).HasMaxLength(128);
            e.Property(d => d.NameEn).HasMaxLength(128);
            e.HasOne(d => d.Division).WithMany(div => div.Districts).HasForeignKey(d => d.DivisionId);
        });

        // ─── Identity ──────────────────────────────────────────────
        modelBuilder.Entity<AppUser>(e =>
        {
            e.HasKey(u => u.Id);
            e.Property(u => u.PhoneNumber).HasMaxLength(32);
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.DisplayName).HasMaxLength(128);
            e.Property(u => u.PasswordHash).HasMaxLength(512);
            e.Property(u => u.PreferredLanguage).HasMaxLength(8);
            e.HasIndex(u => u.PhoneNumber);
            e.HasIndex(u => u.Email);
            e.HasOne(u => u.District).WithMany().HasForeignKey(u => u.DistrictId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(u => u.Division).WithMany().HasForeignKey(u => u.DivisionId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OtpCode>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.Destination).HasMaxLength(256);
            e.Property(o => o.Code).HasMaxLength(12);
            e.HasIndex(o => new { o.Destination, o.Purpose, o.ConsumedAt });
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Token).HasMaxLength(128);
            e.HasIndex(r => r.Token).IsUnique();
            e.HasIndex(r => r.UserId);
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserConsent>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.ConsentKey).HasMaxLength(64);
            e.HasIndex(c => new { c.UserId, c.ConsentKey });
        });

        // ─── Notifications / sharing / privacy ─────────────────────
        modelBuilder.Entity<UserNotification>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Type).HasMaxLength(48);
            e.Property(n => n.TitleEn).HasMaxLength(256);
            e.Property(n => n.TitleBn).HasMaxLength(256);
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
        });

        modelBuilder.Entity<LocationShare>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Token).HasMaxLength(64);
            e.Property(s => s.Note).HasMaxLength(256);
            e.HasIndex(s => s.Token).IsUnique();
            e.HasIndex(s => s.UserId);
        });

        modelBuilder.Entity<PrivacyDeletionRequest>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.Reason).HasMaxLength(1000);
            e.Property(r => r.Status).HasMaxLength(32);
            e.HasIndex(r => r.UserId);
        });

        // ─── Trips ─────────────────────────────────────────────────
        modelBuilder.Entity<Trip>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Title).HasMaxLength(128);
            e.Property(t => t.DestinationText).HasMaxLength(256);
            e.Property(t => t.TransportMode).HasMaxLength(32);
            e.HasIndex(t => new { t.UserId, t.Status });
            e.HasOne(t => t.TrustedContact).WithMany().HasForeignKey(t => t.TrustedContactId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TripCheckIn>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Respondent).HasMaxLength(32);
            e.HasIndex(c => new { c.TripId, c.CreatedAt });
        });

        // ─── Evidence ──────────────────────────────────────────────
        modelBuilder.Entity<IncidentEvidence>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.FileName).HasMaxLength(256);
            e.Property(m => m.ContentType).HasMaxLength(128);
            e.Property(m => m.Sha256).HasMaxLength(64);
            e.Property(m => m.StoragePath).HasMaxLength(512);
            e.HasIndex(m => m.IncidentId);
        });

        // ─── Directory / legal / tips ──────────────────────────────
        modelBuilder.Entity<EmergencyNumberEntry>(e =>
        {
            e.HasKey(n => n.Id);
            e.Property(n => n.Service).HasMaxLength(128);
            e.Property(n => n.ServiceBn).HasMaxLength(128);
            e.Property(n => n.Number).HasMaxLength(32);
            e.Property(n => n.DialUri).HasMaxLength(64);
            e.HasIndex(n => n.SortOrder);
        });

        modelBuilder.Entity<ServiceDirectoryEntry>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.NameEn).HasMaxLength(256);
            e.Property(d => d.NameBn).HasMaxLength(256);
            e.Property(d => d.AddressEn).HasMaxLength(512);
            e.Property(d => d.AddressBn).HasMaxLength(512);
            e.Property(d => d.PhoneNumber).HasMaxLength(32);
            e.HasIndex(d => d.Category);
            e.HasIndex(d => d.DistrictId);
            e.HasOne(d => d.District).WithMany().HasForeignKey(d => d.DistrictId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(d => d.Division).WithMany().HasForeignKey(d => d.DivisionId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<LegalResource>(e =>
        {
            e.HasKey(l => l.Id);
            e.Property(l => l.TitleEn).HasMaxLength(256);
            e.Property(l => l.TitleBn).HasMaxLength(256);
            e.Property(l => l.LawReference).HasMaxLength(128);
            e.Property(l => l.Phone).HasMaxLength(32);
            e.Property(l => l.Website).HasMaxLength(256);
            e.HasOne(l => l.District).WithMany().HasForeignKey(l => l.DistrictId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SafetyTip>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Category).HasMaxLength(48);
            e.Property(t => t.TitleEn).HasMaxLength(256);
            e.Property(t => t.TitleBn).HasMaxLength(256);
            e.HasIndex(t => t.IsActive);
        });

        // ─── Referrals / community ─────────────────────────────────
        modelBuilder.Entity<PoliceReferral>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.StationName).HasMaxLength(256);
            e.Property(r => r.Reference).HasMaxLength(64);
            e.HasIndex(r => r.IncidentId);
            e.HasOne(r => r.Incident).WithMany().HasForeignKey(r => r.IncidentId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.District).WithMany().HasForeignKey(r => r.DistrictId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ReportVote>(e =>
        {
            e.HasKey(v => v.Id);
            e.HasIndex(v => new { v.IncidentId, v.VoterUserId }).IsUnique();
        });
    }
}
