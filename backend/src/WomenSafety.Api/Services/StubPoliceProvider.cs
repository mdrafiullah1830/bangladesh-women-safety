using WomenSafety.Application.Abstractions;

namespace WomenSafety.Api.Services;

/// <summary>
/// Stub police provider. Official confirmation is not supported until a verified
/// integration with Bangladesh police systems is established (spec section 56).
/// </summary>
public class StubPoliceProvider : IPoliceProvider
{
    public bool SupportsOfficialConfirmation => false;
}
