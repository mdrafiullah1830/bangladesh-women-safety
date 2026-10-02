using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Bangladesh safety directory: helplines, police/hospital/fire stations by district,
/// legal aid, counselling centres, safe refuge points, laws and safety tips.
/// Anonymous and rate-limited — nothing here reveals who asked.
/// </summary>
[ApiController]
[Route("api/directory")]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class DirectoryController : ControllerBase
{
    private readonly IAppDbContext _db;

    public DirectoryController(IAppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] DirectoryCategory? category,
        [FromQuery] Guid? districtId,
        [FromQuery] Guid? divisionId,
        [FromQuery] string? q,
        [FromQuery] string lang = "bn",
        [FromQuery] int take = 200,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 500);
        var query = _db.ServiceDirectoryEntries.AsNoTracking();

        if (category is not null) query = query.Where(e => e.Category == category);
        if (districtId is not null) query = query.Where(e => e.DistrictId == districtId);
        if (divisionId is not null) query = query.Where(e => e.DivisionId == divisionId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim();
            query = query.Where(e => e.NameEn.Contains(needle) || e.NameBn.Contains(needle));
        }

        var districts = await _db.Districts.AsNoTracking().ToDictionaryAsync(d => d.Id, ct);
        var rows = await query.OrderBy(e => e.Category).ThenBy(e => e.NameEn).Take(take).ToListAsync(ct);

        return Ok(rows.Select(e => new
        {
            id = e.Id,
            category = e.Category.ToString(),
            name = lang == "bn" ? e.NameBn : e.NameEn,
            nameEn = e.NameEn,
            nameBn = e.NameBn,
            address = lang == "bn" ? e.AddressBn : e.AddressEn,
            phoneNumber = e.PhoneNumber,
            dialUri = e.PhoneNumber is null ? null : $"tel:{e.PhoneNumber}",
            districtId = e.DistrictId,
            districtName = e.DistrictId != null && districts.TryGetValue(e.DistrictId.Value, out var d)
                ? (lang == "bn" ? d.NameBn : d.NameEn)
                : null,
            latitude = e.Latitude,
            longitude = e.Longitude,
            is24x7 = e.Is24x7,
            isVerified = e.IsVerified
        }));
    }

    [HttpGet("nearby")]
    public async Task<IActionResult> Nearby(
        [FromQuery] double lat,
        [FromQuery] double lng,
        [FromQuery] DirectoryCategory? category,
        [FromQuery] int limit = 10,
        [FromQuery] string lang = "bn",
        CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 50);
        var query = _db.ServiceDirectoryEntries.AsNoTracking()
            .Where(e => e.Latitude != null && e.Longitude != null);

        if (category is not null) query = query.Where(e => e.Category == category);

        var districts = await _db.Districts.AsNoTracking().ToDictionaryAsync(d => d.Id, ct);
        var all = await query.ToListAsync(ct);

        var ranked = all
            .Select(e =>
            {
                var distance = Haversine(lat, lng, e.Latitude!.Value, e.Longitude!.Value);
                return new { Entry = e, Distance = distance };
            })
            .OrderBy(x => x.Distance)
            .Take(limit)
            .ToList();

        return Ok(new
        {
            latitude = lat,
            longitude = lng,
            minimumAggregationThreshold = 5,
            results = ranked.Select(x => new
            {
                id = x.Entry.Id,
                category = x.Entry.Category.ToString(),
                name = lang == "bn" ? x.Entry.NameBn : x.Entry.NameEn,
                address = lang == "bn" ? x.Entry.AddressBn : x.Entry.AddressEn,
                phoneNumber = x.Entry.PhoneNumber,
                dialUri = x.Entry.PhoneNumber is null ? null : $"tel:{x.Entry.PhoneNumber}",
                latitude = x.Entry.Latitude,
                longitude = x.Entry.Longitude,
                distanceMeters = Math.Round(x.Distance),
                is24x7 = x.Entry.Is24x7,
                districtName = x.Entry.DistrictId != null && districts.TryGetValue(x.Entry.DistrictId.Value, out var d)
                    ? (lang == "bn" ? d.NameBn : d.NameEn)
                    : null,
                mapUri = $"https://www.openstreetmap.org/?mlat={x.Entry.Latitude}&mlon={x.Entry.Longitude}#map=16/{x.Entry.Latitude}/{x.Entry.Longitude}"
            })
        });
    }

    [HttpGet("numbers")]
    public async Task<IActionResult> Numbers([FromQuery] string lang = "bn", CancellationToken ct = default)
    {
        var rows = await _db.EmergencyNumberEntries.AsNoTracking().OrderBy(n => n.SortOrder).ToListAsync(ct);
        return Ok(rows.Select(n => new
        {
            id = n.Id,
            service = lang == "bn" ? n.ServiceBn : n.Service,
            serviceBn = n.ServiceBn,
            serviceEn = n.Service,
            number = n.Number,
            dialUri = n.DialUri,
            category = n.Category.ToString(),
            note = lang == "bn" ? n.NoteBn : n.NoteEn,
            is24x7 = n.Is24x7
        }));
    }

    [HttpGet("laws")]
    public async Task<IActionResult> Laws([FromQuery] string lang = "bn", CancellationToken ct = default)
    {
        var rows = await _db.LegalResources.AsNoTracking().OrderBy(l => l.SortOrder).ToListAsync(ct);
        return Ok(rows.Select(l => new
        {
            id = l.Id,
            category = l.Category.ToString(),
            title = lang == "bn" ? l.TitleBn : l.TitleEn,
            titleEn = l.TitleEn,
            titleBn = l.TitleBn,
            summary = lang == "bn" ? l.SummaryBn : l.SummaryEn,
            lawReference = l.LawReference,
            phone = l.Phone,
            dialUri = l.Phone is null ? null : $"tel:{l.Phone}",
            website = l.Website
        }));
    }

    [HttpGet("tips")]
    public async Task<IActionResult> Tips(
        [FromQuery] string? category,
        [FromQuery] bool nightOnly = false,
        [FromQuery] string lang = "bn",
        CancellationToken ct = default)
    {
        var query = _db.SafetyTips.AsNoTracking().Where(t => t.IsActive);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(t => t.Category == category);
        if (nightOnly) query = query.Where(t => t.NightOnly);

        var rows = await query.OrderBy(t => t.SortOrder).ToListAsync(ct);
        return Ok(new
        {
            nightOnly,
            categories = await _db.SafetyTips.AsNoTracking().Where(t => t.IsActive)
                .Select(t => t.Category).Distinct().OrderBy(c => c).ToListAsync(ct),
            tips = rows.Select(t => new
            {
                id = t.Id,
                category = t.Category,
                title = lang == "bn" ? t.TitleBn : t.TitleEn,
                body = lang == "bn" ? t.BodyBn : t.BodyEn,
                nightOnly = t.NightOnly
            })
        });
    }

    private static double Haversine(double lat1, double lng1, double lat2, double lng2)
    {
        const double r = 6371000d;
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return 2 * r * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double ToRad(double degrees) => degrees * Math.PI / 180;
}
