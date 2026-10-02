using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Api.Authorization;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;

namespace WomenSafety.Api.Controllers;

/// <summary>In-app notification centre (paired with the browser Notification API on the client).</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IAppDbContext _db;

    public NotificationsController(IAppDbContext db) => _db = db;

    [HttpGet]
    [RequirePermission(Permission.NotificationManageOwn)]
    public async Task<IActionResult> List([FromQuery] bool unreadOnly = false, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        take = Math.Clamp(take, 1, 200);
        var query = _db.UserNotifications.Where(n => n.UserId == userId);
        if (unreadOnly) query = query.Where(n => !n.IsRead);

        var rows = await query.OrderByDescending(n => n.CreatedAt).Take(take).ToListAsync(ct);
        var unread = await _db.UserNotifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

        return Ok(new
        {
            unreadCount = unread,
            items = rows.Select(n => new
            {
                id = n.Id,
                type = n.Type,
                titleEn = n.TitleEn,
                titleBn = n.TitleBn,
                bodyEn = n.BodyEn,
                bodyBn = n.BodyBn,
                linkHref = n.LinkHref,
                isRead = n.IsRead,
                incidentId = n.IncidentId,
                createdAt = n.CreatedAt
            })
        });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(new { count = await _db.UserNotifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct) });
    }

    [HttpPost("{id:guid}/read")]
    [RequirePermission(Permission.NotificationManageOwn)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var item = await _db.UserNotifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, ct)
                   ?? throw new NotFoundAppException("Notification not found.");
        item.IsRead = true;
        item.ReadAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { id, isRead = true });
    }

    [HttpPost("read-all")]
    [RequirePermission(Permission.NotificationManageOwn)]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var items = await _db.UserNotifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        foreach (var item in items)
        {
            item.IsRead = true;
            item.ReadAt = now;
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = items.Count });
    }
}
