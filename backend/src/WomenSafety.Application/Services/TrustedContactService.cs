using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Manages a user's trusted emergency contacts (spec section 14).
/// Phone numbers are stored in full because they are operationally required, but any listing
/// returned to a client is masked so shoulder-surfing does not expose the contact's number.
/// </summary>
public class TrustedContactService
{
    public const int MaxContactsPerUser = 10;

    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly IAuditLogger _audit;

    public TrustedContactService(IAppDbContext db, IClock clock, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _audit = audit;
    }

    public async Task<IReadOnlyList<TrustedContactView>> ListAsync(Guid userId, CancellationToken ct = default)
    {
        var contacts = await _db.TrustedContacts
            .Where(c => c.UserId == userId)
            .OrderBy(c => c.Priority).ThenBy(c => c.CreatedAt)
            .ToListAsync(ct);

        return contacts.Select(ToView).ToList();
    }

    public async Task<TrustedContactView> CreateAsync(Guid userId, TrustedContactRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ValidationAppException("Contact name is required.");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new ValidationAppException("Contact phone number is required.");

        var existingCount = await _db.TrustedContacts.CountAsync(c => c.UserId == userId, ct);
        if (existingCount >= MaxContactsPerUser)
            throw new ValidationAppException($"A maximum of {MaxContactsPerUser} trusted contacts is allowed.");

        var contact = new TrustedContact
        {
            UserId = userId,
            DisplayName = request.DisplayName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Relationship = request.Relationship,
            PreferredChannel = request.PreferredChannel,
            AllowPushNotification = request.AllowPushNotification,
            AllowSms = request.AllowSms,
            AllowPhoneCallShortcut = request.AllowPhoneCallShortcut,
            LocationPrecision = request.LocationPrecision,
            Priority = Math.Clamp(request.Priority, 1, MaxContactsPerUser),
            CreatedAt = _clock.UtcNow,
            UpdatedAt = _clock.UtcNow
        };

        _db.TrustedContacts.Add(contact);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync("contact.create", "TrustedContact", contact.Id.ToString(), true, null, ct: ct);
        return ToView(contact);
    }

    public async Task<TrustedContactView?> UpdateAsync(Guid userId, Guid contactId, TrustedContactRequest request, CancellationToken ct = default)
    {
        var contact = await _db.TrustedContacts
            .FirstOrDefaultAsync(c => c.Id == contactId && c.UserId == userId, ct);

        if (contact is null) return null;

        contact.DisplayName = request.DisplayName.Trim();
        contact.PhoneNumber = request.PhoneNumber.Trim();
        contact.Relationship = request.Relationship;
        contact.PreferredChannel = request.PreferredChannel;
        contact.AllowPushNotification = request.AllowPushNotification;
        contact.AllowSms = request.AllowSms;
        contact.AllowPhoneCallShortcut = request.AllowPhoneCallShortcut;
        contact.LocationPrecision = request.LocationPrecision;
        contact.Priority = Math.Clamp(request.Priority, 1, MaxContactsPerUser);
        contact.UpdatedAt = _clock.UtcNow;

        // Changing the number invalidates a previous verification.
        contact.IsVerified = false;
        contact.VerifiedAt = null;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("contact.update", "TrustedContact", contact.Id.ToString(), true, null, ct: ct);
        return ToView(contact);
    }

    public async Task<bool> DeleteAsync(Guid userId, Guid contactId, CancellationToken ct = default)
    {
        var contact = await _db.TrustedContacts
            .FirstOrDefaultAsync(c => c.Id == contactId && c.UserId == userId, ct);

        if (contact is null) return false;

        // Soft delete keeps historical contact-attempt records meaningful.
        contact.IsDeleted = true;
        contact.DeletedAt = _clock.UtcNow;
        contact.UpdatedAt = _clock.UtcNow;

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync("contact.delete", "TrustedContact", contact.Id.ToString(), true, null, ct: ct);
        return true;
    }

    public static TrustedContactView ToView(TrustedContact contact) => new()
    {
        Id = contact.Id,
        DisplayName = contact.DisplayName,
        PhoneNumberMasked = MaskPhone(contact.PhoneNumber),
        Relationship = contact.Relationship,
        PreferredChannel = contact.PreferredChannel,
        LocationPrecision = contact.LocationPrecision,
        Priority = contact.Priority,
        IsVerified = contact.IsVerified
    };

    /// <summary>Masks all but the first two and last two characters of a phone number.</summary>
    public static string MaskPhone(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber)) return string.Empty;
        if (phoneNumber.Length <= 4) return new string('*', phoneNumber.Length);

        var visiblePrefix = Math.Min(5, phoneNumber.Length - 4);
        var masked = new string('*', phoneNumber.Length - visiblePrefix - 2);
        return $"{phoneNumber[..visiblePrefix]}{masked}{phoneNumber[^2..]}";
    }
}
