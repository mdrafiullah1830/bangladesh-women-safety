using System.Text.Encodings.Web;
using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Development SMS provider: auto-send is disabled, one-tap URIs are generated.
/// </summary>
public class DevSmsProvider : ISmsProvider
{
    private readonly ILogger<DevSmsProvider> _logger;

    public DevSmsProvider(ILogger<DevSmsProvider> logger) => _logger = logger;

    public bool CanSendAutomatically => false;

    public string? BuildOneTapUri(string phoneNumber, string body)
    {
        var encoded = UrlEncoder.Default.Encode(body);
        return $"sms:{phoneNumber}?body={encoded}";
    }

    public Task<SmsResult> SendAsync(string phoneNumber, string body, CancellationToken ct = default)
    {
        _logger.LogInformation("[SMS-DEV] To={Phone}: {Body}", phoneNumber, body);
        return Task.FromResult(new SmsResult(false, null, "Dev provider: SMS not actually sent."));
    }
}
