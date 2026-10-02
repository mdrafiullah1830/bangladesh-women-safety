using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WomenSafety.Application.Security;
using WomenSafety.Domain.Enums;

namespace WomenSafety.Api.Services;

/// <summary>
/// Issues short-lived JWT access tokens. Refresh tokens live in the database so they can be
/// revoked; access tokens stay stateless for the 12 hour window.
/// </summary>
public class TokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration) => _configuration = configuration;

    private string Key => _configuration["Jwt:Key"] ?? "DevSecretKey-ChangeMe-In-Production-At-Least-32Bytes!!";
    private string Issuer => _configuration["Jwt:Issuer"] ?? "WomenSafety";
    private string Audience => _configuration["Jwt:Audience"] ?? "WomenSafetyApp";

    public (string Token, DateTimeOffset ExpiresAt) CreateAccessToken(Guid userId, UserRole role, string displayName, string language = "bn")
    {
        var expires = DateTimeOffset.UtcNow.AddHours(12);
        var anonymousId = TokenFactory.Sha256Of(userId.ToString("N"))[..32];

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, displayName),
            new(ClaimTypes.Role, role.ToString()),
            new("anon", anonymousId),
            new("lang", language),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: Issuer,
            audience: Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expires.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public static string AnonymousIdFor(Guid userId)
        => TokenFactory.Sha256Of(userId.ToString("N"))[..32];
}
