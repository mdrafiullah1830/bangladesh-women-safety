using Microsoft.EntityFrameworkCore;
using WomenSafety.Domain.Entities;

namespace WomenSafety.Application.Abstractions;

/// <summary>
/// Application-level abstraction over the persistence context. Services depend on this
/// interface rather than on a concrete DbContext so that infrastructure details stay
/// behind the project boundary.
/// </summary>
public interface IAppDbContext
{
    DbSet<EmergencyIncident> Incidents { get; }
    DbSet<TrustedContact> TrustedContacts { get; }
    DbSet<EmergencyContactAttempt> EmergencyContactAttempts { get; }
    DbSet<IncidentStatusHistory> IncidentStatusHistory { get; }
    DbSet<IncidentLocation> IncidentLocations { get; }
    DbSet<Responder> Responders { get; }
    DbSet<ResponderAssignment> ResponderAssignments { get; }
    DbSet<OfflineSyncQueue> OfflineSyncQueue { get; }
    DbSet<Device> Devices { get; }
    DbSet<DataSource> DataSources { get; }
    DbSet<Division> Divisions { get; }
    DbSet<District> Districts { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
