using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WomenSafety.Api.Authorization;
using WomenSafety.Api.Services;
using WomenSafety.Application.Contracts;
using WomenSafety.Application.Services;

namespace WomenSafety.Api.Controllers;

/// <summary>
/// Registration, password and OTP login, token refresh, profile and session management.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly TokenService _tokens;

    public AuthController(AuthService auth, TokenService tokens)
    {
        _auth = auth;
        _tokens = tokens;
    }

    private AuthResult Stamp(AuthResult result)
    {
        if (result.Tokens is null) return result;
        var userId = result.User!.Id;
        var (access, expires) = _tokens.CreateAccessToken(userId, result.User.Role, result.User.DisplayName, result.User.PreferredLanguage);
        return result with { Tokens = result.Tokens with { AccessToken = access, ExpiresAt = expires } };
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        => Ok(Stamp(await _auth.RegisterAsync(request, ct)));

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
        => Ok(Stamp(await _auth.LoginAsync(request, ct)));

    [HttpPost("otp/send")]
    [AllowAnonymous]
    public async Task<IActionResult> SendOtp([FromBody] OtpSendRequest request, CancellationToken ct)
        => Ok(Stamp(await _auth.SendOtpAsync(request, ct)));

    [HttpPost("otp/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyOtp([FromBody] OtpVerifyRequest request, CancellationToken ct)
        => Ok(Stamp(await _auth.VerifyOtpAsync(request, ct)));

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
        => Ok(Stamp(await _auth.RefreshAsync(request.RefreshToken, ct)));

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(await _auth.GetProfileAsync(userId, ct));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdateRequest request, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        return Ok(await _auth.UpdateProfileAsync(userId, request, ct));
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<IActionResult> Sessions(CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        var installationId = Request.Headers["X-Installation-Id"].FirstOrDefault();
        Guid? current = null;
        if (Guid.TryParse(installationId, out var parsed)) current = parsed;
        return Ok(await _auth.ListSessionsAsync(userId, current, ct));
    }

    [HttpDelete("sessions/{sessionId:guid}")]
    [Authorize]
    public async Task<IActionResult> RevokeSession(Guid sessionId, CancellationToken ct)
    {
        var (userId, _) = CallerIdentity.Resolve(User);
        await _auth.RevokeSessionAsync(userId, sessionId, ct);
        return NoContent();
    }

    [HttpGet("claims")]
    [Authorize]
    public IActionResult Claims() => Ok(new
    {
        userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
        role = User.FindFirstValue(ClaimTypes.Role),
        anonymous = User.FindFirstValue("anon"),
        language = User.FindFirstValue("lang")
    });
}
