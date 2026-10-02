using Microsoft.EntityFrameworkCore;
using WomenSafety.Application.Abstractions;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Exceptions;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Entities;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Application.Services;

/// <summary>
/// Registration, password/OTP login, refresh-token rotation and profile management.
/// OTP codes are delivered through <see cref="ISmsProvider"/>; in development the code is
/// echoed in <see cref="AuthResult.DevOtp"/> so the UI can be exercised without a gateway.
/// </summary>
public class AuthService
{
    private readonly IAppDbContext _db;
    private readonly IClock _clock;
    private readonly ISmsProvider _sms;
    private readonly IAuditLogger _audit;

    public AuthService(IAppDbContext db, IClock clock, ISmsProvider sms, IAuditLogger audit)
    {
        _db = db;
        _clock = clock;
        _sms = sms;
        _audit = audit;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        var phone = NormalisePhone(request.PhoneNumber);

        if (email is null && phone is null)
            throw new ValidationAppException("Provide either a phone number or an email address.");

        if (string.IsNullOrWhiteSpace(request.DisplayName))
            throw new ValidationAppException("Display name is required.");

        if (string.IsNullOrEmpty(request.Password) || request.Password.Length < 6)
            throw new ValidationAppException("Password must be at least 6 characters.");

        if (email is not null && await _db.AppUsers.AnyAsync(u => u.Email == email, ct))
            throw new ValidationAppException("An account with this email already exists.");
        if (phone is not null && await _db.AppUsers.AnyAsync(u => u.PhoneNumber == phone, ct))
            throw new ValidationAppException("An account with this phone number already exists.");

        District? district = null;
        if (Guid.TryParse(request.DistrictId, out var districtId))
            district = await _db.Districts.FindAsync(new object[] { districtId }, ct);

        var now = _clock.UtcNow;
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            PhoneNumber = phone,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = UserRole.VICTIM,
            DistrictId = district?.Id,
            DivisionId = district?.DivisionId,
            PreferredLanguage = request.Language == "en" ? "en" : "bn",
            IsEmailVerified = false,
            IsPhoneVerified = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.AppUsers.Add(user);
        _db.UserConsents.Add(new UserConsent
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ConsentKey = "privacy_policy",
            Granted = true,
            Source = "registration",
            GrantedAt = now
        });

        var destination = phone ?? email ?? string.Empty;
        var otp = await IssueOtpAsync(user.Id, destination, OtpPurpose.REGISTER, ct);

        await _audit.LogAsync("auth.register", "Audit", user.Id.ToString(), true, $"user={user.Id} dest={Mask(destination)}");
        await _db.SaveChangesAsync(ct);

        return new AuthResult
        {
            Succeeded = true,
            User = ToProfile(user, district?.NameEn),
            DevOtp = otp
        };
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var identifier = (request.Identifier ?? string.Empty).Trim();
        var phone = NormalisePhone(identifier);
        var email = identifier.ToLowerInvariant();

        var user = await _db.AppUsers.FirstOrDefaultAsync(
            u => (u.PhoneNumber != null && u.PhoneNumber == phone) || (u.Email != null && u.Email == email), ct)
            ?? throw new AuthenticationAppException("No account matches those details.");

        if (!user.IsActive)
            throw new AuthenticationAppException("This account has been deactivated.");
        if (!PasswordHasher.Verify(request.Password, user.PasswordHash))
            throw new AuthenticationAppException("Incorrect password.");

        var needsVerification = !user.IsPhoneVerified && user.PhoneNumber is not null;
        if (needsVerification)
        {
            var destination = user.PhoneNumber!;
            var otp = await IssueOtpAsync(user.Id, destination, OtpPurpose.LOGIN, ct);
            await _db.SaveChangesAsync(ct);
            return new AuthResult { Succeeded = true, User = ToProfile(user), DevOtp = otp };
        }

