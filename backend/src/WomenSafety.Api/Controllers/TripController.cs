using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Journey safety: start a trip, keep automatic check-ins alive, and escalate to the
/// trusted contact when the expected arrival passes without a check-in.
/// </summary>
[ApiController]
[Route("api/trips")]
[Authorize]
public class TripController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public TripController(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    [HttpGet]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> List([FromQuery] bool activeOnly = false, CancellationToken ct = default)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var query = _db.Trips.Where(t => t.UserId == userId);
        if (activeOnly) query = query.Where(t => t.Status == TripStatus.ACTIVE);

        var trips = await query.OrderByDescending(t => t.CreatedAt).Take(100).ToListAsync(ct);
        await EscalateAsync(trips, ct);

        return Ok(trips.Select(View));
    }

    [HttpGet("{id:guid}")]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
                   ?? throw new NotFoundAppException("Trip not found.");
        await EscalateAsync(new List<Trip> { trip }, ct);

        var checkIns = await _db.TripCheckIns.Where(c => c.TripId == id).OrderByDescending(c => c.CreatedAt).ToListAsync(ct);
        return Ok(new
        {
            trip = View(trip),
            checkIns = checkIns.Select(c => new
            {
                id = c.Id,
                respondent = c.Respondent,
                note = c.Note,
                latitude = c.Latitude,
                longitude = c.Longitude,
                createdAt = c.CreatedAt
            })
        });
    }

    [HttpPost]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> Create([FromBody] TripRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.DestinationText))
            throw new ValidationAppException("Title and destination are required.");

        if (request.TrustedContactId is not null)
        {
            var owned = await _db.TrustedContacts.AnyAsync(c => c.Id == request.TrustedContactId && c.UserId == userId, ct);
            if (!owned) throw new ValidationAppException("That trusted contact does not belong to you.");
        }

        var now = _clock.UtcNow;
        var minutes = Math.Clamp(request.ExpectedMinutes ?? 45, 5, 600);
        var trip = new Trip
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title.Trim(),
            OriginText = request.OriginText,
            DestinationText = request.DestinationText.Trim(),
            DestinationLatitude = request.DestinationLatitude,
            DestinationLongitude = request.DestinationLongitude,
            Status = TripStatus.ACTIVE,
            StartedAt = now,
            ExpectedArrivalAt = now.AddMinutes(minutes),
            CheckInIntervalMinutes = Math.Clamp(request.CheckInIntervalMinutes, 5, 120),
            TransportMode = request.TransportMode,
            TrustedContactId = request.TrustedContactId,
            LastCheckInAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Trips.Add(trip);
        _db.TripCheckIns.Add(new TripCheckIn
        {
            Id = Guid.NewGuid(),
            TripId = trip.Id,
            Respondent = "SYSTEM",
            Note = "Trip started",
            CreatedAt = now
        });

        _db.UserNotifications.Add(new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = "TRIP",
            TitleEn = "Trip started",
            TitleBn = "যাত্রা শুরু হয়েছে",
            BodyEn = $"{trip.Title} → {trip.DestinationText}, arrive by {trip.ExpectedArrivalAt:HH:mm} UTC",
            BodyBn = $"{trip.Title} → {trip.DestinationText}, পৌঁছার সময় {trip.ExpectedArrivalAt:HH:mm} UTC",
            LinkHref = "#/trips",
            CreatedAt = now
        });

        await _audit.LogAsync("trip.create", "Audit", userId.ToString(), true, trip.Title);
        await _db.SaveChangesAsync(ct);
        return Ok(View(trip));
    }

    [HttpPost("{id:guid}/checkin")]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> CheckIn(Guid id, [FromBody] CheckInRequest? request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
                   ?? throw new NotFoundAppException("Trip not found.");
        if (trip.Status != TripStatus.ACTIVE)
            throw new ValidationAppException("This trip is no longer active.");

        var now = _clock.UtcNow;
        request ??= new CheckInRequest();
        trip.LastCheckInAt = now;
        trip.UpdatedAt = now;
        if (trip.Status == TripStatus.AUTO_ESCALATED) trip.Status = TripStatus.ACTIVE;

        _db.TripCheckIns.Add(new TripCheckIn
        {
            Id = Guid.NewGuid(),
            TripId = trip.Id,
            Respondent = request.Respondent,
            Note = request.Note,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CreatedAt = now
        });

        _db.UserNotifications.Add(new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = "TRIP",
            TitleEn = "Check-in received",
            TitleBn = "চেক-ইন পাওয়া গেছে",
            BodyEn = $"Next check-in due in {trip.CheckInIntervalMinutes} minutes.",
            BodyBn = $"পরবর্তী চেক-ইন {trip.CheckInIntervalMinutes} মিনিটের মধ্যে দিতে হবে।",
            LinkHref = "#/trips",
            CreatedAt = now
        });

        await _db.SaveChangesAsync(ct);
        return Ok(View(trip));
    }

    [HttpPost("{id:guid}/complete")]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
                   ?? throw new NotFoundAppException("Trip not found.");

        trip.Status = TripStatus.COMPLETED;
        trip.UpdatedAt = _clock.UtcNow;
        _db.TripCheckIns.Add(new TripCheckIn
        {
            Id = Guid.NewGuid(),
            TripId = trip.Id,
            Respondent = "USER",
            Note = "Arrived safely",
            CreatedAt = _clock.UtcNow
        });
        await _audit.LogAsync("trip.complete", "Audit", userId.ToString(), true, trip.Title);
        await _db.SaveChangesAsync(ct);
        return Ok(View(trip));
    }

    [HttpPost("{id:guid}/cancel")]
    [RequirePermission(Permission.TripManageOwn)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var trip = await _db.Trips.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
                   ?? throw new NotFoundAppException("Trip not found.");
        trip.Status = TripStatus.CANCELLED;
        trip.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(View(trip));
    }

    private async Task EscalateAsync(List<Trip> trips, CancellationToken ct)
    {
        var now = _clock.UtcNow;
        var stale = trips
            .Where(t => t.Status == TripStatus.ACTIVE && t.ExpectedArrivalAt < now
                        && (t.LastCheckInAt is null || t.LastCheckInAt < t.ExpectedArrivalAt))
            .ToList();

        if (stale.Count == 0) return;

        foreach (var trip in stale)
        {
            trip.Status = TripStatus.AUTO_ESCALATED;
            trip.AutoEscalatedAt = now;
            trip.UpdatedAt = now;

            _db.UserNotifications.Add(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = trip.UserId,
                Type = "TRIP_ESCALATION",
                TitleEn = "Missed check-in escalated",
                TitleBn = "চেক-ইন দেওয়া হয়নি — এসকেলেট করা হয়েছে",
                BodyEn = $"Trip '{trip.Title}' passed its arrival time without a check-in. Verify the person's safety now.",
                BodyBn = $"Trip '{trip.Title}' - check-in missing, arrival time passed. Verify safety now.",
                LinkHref = "#/trips",
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync(ct);
    }

    private static object View(Trip t) => new
    {
        id = t.Id,
        title = t.Title,
        originText = t.OriginText,
        destinationText = t.DestinationText,
        destinationLatitude = t.DestinationLatitude,
        destinationLongitude = t.DestinationLongitude,
        status = t.Status.ToString(),
        startedAt = t.StartedAt,
        expectedArrivalAt = t.ExpectedArrivalAt,
        lastCheckInAt = t.LastCheckInAt,
        autoEscalatedAt = t.AutoEscalatedAt,
        checkInIntervalMinutes = t.CheckInIntervalMinutes,
        transportMode = t.TransportMode,
        trustedContactId = t.TrustedContactId,
        createdAt = t.CreatedAt
    };
}
