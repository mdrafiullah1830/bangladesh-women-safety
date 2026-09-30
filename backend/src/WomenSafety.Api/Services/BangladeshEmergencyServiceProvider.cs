using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Bangladesh emergency service provider. Programmatic dispatch is not supported;
/// the platform generates a one-tap dial URI instead (spec section 10).
/// </summary>
public class BangladeshEmergencyServiceProvider : IEmergencyServiceProvider
{
    public string Name => "Bangladesh Emergency (999)";
    public bool SupportsProgrammaticDispatch => false;

    public string GetDialUri(string number) => $"tel:{number}";
}