        var tokens = await IssueTokensAsync(user, ct);
        return new AuthResult { Succeeded = true, User = ToProfile(user), Tokens = tokens };
    }

    public async Task<AuthResult> SendOtpAsync(OtpSendRequest request, CancellationToken ct = default)
    {
        var destination = NormalisePhone(request.Destination) ?? request.Destination.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(destination))
            throw new ValidationAppException("A phone number or email is required.");

        var user = await _db.AppUsers.FirstOrDefaultAsync(
            u => (u.PhoneNumber != null && u.PhoneNumber == destination) ||
                 (u.Email != null && u.Email == destination), ct);

        if (request.Purpose == OtpPurpose.LOGIN && user is null)
            throw new AuthenticationAppException("No account matches those details.");

        var otp = await IssueOtpAsync(user?.Id, destination, request.Purpose, ct);
        await _db.SaveChangesAsync(ct);
        return new AuthResult { Succeeded = true, User = user is null ? null : ToProfile(user), DevOtp = otp };
    }

    public async Task<AuthResult> VerifyOtpAsync(OtpVerifyRequest request, CancellationToken ct = default)
    {
        var destination = NormalisePhone(request.Destination) ?? request.Destination.Trim().ToLowerInvariant();
        var record = await _db.OtpCodes
            .Where(o => o.Destination == destination && o.Purpose == request.Purpose && o.ConsumedAt == null)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (record is null || record.ExpiresAt < _clock.UtcNow)
            throw new ValidationAppException("That code has expired. Request a new one.");
        if (record.Attempts >= record.MaxAttempts)
            throw new ValidationAppException("Too many attempts. Request a new code.");
        if (!string.Equals(record.Code, request.Code, StringComparison.Ordinal))
        {
            record.Attempts++;
            await _db.SaveChangesAsync(ct);
            throw new ValidationAppException("Incorrect code.");
        }

        record.ConsumedAt = _clock.UtcNow;
        var user = record.UserId is null
            ? await _db.AppUsers.FirstOrDefaultAsync(
                u => (u.PhoneNumber != null && u.PhoneNumber == destination) ||
                     (u.Email != null && u.Email == destination), ct)
            : await _db.AppUsers.FirstOrDefaultAsync(u => u.Id == record.UserId, ct);

        if (user is null)
            throw new AuthenticationAppException("No account matches those details.");

        if (request.Purpose is OtpPurpose.REGISTER or OtpPurpose.PHONE_VERIFY)
        {
            if (destination.StartsWith("01") || destination.StartsWith("+880"))
                user.IsPhoneVerified = true;
            else
                user.IsEmailVerified = true;
            user.UpdatedAt = _clock.UtcNow;
            await _db.SaveChangesAsync(ct);
            var tokens = await IssueTokensAsync(user, ct);
            await _audit.LogAsync("auth.otp.verified", "Audit", user.Id.ToString(), true, request.Purpose.ToString());
            return new AuthResult { Succeeded = true, User = ToProfile(user), Tokens = tokens };
        }

        var loginTokens = await IssueTokensAsync(user, ct);
        return new AuthResult { Succeeded = true, User = ToProfile(user), Tokens = loginTokens };
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await _db.RefreshTokens.Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Token == refreshToken, ct)
            ?? throw new AuthenticationAppException("Unknown refresh token.");

        if (stored.RevokedAt is not null || stored.ExpiresAt < _clock.UtcNow)
            throw new AuthenticationAppException("This session has expired.");

        stored.RevokedAt = _clock.UtcNow;
        var user = stored.User ?? throw new AuthenticationAppException("Account missing for this session.");
        var tokens = await IssueTokensAsync(user, ct);
        return new AuthResult { Succeeded = true, User = ToProfile(user), Tokens = tokens };
    }

    public async Task<UserProfileView> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.AppUsers.Include(u => u.District)
                       .FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundAppException("Account not found.");
        return ToProfile(user, user.District?.NameEn);
    }

    public async Task<UserProfileView> UpdateProfileAsync(Guid userId, ProfileUpdateRequest request, CancellationToken ct = default)
    {
        var user = await _db.AppUsers.Include(u => u.District)
                       .FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundAppException("Account not found.");

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
            user.DisplayName = request.DisplayName.Trim();
        if (request.PreferredLanguage is "bn" or "en")
            user.PreferredLanguage = request.PreferredLanguage;
        if (request.DefaultPrivacyMode is not null)
            user.DefaultPrivacyMode = request.DefaultPrivacyMode.Value;

        if (Guid.TryParse(request.DistrictId, out var districtId))
        {
            var district = await _db.Districts.FindAsync(new object[] { districtId }, ct);
            if (district is null) throw new ValidationAppException("Unknown district.");
            user.DistrictId = district.Id;
            user.DivisionId = district.DivisionId;
        }

        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            if (string.IsNullOrEmpty(request.CurrentPassword) || !PasswordHasher.Verify(request.CurrentPassword, user.PasswordHash))
                throw new ValidationAppException("Current password is incorrect.");
            user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
        }

        user.UpdatedAt = _clock.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await GetProfileAsync(userId, ct);
    }

    public async Task<IReadOnlyList<SessionView>> ListSessionsAsync(Guid userId, Guid? currentDeviceId, CancellationToken ct = default)
    {
        var devices = await _db.Devices.Where(d => d.UserId == userId).OrderByDescending(d => d.LastSeenAt).ToListAsync(ct);
        return devices.Select(d => new SessionView
        {
            Id = d.Id,
            DeviceId = d.InstallationId,
            Platform = d.Platform,
            LastSeenAt = d.LastSeenAt,
            CreatedAt = d.CreatedAt,
            IsCurrent = currentDeviceId is not null && d.Id == currentDeviceId
        }).ToList();
    }

    public async Task RevokeSessionAsync(Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var device = await _db.Devices.FirstOrDefaultAsync(d => d.Id == sessionId && d.UserId == userId, ct)
                     ?? throw new NotFoundAppException("Session not found.");
        var tokens = await _db.RefreshTokens.Where(r => r.UserId == userId && r.RevokedAt == null).ToListAsync(ct);
        foreach (var token in tokens) token.RevokedAt = _clock.UtcNow;
        device.LastSeenAt = _clock.UtcNow;
        await _audit.LogAsync("auth.session.revoke", "Audit", userId.ToString(), true, sessionId.ToString());
        await _db.SaveChangesAsync(ct);
    }

    public async Task<AuthTokens> IssueTokensAsync(AppUser user, CancellationToken ct = default)
    {
        var now = _clock.UtcNow;
        var refresh = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = TokenFactory.NewToken(32),
            ExpiresAt = now.AddDays(14),
            CreatedAt = now
        };
        _db.RefreshTokens.Add(refresh);

        user.LastLoginAt = now;
        user.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        return new AuthTokens
        {
            RefreshToken = refresh.Token,
            AccessToken = string.Empty,
            ExpiresAt = now.AddHours(12)
        };
    }

    public async Task<string> IssueOtpAsync(Guid? userId, string destination, OtpPurpose purpose, CancellationToken ct = default)
    {
        var code = TokenFactory.NewOtp(6);
        var now = _clock.UtcNow;

        _db.OtpCodes.Add(new OtpCode
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Destination = destination,
            Purpose = purpose,
            Code = code,
            ExpiresAt = now.AddMinutes(5),
            CreatedAt = now
        });

        await _sms.SendAsync(destination, $"Women Safety verification code: {code}", ct);
        await _audit.LogAsync("auth.otp.issued", "Audit", userId?.ToString() ?? "anonymous", true, $"{purpose} dest={Mask(destination)}");
        return code;
    }

    public static UserProfileView ToProfile(AppUser user, string? districtName = null) => new()
    {
        Id = user.Id,
        DisplayName = user.DisplayName,
        PhoneNumber = user.PhoneNumber,
        Email = user.Email,
        Role = user.Role,
        DistrictId = user.DistrictId,
        DistrictName = districtName,
        DivisionId = user.DivisionId,
        PreferredLanguage = user.PreferredLanguage,
        DefaultPrivacyMode = user.DefaultPrivacyMode,
        IsPhoneVerified = user.IsPhoneVerified,
        IsEmailVerified = user.IsEmailVerified,
        ReputationScore = user.ReputationScore,
        VerifiedReports = user.VerifiedReports,
        HelpfulVotes = user.HelpfulVotes,
        Strikes = user.Strikes,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    };

    private static string? NormalisePhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.Length == 10 && digits.StartsWith("01")) return digits;
        if (digits.Length == 13 && digits.StartsWith("8801")) return "0" + digits[3..];
        if (digits.Length == 11 && digits.StartsWith("01")) return digits;
        return value.Trim().ToLowerInvariant();
    }

    private static string Mask(string value)
    {
        if (value.Length <= 4) return "****";
        return value[..2] + new string('*', Math.Max(0, value.Length - 4)) + value[^2..];
    }
}
