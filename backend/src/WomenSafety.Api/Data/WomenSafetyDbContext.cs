using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Domain.Entities;

namespace WomenSafety.Api.Data;

/// <summary>
/// EF Core DbContext implementing <see cref="IAppDbContext"/>.
/// SQLite chosen for local development and the offline-first mobile workflow.
/// </summary>
public class WomenSafetyDbContext : DbContext, IAppDbContext
{
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── EmergencyIncident ──────────────────────────────────────
        modelBuilder.Entity<EmergencyIncident>(e =>
        {
            e.HasKey(i => i.Id);
            e.Property(i => i.AnonymousUserId).HasMaxLength(64);
            e.Property(i => i.IdempotencyKey).HasMaxLength(128);
            e.Property(i => i.IncidentReference).HasMaxLength(32);
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
    }
}
