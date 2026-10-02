using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Time-boxed live location sharing. The token is unguessable, view-limited and revocable,
/// and the public endpoint never reveals who created the link.
/// </summary>
[ApiController]
[Route("api/shares")]
public class ShareController : ControllerBase
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public ShareController(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    [HttpGet]
    [Authorize]
    [RequirePermission(Permission.ShareManageOwn)]
    public async Task<IActionResult> MyShares(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var rows = await _db.LocationShares.Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt).Take(50).ToListAsync(ct);
        return Ok(rows.Select(View));
    }

    [HttpPost]
    [Authorize]
    [RequirePermission(Permission.ShareManageOwn)]
    public async Task<IActionResult> Create([FromBody] ShareRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        if (request.Latitude is null || request.Longitude is null)
            throw new ValidationAppException("Latitude and longitude are required to start a share.");

        var now = _clock.UtcNow;
        var share = new LocationShare
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = TokenFactory.NewToken(16).ToLowerInvariant(),
            Note = request.Note,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            MaxViews = Math.Clamp(request.MaxViews, 1, 1000),
            ExpiresAt = now.AddMinutes(Math.Clamp(request.ValidityMinutes, 5, 1440)),
            CreatedAt = now
        };

        _db.LocationShares.Add(share);
        await _audit.LogAsync("share.create", "Audit", userId.ToString(), true, share.Token[..6] + "…");
        await _db.SaveChangesAsync(ct);

        var url = $"{Request.Scheme}://{Request.Host}/#/track/{share.Token}";
        return Ok(new
        {
            id = share.Id,
            token = share.Token,
            url,
            expiresAt = share.ExpiresAt,
            maxViews = share.MaxViews,
            smsUri = $"sms:?&body=" + Uri.EscapeDataString($"My live location (until {share.ExpiresAt:HH:mm} UTC): {url}")
        });
    }

    [HttpPut("{id:guid}/location")]
    [Authorize]
    [RequirePermission(Permission.ShareManageOwn)]
    public async Task<IActionResult> UpdateLocation(Guid id, [FromBody] ShareRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var share = await _db.LocationShares.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct)
                    ?? throw new NotFoundAppException("Share not found.");
        if (share.RevokedAt is not null || share.ExpiresAt < _clock.UtcNow)
            throw new ValidationAppException("This share has ended.");
        if (request.Latitude is not null) share.Latitude = request.Latitude;
        if (request.Longitude is not null) share.Longitude = request.Longitude;
        await _db.SaveChangesAsync(ct);
        return Ok(View(share));
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    [RequirePermission(Permission.ShareManageOwn)]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var share = await _db.LocationShares.FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId, ct)
                    ?? throw new NotFoundAppException("Share not found.");
        share.RevokedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Anonymous read endpoint used by whoever receives the link.</summary>
    [HttpGet("{token}")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> PublicView(string token, CancellationToken ct)
    {
        var share = await _db.LocationShares.FirstOrDefaultAsync(s => s.Token == token, ct);
        if (share is null) throw new NotFoundAppException("This link does not exist.");

        var now = _clock.UtcNow;
        if (share.RevokedAt is not null)
            return Ok(new { state = "REVOKED" });
        if (share.ExpiresAt < now)
            return Ok(new { state = "EXPIRED" });
        if (share.ViewCount >= share.MaxViews)
            return Ok(new { state = "LIMIT_REACHED" });

        share.ViewCount++;
        share.LastViewedAt = now;
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            state = "ACTIVE",
            note = share.Note,
            latitude = share.Latitude,
            longitude = share.Longitude,
            expiresAt = share.ExpiresAt,
            viewsRemaining = share.MaxViews - share.ViewCount,
            mapUri = $"https://www.openstreetmap.org/?mlat={share.Latitude}&mlon={share.Longitude}#map=16/{share.Latitude}/{share.Longitude}"
        });
    }

    private static object View(LocationShare s) => new
    {
        id = s.Id,
        token = s.Token,
        url = $"#/track/{s.Token}",
        note = s.Note,
        latitude = s.Latitude,
        longitude = s.Longitude,
        expiresAt = s.ExpiresAt,
        viewCount = s.ViewCount,
        maxViews = s.MaxViews,
        revoked = s.RevokedAt is not null,
        expired = s.ExpiresAt < DateTimeOffset.UtcNow,
        createdAt = s.CreatedAt
    };
}
